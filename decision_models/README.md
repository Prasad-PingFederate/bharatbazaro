# BharatBazaro Decision Models

Free structured decision layer for deal promotion.

## Top free models (checked Nov 20, 2026)

| Model | ID | Notes |
|-------|-----|-------|
| **Perplexity Decider v1.3** | `perplexity/pplx-decider-v1.3:free` | **Current best free**. #4 overall by request volume on OpenRouter decision rankings. Extended free period (another 3 weeks from Nov 19). Strong accuracy, 262K context, locate support. |
| Perplexity Decider Flash v1.3 | `perplexity/pplx-decider-flash-v1.3:free` | Faster free sibling (~0.17s). Same API contract. |
| Elephant-1 | `baseten/elephant-1:free` | Solid 9B free option still available. |

These are **decision models** — they return calibrated probabilities for typed questions (yes/no, choice, score) instead of generating text. Fast and free on OpenRouter via the Decisions API (`POST /api/alpha/decisions`).

Mammoth-1 is no longer free (now ~$0.10/M input). Jev models are paid leaders.

## Usage (Python)

```bash
cd bharatbazaro
python -m decision_models.cli --title "boAt Airdopes 141" --price 999 --mrp 4490 --rating 4.1 --reviews 12000
```

Or in code:

```python
from decision_models import decide_deal

deal = {
    "title": "boAt Airdopes 141 Bluetooth TWS",
    "brand": "boAt",
    "price": 999,
    "mrp": 4490,
    "rating": 4.1,
    "reviews": 12000,
    "inStock": True,
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
  price: 999,
  mrp: 4490,
  rating: 4.1,
  reviews: 12000,
});
console.log(result.verdict, result.best_channel);
```

## Environment

Optional: set `OPENROUTER_API_KEY` for higher rate limits. Free models work without a key (with lower daily limits).

## What it decides

For each deal it asks:

- **promote** (yes/no probability) — should we push this now?
- **quality** (score) — Poor → Excellent
- **channel** (choice) — whatsapp / telegram / x / reddit / hold
- **risk** (yes/no) — fake / OOS / poor quality risk

Returns a clear verdict: `frontpage` | `test` | `hold` | `kill` plus confidence and best channel.

Falls back to a local heuristic (same style as the existing sales-desk scorer) if the API is unavailable.
