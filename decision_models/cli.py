"""
Quick CLI for BharatBazaro decision models.
Usage:
  python -m decision_models.cli --title "boAt Airdopes" --price 999 --mrp 4490 --rating 4.1
"""

import argparse
import json
from .engine import DealDecisionEngine, FREE_MODELS


def main():
    p = argparse.ArgumentParser(description="Decide whether to promote a deal")
    p.add_argument("--title", required=True)
    p.add_argument("--brand", default="")
    p.add_argument("--price", type=float, required=True)
    p.add_argument("--mrp", type=float, required=True)
    p.add_argument("--rating", type=float, default=4.0)
    p.add_argument("--reviews", type=int, default=0)
    p.add_argument("--model", default=FREE_MODELS[0], choices=FREE_MODELS)
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    deal = {
        "title": args.title,
        "brand": args.brand,
        "price": args.price,
        "mrp": args.mrp,
        "rating": args.rating,
        "reviews": args.reviews,
        "inStock": True,
    }
    eng = DealDecisionEngine(preferred_model=args.model)
    res = eng.decide(deal)
    if args.json:
        print(json.dumps({
            "model": res.model,
            "verdict": res.verdict,
            "promote": res.promote,
            "confidence": res.confidence,
            "best_channel": res.best_channel,
            "source": res.source,
            "reasons": res.reasons,
        }, indent=2))
    else:
        print(f"Model: {res.model} ({res.source})")
        print(f"Verdict: {res.verdict.upper()}  promote={res.promote}  conf={res.confidence}")
        print(f"Best channel: {res.best_channel}")
        print(f"Reasons: {res.reasons}")


if __name__ == "__main__":
    main()
