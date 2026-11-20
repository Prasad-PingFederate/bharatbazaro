import { compact, hours, inr, pct } from "@/lib/sales/format";
import type { Channel, Deal, Part, Scored, Verdict, WaterStep, Weights } from "@/lib/sales/types";

/**
 * Reverse-engineered push score.
 *
 * Clay: fill each field from the cheapest confident source, then act.
 * Slickdeals: a content score before any votes exist. Frontpage is earned.
 * Keepa: "lowest" is a claim about your own log, not the MRP.
 * DealDash: stock and spike can veto a pretty discount.
 * Instantly: do not spend a second channel on a test.
 */
export function effectiveOf(deal: Deal) {
  return Math.max(deal.price - deal.couponValue, 1);
}

export function scoreDeal(deal: Deal, weights: Weights): Scored {
  const effective = effectiveOf(deal);
  const discount = Math.max(0, (deal.mrp - effective) / deal.mrp);
  const newLow = effective <= deal.historyLow;
  const lowRatio = deal.historyLow > 0 ? effective / deal.historyLow : 1;

  const depthPts = Math.min(discount / 0.45, 1) * weights.depth;
  const lowPts = newLow
    ? weights.low
    : Math.max(0, 1.08 - lowRatio) * weights.low * 0.45;
  const ratingShare =
    deal.rating >= 4.3 ? 0.6 : deal.rating >= 4 ? 0.4 : deal.rating >= 3.7 ? 0.15 : 0;
  const trustPts =
    ratingShare * weights.trust + Math.min(deal.reviews / 8000, 1) * weights.trust * 0.4;
  const freshPts =
    deal.seenHoursAgo <= 1
      ? weights.fresh
      : deal.seenHoursAgo <= 4
        ? weights.fresh * 0.65
        : deal.seenHoursAgo <= 12
          ? weights.fresh * 0.3
          : 0;
  const stockPts = deal.inStock && !deal.spike ? weights.stock : 0;
  const couponPts = deal.couponValue > 0 ? weights.coupon : 0;
  const socialPts = Math.min(deal.mentions / 6, 1) * weights.social;

  const parts: Part[] = [
    {
      key: "depth",
      label: "Discount depth",
      points: Math.round(depthPts),
      max: weights.depth,
      note: `${pct(discount)} off the MRP, after coupon. Full marks at 45% off.`,
    },
    {
      key: "low",
      label: "Versus your log",
      points: Math.round(lowPts),
      max: weights.low,
      note: newLow
        ? `Effective ${inr(effective)} is at or under the logged low of ${inr(deal.historyLow)}.`
        : `Logged low is ${inr(deal.historyLow)}. This is not a new low. Do not say lowest ever.`,
    },
    {
      key: "trust",
      label: "Proof",
      points: Math.round(trustPts),
      max: weights.trust,
      note: `${deal.rating.toFixed(1)} stars across ${compact(deal.reviews)} ratings.`,
    },
    {
      key: "fresh",
      label: "Freshness",
      points: Math.round(freshPts),
      max: weights.fresh,
      note: `Last sighting ${hours(deal.seenHoursAgo)}.`,
    },
    {
      key: "stock",
      label: "Can still buy",
      points: Math.round(stockPts),
      max: weights.stock,
      note: !deal.inStock
        ? "Out of stock. A pretty price that cannot be bought is not a deal."
        : deal.spike
          ? "Price spiked versus the last sighting. DealDash would pull the post."
          : "In stock, and the price has not spiked.",
    },
    {
      key: "coupon",
      label: "Coupon still on",
      points: Math.round(couponPts),
      max: weights.coupon,
      note: deal.couponCode
        ? `${deal.couponCode} clips ${inr(deal.couponValue)}.`
        : "No coupon. The list price is the price.",
    },
    {
      key: "social",
      label: "Already moving",
      points: Math.round(socialPts),
      max: weights.social,
      note:
        deal.mentions === 0
          ? "No community mentions yet. That is fine. Do not invent heat."
          : `${deal.mentions} mentions this cycle. Full marks at 6.`,
    },
  ];

  const total = Math.min(
    100,
    parts.reduce((sum, part) => sum + part.points, 0),
  );
  const verdict = verdictOf(deal, total, discount);
  return {
    deal,
    effective,
    discount,
    newLow,
    parts,
    total,
    verdict,
    steps: waterfall(deal, effective, newLow),
    hook: hookFor(deal, effective, discount, newLow),
  };
}

const VERDICT_RANK = { frontpage: 0, test: 1, hold: 2, kill: 3 } as const;

export function scoreAll(deals: Deal[], weights: Weights) {
  return deals
    .map((deal) => scoreDeal(deal, weights))
    .sort(
      (a, b) =>
        VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || b.total - a.total,
    );
}

function verdictOf(deal: Deal, total: number, discount: number): Verdict {
  if (!deal.inStock || deal.spike) return "kill";
  if (total >= 82 && discount >= 0.25 && deal.rating >= 4) return "frontpage";
  if (total >= 62) return "test";
  return "hold";
}

function hookFor(deal: Deal, effective: number, discount: number, newLow: boolean) {
  if (!deal.inStock) return "The page can stay up. Do not push a product Amazon will not sell.";
  if (deal.spike) return "The price jumped. Kill outreach and correct any post already out.";
  if (newLow && discount >= 0.35) {
    return `${inr(effective)} is under every price in the log, and the cut is deep enough to lead with.`;
  }
  if (newLow) return `${inr(effective)} is under every price in the log. Say that, and nothing louder.`;
  if (discount >= 0.35) {
    return "The cut looks deep against MRP. The log has seen it close to this. Say the price, not lowest ever.";
  }
  return "Real enough to keep the page. Not worth a channel slot this hour.";
}

function waterfall(deal: Deal, effective: number, newLow: boolean): WaterStep[] {
  const freshPrice = deal.seenHoursAgo <= 2;
  return [
    {
      id: "price",
      field: "List price",
      source: freshPrice ? "DealDash memory" : "Live Amazon page",
      rule: freshPrice
        ? "Clay rule: stop at the first confident price. A sighting under 2 hours is enough. Do not pay for a second lookup."
        : "Memory is older than 2 hours. The waterfall falls through to the live page.",
      value: inr(deal.price),
      confident: true,
    },
    {
      id: "stock",
      field: "Stock and spike",
      source: "Live Amazon page",
      rule: "Never trust memory for stock. DealDash rechecks the page, then vetoes out-of-stock and spikes.",
      value: !deal.inStock ? "Out of stock" : deal.spike ? "In stock, price spiked" : "In stock, price calm",
      confident: true,
    },
    {
      id: "coupon",
      field: "Effective price",
      source: deal.couponValue > 0 ? "Coupon on the live page" : "No coupon found",
      rule: "Honey's trick, without the extension: subtract the coupon before you talk. The number in the post is the effective price.",
      value: deal.couponCode
        ? `${inr(effective)} after ${deal.couponCode}`
        : `${inr(effective)}, no coupon`,
      confident: true,
    },
    {
      id: "low",
      field: "Logged low",
      source: "Your sighting table",
      rule: "Keepa shape, your data. Lowest ever is a fact about rows you stored, not a slogan.",
      value: newLow
        ? `New low. Was ${inr(deal.historyLow)}.`
        : `Not a new low. Log says ${inr(deal.historyLow)}.`,
      confident: true,
    },
    {
      id: "proof",
      field: "Ratings",
      source: "Live page",
      rule: "Slickdeals editors check reviews before a frontpage. Thin or weak ratings stay off the blast.",
      value: `${deal.rating.toFixed(1)} · ${compact(deal.reviews)} ratings`,
      confident: deal.rating >= 4 && deal.reviews >= 500,
    },
    {
      id: "buzz",
      field: "Mentions",
      source: "Reddit and your own channel",
      rule: "Optional column. If it is empty, leave it empty. Heat you invent gets you banned.",
      value: deal.mentions === 0 ? "None this cycle" : `${deal.mentions} this cycle`,
      confident: deal.mentions >= 2,
    },
  ];
}

export type SequenceStep = {
  due: string;
  channel: Channel | null;
  title: string;
  detail: string;
};

export function sequenceFor(scored: Scored): SequenceStep[] {
  if (scored.verdict === "kill") {
    return [
      {
        due: "Now",
        channel: null,
        title: "Do not post",
        detail: scored.deal.spike
          ? "Price spike. If a message is already out, edit it. DealDash's watcher exists for this."
          : "Out of stock. Publishing this trains people to ignore the next one.",
      },
    ];
  }
  if (scored.verdict === "hold") {
    return [
      {
        due: "Now",
        channel: "seo",
        title: "Keep the page, skip the channels",
        detail:
          "Search can still earn this later. A channel slot spent here is a frontpage you did not post.",
      },
    ];
  }
  if (scored.verdict === "test") {
    return [
      {
        due: "T+0",
        channel: "telegram",
        title: "One post, your own channel",
        detail: "Test means one channel. Instantly would not add a second mailbox for an unproven line.",
      },
      {
        due: "T+45m",
        channel: null,
        title: "Stop, unless people reply",
        detail:
          "DealDash already waits 45 minutes between posts. Use that gap to see if anyone asks for the link.",
      },
    ];
  }
  return [
    {
      due: "T+0",
      channel: "telegram",
      title: "Telegram, number first",
      detail: "This cleared the frontpage gate. It gets the first slot of the hour.",
    },
    {
      due: "T+45m",
      channel: "whatsapp",
      title: "WhatsApp, only if still buyable",
      detail: "Recheck stock before this sends. Opt-in broadcast lists only. No unsaved numbers.",
    },
    {
      due: "T+6h",
      channel: "x",
      title: "X, if it is still the low",
      detail: "One post. If the price moved up, kill the step.",
    },
    {
      due: "T+24h",
      channel: "reddit",
      title: "Update, do not re-announce",
      detail:
        "Slickdeals found a held frontpage day did the selling, not a second headline. Reply on the same thread: still live, or it died.",
    },
  ];
}

export type Planned = { dealId: string; channel: Channel; due: string };

/** At most 6 deals in a cycle, matching DealDash. Frontpage earns later steps. */
export function planHour(scored: Scored[]): Planned[] {
  const picked = scored
    .filter((row) => row.verdict === "frontpage" || row.verdict === "test")
    .slice(0, 6);
  const plan: Planned[] = [];
  picked.forEach((row, index) => {
    const due = index === 0 ? "Now" : `+${index * 45}m`;
    plan.push({ dealId: row.deal.id, channel: "telegram", due });
    if (row.verdict === "frontpage") {
      plan.push({ dealId: row.deal.id, channel: "whatsapp", due: "45m after its Telegram" });
      plan.push({ dealId: row.deal.id, channel: "x", due: "6h after, if still the low" });
    }
  });
  return plan;
}

export function verdictLabel(verdict: Verdict) {
  if (verdict === "frontpage") return "Frontpage";
  if (verdict === "test") return "Test";
  if (verdict === "hold") return "Hold";
  return "Kill";
}
