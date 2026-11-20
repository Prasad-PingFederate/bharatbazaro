"""
BharatBazaro Decision Models
Free structured decision layer for deal promotion.

Top free models (Nov 2026):
- baseten/elephant-1:free     (9B, fastest free, strong)
- baseten/mammoth-1:free      (27B, highest ranked open)
- perplexity/pplx-decider-v1.3:free  (newer, locate support)

Uses OpenRouter Decisions API (System One compatible).
No API key required for free models (rate limited).
Falls back to local heuristic if API fails.
"""

import os
import json
import time
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict

import requests

OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions"
OPENROUTER_SYSTEMONE_URL = "https://openrouter.ai/api/v1/systemone"  # alternative

# Free models ranked by practical usefulness for deals (checked Nov 20, 2026)
# Perplexity Decider v1.3 is the clear top free choice: extended free period,
# #4 overall by request volume on OpenRouter decision rankings, strong accuracy.
FREE_MODELS = [
    "perplexity/pplx-decider-v1.3:free",       # current top free (high usage, extended free until ~Dec)
    "perplexity/pplx-decider-flash-v1.3:free", # faster free sibling (~0.17s latency)
    "baseten/elephant-1:free",                 # solid 9B free option (still free on OR)
    # "baseten/mammoth-1" is now paid (~$0.10/M) — use only if you have credits
]


@dataclass
class DecisionResult:
    model: str
    verdict: str           # "frontpage" | "test" | "hold" | "kill"
    confidence: float
    promote: bool
    best_channel: str
    reasons: Dict[str, float]
    raw: Optional[Dict] = None
    source: str = "api"    # "api" or "heuristic"


class DealDecisionEngine:
    """
    Structured decision engine for BharatBazaro deals.
    Asks free decision models:
    - Should we promote this deal?
    - Best channel?
    - Quality score
    """

    def __init__(self, api_key: Optional[str] = None, preferred_model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY") or ""
        self.preferred_model = preferred_model or FREE_MODELS[0]
        self.session = requests.Session()
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"
        self.session.headers["Content-Type"] = "application/json"
        self.session.headers["HTTP-Referer"] = "https://bharatbazaro.com"
        self.session.headers["X-Title"] = "BharatBazaro Decision Engine"

    def _build_questions(self, deal: Dict) -> Dict:
        """Build typed questions for the decision model."""
        return {
            "promote": {
                "type": "noul",
                "instructions": "Should this deal be promoted on BharatBazaro right now? Consider discount depth, rating, stock, and whether it looks like a real loot.",
            },
            "quality": {
                "type": "score",
                "instructions": "Rate the overall quality of this deal for Indian shoppers.",
                "criteria": ["Poor", "Weak", "Average", "Good", "Excellent"],
            },
            "channel": {
                "type": "choice",
                "instructions": "Best primary channel to push this deal first.",
                "criteria": {
                    "whatsapp": "High-intent private groups, good for strong discounts",
                    "telegram": "Public channel, good for daily deals",
                    "x": "Twitter/X, good for viral or trending products",
                    "reddit": "Reddit India, good for discussion deals",
                    "hold": "Do not promote yet, needs more proof or stock",
                },
            },
            "risk": {
                "type": "noul",
                "instructions": "Is there high risk this deal is fake, out of stock soon, or poor quality?",
            },
        }

    def _heuristic(self, deal: Dict) -> DecisionResult:
        """Local fallback scoring (no API). Matches existing sales-desk logic style."""
        price = float(deal.get("price", 0))
        mrp = float(deal.get("mrp", price or 1))
        rating = float(deal.get("rating", 0))
        reviews = int(deal.get("reviews", 0))
        in_stock = bool(deal.get("inStock", True))
        spike = bool(deal.get("spike", False))
        coupon = float(deal.get("couponValue", 0))

        effective = max(price - coupon, 1)
        discount = max(0, (mrp - effective) / mrp) if mrp else 0

        score = 0.0
        score += min(discount / 0.45, 1) * 0.35
        score += (0.25 if rating >= 4.3 else 0.15 if rating >= 4.0 else 0.05)
        score += min(reviews / 5000, 1) * 0.15
        score += 0.15 if in_stock and not spike else 0
        score += 0.10 if coupon > 0 else 0

        promote = score >= 0.55 and in_stock and not spike
        if score >= 0.75 and discount >= 0.35:
            verdict = "frontpage"
        elif score >= 0.55:
            verdict = "test"
        elif score >= 0.35:
            verdict = "hold"
        else:
            verdict = "kill"

        channel = "whatsapp" if promote and discount >= 0.30 else "telegram" if promote else "hold"

        return DecisionResult(
            model="heuristic",
            verdict=verdict,
            confidence=round(min(score, 0.95), 2),
            promote=promote,
            best_channel=channel,
            reasons={"discount": round(discount, 2), "rating": rating, "score": round(score, 2)},
            source="heuristic",
        )

    def decide(self, deal: Dict, model: Optional[str] = None, timeout: int = 12) -> DecisionResult:
        """
        Get a structured decision for a deal.
        deal keys: title, brand, price, mrp, rating, reviews, inStock, spike, couponValue, category, etc.
        """
        model = model or self.preferred_model
        state = self._format_state(deal)
        questions = self._build_questions(deal)

        payload = {
            "model": model,
            "state": state,
            "questions": questions,
        }

        try:
            resp = self.session.post(
                OPENROUTER_DECISIONS_URL,
                json=payload,
                timeout=timeout,
            )
            if resp.status_code == 200:
                data = resp.json()
                answers = data.get("answers") or data.get("result", {}).get("answers") or {}
                return self._parse_answers(model, answers, data)
            else:
                # Try alternate endpoint or fall back
                pass
        except Exception:
            pass

        # Fallback
        return self._heuristic(deal)

    def _format_state(self, deal: Dict) -> str:
        parts = [
            f"Title: {deal.get('title', 'Unknown')}",
            f"Brand: {deal.get('brand', 'Unknown')}",
            f"Category: {deal.get('category', 'Unknown')}",
            f"Price: ₹{deal.get('price', 0)}",
            f"MRP: ₹{deal.get('mrp', 0)}",
        ]
        if deal.get("couponValue"):
            parts.append(f"Coupon: ₹{deal.get('couponValue')} off" + (f" code {deal.get('couponCode')}" if deal.get("couponCode") else ""))
        parts.append(f"Rating: {deal.get('rating', 0)} stars from {deal.get('reviews', 0)} reviews")
        parts.append(f"In stock: {deal.get('inStock', True)}")
        if deal.get("spike"):
            parts.append("Warning: price spike detected")
        if deal.get("historyLow"):
            parts.append(f"Logged low: ₹{deal.get('historyLow')}")
        return "\n".join(parts)

    def _parse_answers(self, model: str, answers: Dict, raw: Dict) -> DecisionResult:
        promote_prob = float(answers.get("promote", {}).get("noul", 0) or 0)
        risk_prob = float(answers.get("risk", {}).get("noul", 0) or 0)
        quality = answers.get("quality", {})
        channel_ans = answers.get("channel", {})

        quality_score = 0.5
        if isinstance(quality, dict):
            # score type usually returns a number 0-1 or index
            quality_score = float(quality.get("score", 0.5) or 0.5)

        best_channel = channel_ans.get("choice", "telegram") if isinstance(channel_ans, dict) else "telegram"
        conf = float(channel_ans.get("confidence", promote_prob) or promote_prob) if isinstance(channel_ans, dict) else promote_prob

        promote = promote_prob > 0.62 and risk_prob < 0.55

        if promote and quality_score >= 0.7 and promote_prob > 0.75:
            verdict = "frontpage"
        elif promote:
            verdict = "test"
        elif promote_prob > 0.4:
            verdict = "hold"
        else:
            verdict = "kill"

        return DecisionResult(
            model=model,
            verdict=verdict,
            confidence=round(max(promote_prob, conf), 2),
            promote=promote,
            best_channel=best_channel,
            reasons={
                "promote_prob": round(promote_prob, 2),
                "risk_prob": round(risk_prob, 2),
                "quality": round(quality_score, 2),
            },
            raw=raw,
            source="api",
        )

    def batch_decide(self, deals: List[Dict], model: Optional[str] = None) -> List[DecisionResult]:
        """Decide on multiple deals (sequential to respect free rate limits)."""
        results = []
        for d in deals:
            results.append(self.decide(d, model=model))
            time.sleep(0.3)  # gentle on free tier
        return results


# Convenience functions
def decide_deal(deal: Dict, model: str = "perplexity/pplx-decider-v1.3:free") -> DecisionResult:
    engine = DealDecisionEngine(preferred_model=model)
    return engine.decide(deal)


def promote_or_not(deal: Dict) -> bool:
    return decide_deal(deal).promote


if __name__ == "__main__":
    # Quick test
    sample = {
        "title": "boAt Airdopes 141 Bluetooth TWS Earbuds",
        "brand": "boAt",
        "category": "Audio",
        "price": 999,
        "mrp": 4490,
        "rating": 4.1,
        "reviews": 12000,
        "inStock": True,
        "spike": False,
        "couponValue": 200,
        "couponCode": "BOAT200",
    }
    eng = DealDecisionEngine()
    result = eng.decide(sample)
    print(json.dumps(asdict(result), indent=2))
