# ⚡ BharatBazaro.com — India's 24/7 AI Deal & Price Drop Radar

> Autonomous, real-time Amazon India deal intelligence engine & price drop radar inspired by BuyHatke, Keepa, PriceHistory, and GrabOn.

🌐 **Live Platform:** [https://bharatbazaro.com](https://bharatbazaro.com)  
📲 **Telegram Radar:** [https://t.me/dealdash_ai](https://t.me/dealdash_ai)

---

## 🌟 Key Features

1. **24/7 Autonomous Radar & Early-Morning Price Glitch Discovery:**
   - Runs every hour 24/7 (`37 * * * *`) via GitHub Actions.
   - Stage 2 live Amazon page verification (`enrich_amazon_deal`) confirms live pricing, stock, star ratings, and on-page coupons.
   - Autonomous OOS and Price-Spike Watcher (`sweep_expired_deals`) automatically detects expired deals and marks them.

2. **Instant ASIN & Amazon Link Analyzer:**
   - Paste *any* Amazon.in product link or 10-character ASIN into the search bar.
   - Instantly renders an interactive Keepa price history graph, PriceHistory link, and direct purchasing link with affiliate tracking (`tag=dammaiprasad-21`).

3. **BuyHatke-Style Buy Confidence Meter:**
   - Dynamic 0–99% confidence score calculated from composite discount, brand tier, star ratings, review volume, and historical tracking context.
   - Color-coded progress indicators (`🟢 Screaming Deal, Buy Now!`, `🟢 Strong Price Drop`, `🟡 Good Value`).

4. **GrabOn-Style Stackable Discount Waterfall:**
   - Visual breakdown: `MRP` ➔ `List Price` ➔ `On-Page Amazon Coupon` ➔ `Bank Card Offer` ➔ `Effective Price`.
   - 1-Click Copy Promo Code with instant clipboard toast.

5. **Deep Linking & Category Routing:**
   - Direct link to any deal: `https://bharatbazaro.com/?asin=B0BS1QCFHX`.
   - Category filtering: `?category=Audio%20%26%20Headphones`, `?category=Mobiles%20%26%20Accessories`, etc.
   - Backward-compatible redirects for legacy pages (`/deals.html`, `/electronics.html`, `/mobiles.html`, `/fashion.html`, `/grocery.html`).

---

## 🚀 Live Data Feeds

The frontend application is completely zero-build and powered by live JSON feeds updated every hour:

- [`data/live_deals.json`](https://bharatbazaro.com/data/live_deals.json): Top 120 verified live deals with complete metadata.
- [`data/stats.json`](https://bharatbazaro.com/data/stats.json): Real-time metrics (total live deals, loot alert count, max discount, total savings).

---

## 🛠️ Tech Stack

- **Frontend:** Pure HTML5, Modern CSS (Dark/Light glassmorphism), Vanilla ES6+ JavaScript (`app.js`).
- **Engine:** Python 3.12+, Requests, Beautiful Soup, SQLite with WAL mode.
- **Automation:** GitHub Actions 24/7 cron (`bharatbazaro_24x7.yml`).
- **Hosting:** GitHub Pages & Vercel with custom domain `bharatbazaro.com`.
