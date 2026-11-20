# BharatBazaro Decision Models

**Sales-first** free structured decision layer. Only promote deals that have a realistic chance of converting to Amazon affiliate sales.

## Top free models (checked Nov 20, 2026)

| Model | ID | Notes |
|-------|-----|-------|
| **Perplexity Decider v1.3** | `perplexity/pplx-decider-v1.3:free` | **Current best free**. Extended free period. Strong accuracy, 262K context. |
| Perplexity Decider Flash v1.3 | `perplexity/pplx-decider-flash-v1.3:free` | Faster free sibling. Same API contract. |
| Elephant-1 | `baseten/elephant-1:free` | Solid 9B free option. |

These are **decision models** — they return calibrated probabilities for typed questions (yes/no, choice, score) instead of generating text. Free on OpenRouter via `POST /api/alpha/decisions`.

## Sales-focused heuristic (fallback)

The local heuristic is tuned for **high-intent channels**:
- Heavy weight on deep discounts (≥40%) and all-time lows
- Coupon / loot flags boost score
- Prefers **WhatsApp** for strong deals (highest historical conversion)
- Hard reject of weak or spiked prices
- Verdicts: `frontpage` (push hard) | `test` | `hold` | `kill`

## Usage (Python)

```bash
cd bharatbazaro
python -m decision_models.cli --title "boAt Airdopes 141" --price 899 --mrp 4490 --rating 4.2 --reviews 15000
```

Or in code:

```python
from decision_models import decide_deal

deal = {
    "title": "boAt Airdopes 141 Bluetooth TWS",
    "brand": "boAt",
    "price": 899,
    "mrp": 4490,
    "effective_discount_pct": 80,
    "rating": 4.2,
    "reviews": 15000,
    "inStock": True,
    "price_context": "all_time_low",
    "is_loot": True,
}
result = decide_deal(deal)
print(result.verdict, result.promote, result.best_channel)
```

## Usage (JS)

```js
const { decideDeal } = require("./decision_models/decision.js");
// or in browser: window.BBDecision.decideDeal(deal)

const result = await decideDeal({
  title: "boAt Airdopes 141",
  effective_price: 899,
  mrp: 4490,
  effective_discount_pct: 80,
  rating: 4.2,
  reviews: 15000,
  price_context: "all_time_low",
  is_loot: true,
});
console.log(result.verdict, result.best_channel);
```

## Environment

Optional: set `OPENROUTER_API_KEY` for higher rate limits. Free models work without a key (lower daily limits).

## What it decides

- **promote** — should we push this to drive a sale?
- **quality** — conversion potential score
- **channel** — whatsapp (preferred) / telegram / x / reddit / hold
- **risk** — chance of no sale

Returns clear verdict + confidence + best channel. Falls back to the sales-tuned heuristic if the API is unavailable.

**Main goal: more affiliate sales, not more clicks.**
