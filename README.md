# ⚡ BharatBazaro.com — India's 24/7 AI Deal, Price Drop & Coupon Radar

> Autonomous, real-time Amazon India deal intelligence engine, programmatic SEO publisher, and AI shopping concierge inspired by BuyHatke, Wirecutter, Keepa, Slickdeals, HotUKDeals, and GrabOn.

🌐 **Live Platform:** [https://bharatbazaro.com](https://bharatbazaro.com)  
📲 **Telegram Radar:** [https://t.me/Flash_Deals_Flipkart_Amazon](https://t.me/Flash_Deals_Flipkart_Amazon)  
📡 **RSS 2.0 Media Feed:** [https://bharatbazaro.com/feed.xml](https://bharatbazaro.com/feed.xml)  
🤖 **AI Crawler Directive:** [https://bharatbazaro.com/llms.txt](https://bharatbazaro.com/llms.txt)  
🗺️ **Google XML Sitemap:** [https://bharatbazaro.com/sitemap.xml](https://bharatbazaro.com/sitemap.xml)  

---

## 🌟 Architecture & Key Features

### 1. 24/7 Autonomous Radar & Early-Morning Price Glitch Discovery
- **Autonomous Hourly Pipeline (`dealbot/main.py`):** Runs every hour (`37 * * * *`) via GitHub Actions.
- **Stage 2 Live Amazon Verification (`enrich_amazon_deal`):** Fetches real-time pricing, stock availability, star ratings, and on-page coupons from Amazon India.
- **Cross-Repo Telegram Deal Sync (`dealbot/web_exporter.py`):** Automatically ingests live verified deals from `@Flash_Deals_Flipkart_Amazon` (`Prasad-PingFederate/DealDash_ai_Bot`).
- **Autonomous OOS & Price-Spike Watcher (`sweep_expired_deals`):** Automatically expires out-of-stock items or spikes.

### 2. 70+ Page Programmatic SEO Static Site Generator (`dealbot/ssg_engine.py`)
Pre-renders crawlable, schema-rich static HTML pages with zero JavaScript dependency:
- **Price Store Landing Pages:**
  - [`/under-99.html`](https://bharatbazaro.com/under-99.html): Amazon ₹99 Daily Essentials & Loot Store
  - [`/under-299.html`](https://bharatbazaro.com/under-299.html): Amazon Deals Under ₹299 Today
  - [`/under-499.html`](https://bharatbazaro.com/under-499.html): Top Amazon Deals Under ₹499 Today
  - [`/under-999.html`](https://bharatbazaro.com/under-999.html): Best Gadgets, Audio & Watches Under ₹999
  - [`/coupons.html`](https://bharatbazaro.com/coupons.html): Live Amazon On-Page Checkbox Coupons
- **6 Category Portals:**
  - [`/electronics.html`](https://bharatbazaro.com/electronics.html), [`/mobiles.html`](https://bharatbazaro.com/mobiles.html), [`/home.html`](https://bharatbazaro.com/home.html), [`/fashion.html`](https://bharatbazaro.com/fashion.html), [`/grocery.html`](https://bharatbazaro.com/grocery.html), [`/deals.html`](https://bharatbazaro.com/deals.html)
- **50+ Individual Product SEO Pages (`/deal/*.html`):**
  - Dedicated pages per ASIN with 90-day Keepa price history charts, BuyHatke confidence breakdown, and Google `Product` + `BreadcrumbList` Schema JSON-LD.
- **5 Comprehensive Buying Guides (`/guides/*.html`):**
  - Curated buyer guides with comparison matrix, Google `Article` + `FAQPage` schema, and live product widgets.

### 3. ⚡ BazarAI — Amazon Rufus / Support-Style Shopping Concierge (`bazaro_ai.js`)
- Floating launcher button (`⚡ Ask BazarAI • Discounts Finder`) with unread badge and onboarding callout.
- Intelligent deal answering: parses natural language queries (e.g. *"earbuds under ₹999"*, *"best loot deals today"*), ASINs, or pasted Amazon links.
- Instant filtered Amazon catalog unlocker with real-time stock & seller rating filters.
- Pre-loaded hourly AI market briefing from `data/ai_briefing.json`.

### 4. Global Affiliate Giants CRO Mechanics
Benchmarked against Wirecutter, Slickdeals, BuyHatke, HotUKDeals, GrabOn, and DesiDime:
- **Honey / GrabOn Rule:** Every card element (thumbnail image, title, price waterfall, and coupon checkbox pill) opens the verified Amazon affiliate link in a new tab.
- **Wirecutter-Style "⚡ Today's Top 3 Must-Buy Picks":** Dynamic hero spotlight strip highlighting the #1 Overall Screamer, #1 Budget Cookie-Dropper, and #1 Hidden Coupon deal.
- **BuyHatke-Style Price Range Slider Bar:** Visual gradient slider showing where current deal price sits between historical all-time low and MRP.
- **HotUKDeals / DesiDime Hotness Meter (`🔥 ${degrees}°`):** Deterministic temperature rating with 1-click community upvoting persisted to `localStorage`.
- **GrabOn Trust Line:** `✓ Verified Live on Amazon • 💡 Why Buy: ${hook}`.
- **OzBargain View Mode Toggle (`⊞ Grid` vs `☰ Compact`):** Allows power shoppers to scan deals in dense list mode.
- **MySmartPrice Top 5 Quick-Compare Table:** HTML `<table>` pre-rendered for Google Featured Snippets.
- **Slickdeals Keyword Alerts:** Custom keywords saved in `localStorage` with glowing badges (`🔔 MATCHES YOUR ALERT`).

### 5. Amazon Associates `ascsubtag` Revenue Attribution Tracking
All Amazon links (`tag=dammaiprasad-21`) append placement tags to track conversions in Amazon Associates Central:
- Main Deal Grid Cards: `&ascsubtag=bb-grid`
- Deal Card Image: `&ascsubtag=bb-card-img`
- Deal Card Title: `&ascsubtag=bb-card-title`
- Deal Card Price: `&ascsubtag=bb-card-price`
- Clickable Coupon Pill: `&ascsubtag=bb-coupon-pill`
- Top 3 Spotlight Hero: `&ascsubtag=bb-top3`
- Top 5 Compare Table: `&ascsubtag=bb-table`
- `⚡ BazarAI` Assistant: `&ascsubtag=bb-bazarai`
- Search Catalog Unlocker: `&ascsubtag=bb-search`
- Price Graph Modal: `&ascsubtag=bb-modal`
- Exit-Intent Spotlight: `&ascsubtag=bb-exit`
- SEO Landing Pages (`/deal/`, `/guides/`): `&ascsubtag=bb-seo`

### 6. Core Web Vitals & Lighthouse 95+ Speed
- **LCP Under 1.2s:** First 3 deal cards set `fetchpriority="high" decoding="async"` and strictly omit `loading="lazy"`.
- **CLS = 0:** Pre-sized images (`width="220" height="220"`) with inline SVG fallbacks.
- **Remaining Cards:** Efficient `loading="lazy" decoding="async"`.

### 7. Multi-Channel Syndication & Instant Indexing
- **RSS 2.0 Feed (`feed.xml`):** RFC-822 feed with Yahoo Media tags for Pinterest, Telegram, X, IFTTT, and Google Discover.
- **IndexNow Engine (`scripts/seo_promoter.py`):** Submits updated URLs hourly to Bing, Yandex, and Naver with key `bharatbazaro-indexnow-key.txt`.
- **AI Crawler Directive (`llms.txt`):** Structured markdown documentation for Perplexity, ChatGPT, and Claude bots.

---

## 🛠️ Tech Stack

- **Frontend:** Zero-build vanilla HTML5, modern CSS3 (Glassmorphism, Dark/Light modes), Vanilla ES6+ (`app.js`, `bazaro_ai.js`).
- **Backend / SSG:** Python 3.12+, Requests, Beautiful Soup 4, SQLite3 with WAL mode, Pillow.
- **Testing:** `pytest` (166+ automated tests covering scrapers, pricing logic, SEO engines, and feeds).
- **Deployment:** GitHub Pages / Vercel with automated 24/7 GitHub Actions workflow (`bharatbazaro_24x7.yml`).

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/Prasad-PingFederate/bharatbazaro.git
cd bharatbazaro

# Install Python dependencies
pip install -r requirements.txt

# Run full test suite
pytest -v

# Export live deals and pre-render all 70+ static SEO pages
python -c "from dealbot.web_exporter import export_web_data; export_web_data()"
```

---

## 📜 License & Affiliate Disclosure

© 2026 BharatBazaro.com. Autonomous Deal Intelligence by DealDash AI.  
*BharatBazaro.com is a participant in the Amazon Associates Programme, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.in.*
