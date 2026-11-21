"""
BharatBazaro Decision Models — sales-first edition
Free structured decision layer optimized for affiliate conversions.

Top free models (Nov 20, 2026):
- perplexity/pplx-decider-v1.3:free     (extended free, high volume)
- perplexity/pplx-decider-flash-v1.3:free
- baseten/elephant-1:free

Heuristic is now tuned for high-intent channels (WhatsApp) and deep discounts.
"""

import os
import json
import time
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, asdict

import requests

OPENROUTER_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions"

FREE_MODELS = [
    "perplexity/pplx-decider-v1.3:free",
    "perplexity/pplx-decider-flash-v1.3:free",
    "baseten/elephant-1:free",
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
    source: str = "api"


class DealDecisionEngine:
    def __init__(self, api_key: Optional[str] = None, preferred_model: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY") or ""
        self.preferred_model = preferred_model or FREE_MODELS[0]
        self.session = requests.Session()
        if self.api_key:
            self.session.headers["Authorization"] = f"Bearer {self.api_key}"
        self.session.headers["Content-Type"] = "application/json"
        self.session.headers["HTTP-Referer"] = "https://bharatbazaro.com"
        self.session.headers["X-Title"] = "BharatBazaro Sales Decision Engine"

    def _build_questions(self, deal: Dict) -> Dict:
        return {
            "promote": {
                "type": "noul",
                "instructions": "Should this deal be promoted right now to drive Amazon affiliate sales? Prefer deep discounts, all-time lows, active coupons, and high ratings. Reject weak or risky deals.",
            },
            "quality": {
                "type": "score",
                "instructions": "Rate conversion potential for Indian shoppers (WhatsApp/Telegram high-intent).",
                "criteria": ["Poor", "Weak", "Average", "Good", "Excellent"],
            },
            "channel": {
                "type": "choice",
                "instructions": "Best primary channel for maximum sales.",
                "criteria": {
                    "whatsapp": "Highest conversion — private high-intent groups",
                    "telegram": "Good for daily volume",
                    "x": "For viral or trending items",
                    "reddit": "For discussion-driven deals",
                    "hold": "Do not promote",
                },
            },
            "risk": {
                "type": "noul",
                "instructions": "High risk of no sale (fake discount, out of stock, poor quality, or low intent)?",
            },
        }

    def _heuristic(self, deal: Dict) -> DecisionResult:
        price = float(deal.get("price") or deal.get("effective_price") or 0)
        mrp = float(deal.get("mrp") or price or 1)
        rating = float(deal.get("rating") or 0)
        reviews = int(deal.get("reviews") or deal.get("review_count") or 0)
        in_stock = bool(deal.get("inStock", True))
        spike = bool(deal.get("spike", deal.get("price_spiked", False)))
        coupon = float(deal.get("couponValue") or 0) or (1 if deal.get("coupon_text") or deal.get("promo_code") else 0)
        disc_pct = float(deal.get("effective_discount_pct") or deal.get("discount_pct") or 0)
        context = str(deal.get("price_context") or "")
        is_loot = bool(deal.get("is_loot"))
        category = str(deal.get("category") or "").lower()

        effective = max(price - (coupon if coupon > 10 else 0), 1)
        discount = max(0, (mrp - effective) / mrp) if mrp else disc_pct / 100

        score = 0.0
        score += min(discount / 0.40, 1.2) * 0.42          # heavy on deep discount
        score += 0.28 if context == "all_time_low" else 0.15 if context == "real_drop" else 0
        score += 0.12 if is_loot else 0
        score += 0.10 if coupon else 0
        score += 0.18 if rating >= 4.2 and reviews >= 500 else 0.08 if rating >= 4.0 else 0
        score += 0.12 if in_stock and not spike else -0.3

        # Impulse sweet spots for WhatsApp sales conversion
        if 0 < price <= 499:
            score += 0.12
        elif 0 < price <= 999:
            score += 0.08
        elif price > 25000 and context != "all_time_low":
            score -= 0.15

        # Penalty on 0% commission categories
        if "smartphone" in category or "mobile" in category:
            score -= 0.40

        promote = score >= 0.62 and in_stock and not spike and discount >= 0.28
        if score >= 0.82 and (discount >= 0.40 or context == "all_time_low"):
            verdict = "frontpage"
        elif score >= 0.62:
            verdict = "test"
        elif score >= 0.40:
            verdict = "hold"
        else:
            verdict = "kill"

        # Prefer WhatsApp for high-conversion deals
        if promote and (discount >= 0.35 or context == "all_time_low" or coupon or price <= 999):
            channel = "whatsapp"
        elif promote:
            channel = "telegram"
        else:
            channel = "hold"

        return DecisionResult(
            model="heuristic-sales",
            verdict=verdict,
            confidence=round(min(score, 0.96), 2),
            promote=promote,
            best_channel=channel,
            reasons={
                "discount": round(discount, 2),
                "rating": rating,
                "score": round(score, 2),
                "atl": 1 if context == "all_time_low" else 0,
            },
            source="heuristic",
        )

    def decide(self, deal: Dict, model: Optional[str] = None, timeout: int = 12) -> DecisionResult:
        model = model or self.preferred_model
        state = self._format_state(deal)
        questions = self._build_questions(deal)

        payload = {
            "model": model,
            "state": state,
            "questions": questions,
        }

        try:
            resp = self.session.post(OPENROUTER_DECISIONS_URL, json=payload, timeout=timeout)
            if resp.status_code == 200:
                data = resp.json()
                answers = data.get("answers") or data.get("result", {}).get("answers") or {}
                return self._parse_answers(model, answers, data)
        except Exception:
            pass

        return self._heuristic(deal)

    def _format_state(self, deal: Dict) -> str:
        parts = [
            f"Title: {deal.get('title', 'Unknown')}",
            f"Brand: {deal.get('brand', 'Unknown')}",
            f"Category: {deal.get('category', 'Unknown')}",
            f"Effective Price: ₹{deal.get('effective_price', deal.get('price', 0))}",
            f"MRP: ₹{deal.get('mrp', 0)}",
            f"Discount: {deal.get('effective_discount_pct', deal.get('discount_pct', 0))}%",
        ]
        if deal.get("coupon_text") or deal.get("promo_code"):
            parts.append(f"Coupon active: {deal.get('coupon_text') or deal.get('promo_code')}")
        if deal.get("price_context"):
            parts.append(f"Price context: {deal.get('price_context')}")
        if deal.get("is_loot"):
            parts.append("Flagged as loot")
        parts.append(f"Rating: {deal.get('rating', 0)} from {deal.get('reviews', 0)} reviews")
        parts.append(f"In stock: {deal.get('inStock', True)}")
        if deal.get("price_spiked") or deal.get("spike"):
            parts.append("Warning: price spike")
        return "\n".join(parts)

    def _parse_answers(self, model: str, answers: Dict, raw: Dict) -> DecisionResult:
        promote_prob = float(answers.get("promote", {}).get("noul", 0) or 0)
        risk_prob = float(answers.get("risk", {}).get("noul", 0) or 0)
        quality = answers.get("quality", {})
        channel_ans = answers.get("channel", {})

        quality_score = float(quality.get("score", 0.5) or 0.5) if isinstance(quality, dict) else 0.5
        best_channel = channel_ans.get("choice", "whatsapp") if isinstance(channel_ans, dict) else "whatsapp"
        conf = float(channel_ans.get("confidence", promote_prob) or promote_prob) if isinstance(channel_ans, dict) else promote_prob

        promote = promote_prob > 0.65 and risk_prob < 0.5

        if promote and quality_score >= 0.72 and promote_prob > 0.78:
            verdict = "frontpage"
        elif promote:
            verdict = "test"
        elif promote_prob > 0.45:
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
        results = []
        for d in deals:
            results.append(self.decide(d, model=model))
            time.sleep(0.4)
        return results


def heuristic(deal: Dict) -> DecisionResult:
    return DealDecisionEngine()._heuristic(deal)


def decide_deal(deal: Dict, model: str = "perplexity/pplx-decider-v1.3:free") -> DecisionResult:
    engine = DealDecisionEngine(preferred_model=model)
    return engine.decide(deal)


def promote_or_not(deal: Dict) -> bool:
    return decide_deal(deal).promote


if __name__ == "__main__":
    sample = {
        "title": "boAt Airdopes 141 Bluetooth TWS Earbuds",
        "brand": "boAt",
        "category": "Audio",
        "price": 899,
        "mrp": 4490,
        "effective_discount_pct": 80,
        "rating": 4.2,
        "reviews": 15000,
        "inStock": True,
        "price_context": "all_time_low",
        "is_loot": True,
        "coupon_text": "Extra ₹200 off",
    }
    eng = DealDecisionEngine()
    result = eng.decide(sample)
    print(json.dumps(asdict(result), indent=2))
