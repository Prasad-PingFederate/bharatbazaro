// BharatBazaro Decision Models — client / serverless (sales-optimized)
// Free OpenRouter decision models + strong local heuristic
// Goal: only promote deals that can actually convert to affiliate sales

const FREE_MODELS = [
  "perplexity/pplx-decider-v1.3:free",
  "perplexity/pplx-decider-flash-v1.3:free",
  "baseten/elephant-1:free",
];

const OPENROUTER_DECISIONS = "https://openrouter.ai/api/alpha/decisions";

function heuristic(deal) {
  const price = Number(deal.effective_price || deal.price) || 0;
  const mrp = Number(deal.mrp) || price || 1;
  const rating = Number(deal.rating) || 0;
  const reviews = Number(deal.reviews) || 0;
  const inStock = deal.inStock !== false && !deal.price_spiked;
  const disc = Number(deal.effective_discount_pct || deal.discount_pct) || 0;
  const hasCoupon = !!(deal.coupon_text || deal.promo_code || deal.couponValue);
  const isATL = deal.price_context === "all_time_low";
  const isLoot = !!deal.is_loot;

  const discount = Math.max(0, (mrp - price) / mrp) || disc / 100;

  let score = 0;
  score += Math.min(discount / 0.40, 1.2) * 0.42;
  score += isATL ? 0.28 : deal.price_context === "real_drop" ? 0.15 : 0;
  score += isLoot ? 0.12 : 0;
  score += hasCoupon ? 0.10 : 0;
  score += rating >= 4.2 && reviews >= 500 ? 0.18 : rating >= 4.0 ? 0.08 : 0;
  score += inStock ? 0.12 : -0.3;

  const promote = score >= 0.62 && inStock && discount >= 0.28;
  let verdict = "kill";
  if (score >= 0.82 && (discount >= 0.40 || isATL)) verdict = "frontpage";
  else if (score >= 0.62) verdict = "test";
  else if (score >= 0.40) verdict = "hold";

  let channel = "hold";
  if (promote && (discount >= 0.35 || isATL || hasCoupon)) channel = "whatsapp";
  else if (promote) channel = "telegram";

  return {
    model: "heuristic-sales",
    source: "heuristic",
    verdict,
    promote,
    confidence: Math.min(score, 0.96),
    best_channel: channel,
    reasons: {
      discount: +discount.toFixed(2),
      rating,
      score: +score.toFixed(2),
      atl: isATL ? 1 : 0,
    },
  };
}

function formatState(deal) {
  const lines = [
    `Title: ${deal.title || "Unknown"}`,
    `Brand: ${deal.brand || "Unknown"}`,
    `Effective Price: ₹${deal.effective_price || deal.price || 0}`,
    `MRP: ₹${deal.mrp || 0}`,
    `Discount: ${deal.effective_discount_pct || deal.discount_pct || 0}%`,
  ];
  if (deal.coupon_text || deal.promo_code) lines.push(`Coupon: ${deal.coupon_text || deal.promo_code}`);
  if (deal.price_context) lines.push(`Price context: ${deal.price_context}`);
  if (deal.is_loot) lines.push("Flagged as loot");
  lines.push(`Rating: ${deal.rating || 0} from ${deal.reviews || 0} reviews`);
  lines.push(`In stock: ${deal.inStock !== false}`);
  if (deal.price_spiked) lines.push("Warning: price spike");
  return lines.join("\n");
}

async function decideDeal(deal, options = {}) {
  const model = options.model || FREE_MODELS[0];
  const apiKey = options.apiKey || "";

  const questions = {
    promote: {
      type: "noul",
      instructions: "Should this deal be promoted right now to drive Amazon affiliate sales? Prefer deep discounts, all-time lows, coupons, and high ratings.",
    },
    quality: {
      type: "score",
      instructions: "Rate conversion potential for Indian shoppers.",
      criteria: ["Poor", "Weak", "Average", "Good", "Excellent"],
    },
    channel: {
      type: "choice",
      instructions: "Best primary channel for maximum sales.",
      criteria: {
        whatsapp: "Highest conversion — private high-intent groups",
        telegram: "Good for daily volume",
        x: "For viral items",
        reddit: "For discussion deals",
        hold: "Do not promote",
      },
    },
    risk: {
      type: "noul",
      instructions: "High risk of no sale?",
    },
  };

  try {
    const headers = {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bharatbazaro.com",
      "X-Title": "BharatBazaro Sales Decision Engine",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(OPENROUTER_DECISIONS, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, state: formatState(deal), questions }),
    });

    if (res.ok) {
      const data = await res.json();
      const answers = data.answers || (data.result && data.result.answers) || {};
      const promoteProb = Number(answers.promote?.noul || 0);
      const riskProb = Number(answers.risk?.noul || 0);
      const channel = answers.channel?.choice || "whatsapp";
      const conf = Number(answers.channel?.confidence || promoteProb);
      const quality = Number(answers.quality?.score || 0.5);

      const promote = promoteProb > 0.65 && riskProb < 0.5;
      let verdict = "kill";
      if (promote && quality >= 0.72 && promoteProb > 0.78) verdict = "frontpage";
      else if (promote) verdict = "test";
      else if (promoteProb > 0.45) verdict = "hold";

      return {
        model,
        source: "api",
        verdict,
        promote,
        confidence: Math.max(promoteProb, conf),
        best_channel: channel,
        reasons: {
          promote_prob: +promoteProb.toFixed(2),
          risk_prob: +riskProb.toFixed(2),
          quality: +quality.toFixed(2),
        },
        raw: data,
      };
    }
  } catch (e) {
    // fall through
  }

  return heuristic(deal);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { decideDeal, heuristic, FREE_MODELS };
}
if (typeof window !== "undefined") {
  window.BBDecision = { decideDeal, heuristic, FREE_MODELS };
}
