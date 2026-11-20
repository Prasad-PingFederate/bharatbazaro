"""
Example: score live deals with free decision models.
Run: python decision_models/score_live.py
"""

import json
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from decision_models import DealDecisionEngine

def load_deals(path="data/live_deals.json", limit=5):
    with open(path) as f:
        raw = json.load(f)
    deals = []
    for d in raw[:limit]:
        deals.append({
            "title": d.get("title", ""),
            "brand": d.get("brand", ""),
            "category": d.get("category", ""),
            "price": d.get("effective_price") or d.get("list_price") or d.get("mrp") or 0,
            "mrp": d.get("mrp") or d.get("list_price") or 0,
            "rating": d.get("rating") or 4.0,
            "reviews": d.get("reviews") or d.get("rating_count") or 0,
            "inStock": True,
            "couponValue": d.get("coupon_discount") or 0,
            "couponCode": d.get("promo_code"),
            "asin": d.get("asin"),
        })
    return deals


def main():
    deals = load_deals(limit=8)
    eng = DealDecisionEngine()
    print(f"Scoring {len(deals)} live deals...\n")
    for d in deals:
        res = eng.decide(d)
        print(f"{d['title'][:50]:50}  {res.verdict:10}  ch={res.best_channel:10}  conf={res.confidence:.2f}  ({res.source})")


if __name__ == "__main__":
    main()
