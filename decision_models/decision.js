// BharatBazaro Decision Models — client / serverless helper
// Uses free OpenRouter decision models (Elephant-1, Mammoth-1, Perplexity Decider)
// Falls back to local heuristic if no key or API fails.

const FREE_MODELS = [
  "baseten/elephant-1:free",
  "perplexity/pplx-decider-v1.3:free",
  "baseten/mammoth-1:free",
];

const OPENROUTER_DECISIONS = "https://openrouter.ai/api/alpha/decisions";

function heuristic(deal) {
  const price = Number(deal.price) || 0;
  const mrp = Number(deal.mrp) || price || 1;
  const rating = Number(deal.rating) || 0;
  const reviews = Number(deal.reviews) || 0;
  const inStock = deal.inStock !== false;
  const spike = !!deal.spike;
  const coupon = Number(deal.couponValue) || 0;

  const effective = Math.max(price - coupon, 1);
  const discount = Math.max(0, (mrp - effective) / mrp);

  let score = 0;
  score += Math.min(discount / 0.45, 1) * 0.35;
  score += rating >= 4.3 ? 0.25 : rating >= 4.0 ? 0.15 : 0.05;
  score += Math.min(reviews / 5000, 1) * 0.15;
  score += inStock && !spike ? 0.15 : 0;
  score += coupon > 0 ? 0.10 : 0;

  const promote = score >= 0.55 && inStock && !spike;
  let verdict = "kill";
  if (score >= 0.75 && discount >= 0.35) verdict = "frontpage";
  else if (score >= 0.55) verdict = "test";
  else if (score >= 0.35) verdict = "hold";

  return {
    model: "heuristic",
    source: "heuristic",
    verdict,
    promote,
    confidence: Math.min(score, 0.95),
    best_channel: promote && discount >= 0.3 ? "whatsapp" : promote ? "telegram" : "hold",
    reasons: { discount: +discount.toFixed(2), rating, score: +score.toFixed(2) },
  };
}

function formatState(deal) {
  const lines = [
    `Title: ${deal.title || "Unknown"}`,
    `Brand: ${deal.brand || "Unknown"}`,
    `Category: ${deal.category || "Unknown"}`,
    `Price: ₹${deal.price || 0}`,
    `MRP: ₹${deal.mrp || 0}`,
  ];
  if (deal.couponValue) {
    lines.push(`Coupon: ₹${deal.couponValue} off${deal.couponCode ? " code " + deal.couponCode : ""}`);
  }
  lines.push(`Rating: ${deal.rating || 0} stars from ${deal.reviews || 0} reviews`);
  lines.push(`In stock: ${deal.inStock !== false}`);
  if (deal.spike) lines.push("Warning: price spike detected");
  return lines.join("\n");
}

async function decideDeal(deal, options = {}) {
  const model = options.model || FREE_MODELS[0];
  const apiKey = options.apiKey || (typeof process !== "undefined" && process.env && process.env.OPENROUTER_API_KEY) || "";

  const questions = {
    promote: {
      type: "noul",
      instructions: "Should this deal be promoted on BharatBazaro right now? Consider discount depth, rating, stock, and whether it looks like a real loot.",
    },
    quality: {
      type: "score",
      instructions: "Rate the overall quality of this deal for Indian shoppers.",
      criteria: ["Poor", "Weak", "Average", "Good", "Excellent"],
    },
    channel: {
      type: "choice",
      instructions: "Best primary channel to push this deal first.",
      criteria: {
        whatsapp: "High-intent private groups, good for strong discounts",
        telegram: "Public channel, good for daily deals",
        x: "Twitter/X, good for viral or trending products",
        reddit: "Reddit India, good for discussion deals",
        hold: "Do not promote yet, needs more proof or stock",
      },
    },
    risk: {
      type: "noul",
      instructions: "Is there high risk this deal is fake, out of stock soon, or poor quality?",
    },
  };

  const payload = {
    model,
    state: formatState(deal),
    questions,
  };

  try {
    const headers = {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://bharatbazaro.com",
      "X-Title": "BharatBazaro Decision Engine",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(OPENROUTER_DECISIONS, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const answers = data.answers || (data.result && data.result.answers) || {};
      const promoteProb = Number(answers.promote?.noul || 0);
      const riskProb = Number(answers.risk?.noul || 0);
      const channel = answers.channel?.choice || "telegram";
      const conf = Number(answers.channel?.confidence || promoteProb);
      const quality = Number(answers.quality?.score || 0.5);

      const promote = promoteProb > 0.62 && riskProb < 0.55;
      let verdict = "kill";
      if (promote && quality >= 0.7 && promoteProb > 0.75) verdict = "frontpage";
      else if (promote) verdict = "test";
      else if (promoteProb > 0.4) verdict = "hold";

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

// Export for Node / browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { decideDeal, heuristic, FREE_MODELS };
}
if (typeof window !== "undefined") {
  window.BBDecision = { decideDeal, heuristic, FREE_MODELS };
}
