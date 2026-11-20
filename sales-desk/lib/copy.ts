import { SITE } from "@/lib/sales/catalog";
import { compact, hours, inr, pct } from "@/lib/sales/format";
import type { Channel, Scored } from "@/lib/sales/types";

export type Draft = {
  kicker: string;
  body: string;
  note: string;
};

export function pageUrl(id: string) {
  return `${SITE}/deals.html#${id}`;
}

export function draftFor(scored: Scored, channel: Channel): Draft {
  const { deal, effective, discount, newLow, hook } = scored;
  const name = `${deal.brand} ${deal.title}`;
  const off = pct(discount);
  const money = inr(effective);
  const was = inr(deal.mrp);
  const url = pageUrl(deal.id);
  const lowLine = newLow
    ? `Under every price in our log (previous low ${inr(deal.historyLow)}).`
    : `Not a new low. Our log has seen ${inr(deal.historyLow)}.`;
  const couponLine = deal.couponCode
    ? `Coupon ${deal.couponCode} is still on the page and is already in the ${money}.`
    : "No coupon. The price above is the price.";
  const checked = `Checked ${hours(deal.seenHoursAgo)}. ${
    deal.inStock && !deal.spike ? "It was in stock then." : "Do not push this."
  }`;

  if (channel === "telegram") {
    return {
      kicker: "Telegram",
      note: "Plain text. The first line is the only line most people read.",
      body: [
        `${money} for the ${name}.`,
        ``,
        `MRP ${was}. ${off} off, after coupon.`,
        lowLine,
        couponLine,
        `${deal.rating.toFixed(1)} stars, ${compact(deal.reviews)} ratings.`,
        checked,
        ``,
        hook,
        ``,
        `The page, not a raw Amazon link:`,
        url,
      ].join("\n"),
    };
  }

  if (channel === "whatsapp") {
    return {
      kicker: "WhatsApp",
      note: "Only people who asked to be on the broadcast. One screen, then stop.",
      body: [
        `${name}`,
        `${money}  (was ${was}, ${off} off)`,
        lowLine,
        checked,
        ``,
        url,
        ``,
        `Reply STOP to leave this list.`,
      ].join("\n"),
    };
  }

  if (channel === "x") {
    const post = [
      `${money} ${name} — ${off} off`,
      "bharatbazaro.com",
      "",
      "#AmazonIndia #LootDeal #OnlineShopping #AmazonDeals",
    ].join("\n");
    return {
      kicker: "X",
      note: `${post.length} characters. X shortens the link on its own. Four tags, not a pile.`,
      body: post,
    };
  }

  if (channel === "reddit") {
    return {
      kicker: "Reddit",
      note: "r/dealsforindia, or r/IndianGaming only if it is actually a gaming SKU. Title is the price.",
      body: [
        `Title: ${money} — ${name} (${off} off MRP ${was})`,
        ``,
        lowLine,
        couponLine,
        `${deal.rating.toFixed(1)} from ${compact(deal.reviews)} ratings. ${checked}`,
        ``,
        hook,
        ``,
        `Write-up and the current price: ${url}`,
        ``,
        `Affiliate note: BharatBazaro is in the Amazon Associates programme. The price is not marked up. If the deal dies I will say so on this post.`,
      ].join("\n"),
    };
  }

  if (channel === "instagram") {
    return {
      kicker: "Instagram",
      note: "Burn these three lines into the reel. Caption is the receipt. Link in bio goes to the site.",
      body: [
        `ON SCREEN`,
        money,
        name,
        newLow ? "Under our logged low" : off + " off",
        ``,
        `CAPTION`,
        `${money} for the ${name}. MRP ${was}.`,
        lowLine,
        couponLine,
        checked,
        ``,
        `Price and proof: link in bio, or ${url}`,
      ].join("\n"),
    };
  }

  if (channel === "email") {
    return {
      kicker: "Owned alerts",
      note: "This is not a cold email. It goes to people who set an alert on this category or budget.",
      body: [
        `Subject: ${deal.category} alert: ${name} at ${money}`,
        `Preheader: ${off} off. ${newLow ? "Under the logged low." : "Not a new low."} You asked for this band.`,
        ``,
        `You asked to hear about ${deal.category.toLowerCase()} drops.`,
        ``,
        `${name} is ${money}, from an MRP of ${was}.`,
        lowLine,
        couponLine,
        checked,
        ``,
        url,
        ``,
        `You can kill these alerts on the site. We do not mail people who never asked.`,
      ].join("\n"),
    };
  }

  return {
    kicker: "Search page",
    note: "Programmatic page you already know how to ship. The title is the question, not the brand slogan.",
    body: [
      `Title: Is ${money} low for the ${name}?`,
      `Meta: ${off} off an MRP of ${was}. ${lowLine} ${checked}`,
      ``,
      `H1: Is ${money} actually low for the ${name}?`,
      ``,
      `Open with the answer: ${hook}`,
      `Then the log, the coupon, the rating, and the hop.`,
      `Canonical lives on ${url.replace(/#.*/, "")} so the tier pages do not fight each other.`,
    ].join("\n"),
  };
}

export type Check = { ok: boolean; label: string };

export function critique(scored: Scored, channel: Channel, body: string): Check[] {
  const checks: Check[] = [
    {
      ok: body.includes("bharatbazaro.com"),
      label: "Sends people to BharatBazaro, not a raw Amazon URL",
    },
    {
      ok: !/lowest ever/i.test(body),
      label: "Does not say lowest ever. The log line does that job.",
    },
  ];
  if (channel !== "seo") {
    checks.push({
      ok: scored.deal.inStock && !scored.deal.spike,
      label: "In stock, and the price has not spiked",
    });
  }
  if (channel === "reddit") {
    checks.push({
      ok: /affiliate/i.test(body),
      label: "Affiliate is disclosed in the post",
    });
  }
  if (channel === "x") {
    checks.push({
      ok: body.length <= 240,
      label: "Short enough for one post",
    });
  }
  if (channel === "email") {
    checks.push({
      ok: /asked/i.test(body),
      label: "Framed as an alert they asked for",
    });
  }
  if (channel === "whatsapp") {
    checks.push({
      ok: /STOP/i.test(body),
      label: "Has a way to leave the list",
    });
  }
  return checks;
}
