"""
SEO Promoter & Viral Syndication Engine for BharatBazaro.com.
- Multi-Engine IndexNow Submitter (api.indexnow.org, bing.com, yandex.com)
- LLMs.txt AI Search Crawler Knowledge Base generator (/llms.txt)
- AI Robots.txt optimizer
- Daily Viral Social Media Promo Pack Generator (WhatsApp, Telegram, X/Twitter, Reddit)
"""

import json
import logging
import os
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

INDEXNOW_KEY = "e4f6208bb56b46bda5a782a20f92dcb1"
HOST = "bharatbazaro.com"

INDEXNOW_ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
    "https://yandex.com/indexnow",
]


def ensure_indexnow_key_file(root_dir: Path) -> str:
    """Ensure the IndexNow key file exists at the root of the site."""
    key_file = root_dir / "bharatbazaro-indexnow-key.txt"
    if not key_file.exists():
        key_file.write_text(INDEXNOW_KEY, encoding="utf-8")
        logger.info(f"Created IndexNow verification key file at {key_file}")
    return key_file.read_text(encoding="utf-8").strip()


def extract_sitemap_urls(root_dir: Path) -> List[str]:
    """Read all live URLs directly from sitemap.xml."""
    sitemap_p = root_dir / "sitemap.xml"
    if not sitemap_p.exists():
        return [
            f"https://{HOST}/",
            f"https://{HOST}/deals.html",
            f"https://{HOST}/mobiles.html",
            f"https://{HOST}/electronics.html",
            f"https://{HOST}/under-99.html",
            f"https://{HOST}/under-299.html",
            f"https://{HOST}/under-499.html",
            f"https://{HOST}/coupons.html",
        ]
    xml = sitemap_p.read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    return urls


def submit_to_indexnow(urls: List[str], key: str, timeout: float = 6.0) -> Dict[str, Any]:
    """
    Submit URLs to IndexNow endpoints (IndexNow.org, Bing, Yandex).
    Fails gracefully if network/offline.
    """
    if not urls:
        return {"status": "skipped", "reason": "empty_url_list"}

    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"https://{HOST}/bharatbazaro-indexnow-key.txt",
        "urlList": urls[:100],  # IndexNow max per batch is 10,000
    }
    data = json.dumps(payload).encode("utf-8")

    results = {}
    for ep in INDEXNOW_ENDPOINTS:
        try:
            req = urllib.request.Request(
                ep,
                data=data,
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                code = resp.getcode()
                results[ep] = {"status": "success", "code": code}
                logger.info(f"IndexNow submitted {len(urls)} URLs to {ep} (HTTP {code})")
        except urllib.error.HTTPError as e:
            results[ep] = {"status": "http_error", "code": e.code}
            logger.warning(f"IndexNow HTTP error on {ep}: {e.code}")
        except Exception as e:
            results[ep] = {"status": "error", "error": str(e)}
            logger.debug(f"IndexNow request skipped or network timeout on {ep}: {e}")

    return results


def update_robots_txt(root_dir: Path):
    """Ensure robots.txt explicitly welcomes Googlebot and AI Search crawlers."""
    robots_path = root_dir / "robots.txt"
    content = f"""# BharatBazaro.com 24/7 AI Deal Radar Robots.txt
# Welcome Googlebot, AI Search Engines, and Verified Crawlers

User-agent: *
Allow: /
Disallow: /api/
Disallow: /data/*.sqlite3*
Disallow: /data/*.db*

User-agent: Googlebot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Bingbot
Allow: /

Sitemap: https://{HOST}/sitemap.xml
"""
    robots_path.write_text(content, encoding="utf-8")
    logger.info(f"Updated {robots_path} with AI search crawler rules")


def generate_llms_txt(root_dir: Path, deals: List[Dict[str, Any]]) -> Path:
    """Generate llms.txt at root conforming to llmstxt.org standard."""
    llms_path = root_dir / "llms.txt"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    top_deals_md = []
    for d in deals[:10]:
        t = d.get("title") or "Amazon Deal"
        p = d.get("effective_price") or d.get("list_price") or 0
        mrp = d.get("mrp") or d.get("original_price")
        disc = d.get("effective_discount_pct") or d.get("discount_pct") or 0
        asin = d.get("asin")
        mrp_text = f" from ₹{mrp:,}" if mrp and isinstance(mrp, (int, float)) and mrp > p else ""
        top_deals_md.append(f"- [{t}](https://{HOST}/deal/{asin}.html): ₹{p:,} ({disc}% off{mrp_text})")

    content = f"""# BharatBazaro — 24/7 AI Deal Radar & Price Error Finder (India)

> BharatBazaro autonomously detects, verifies, and indexes live price drops, hidden checkbox coupons, and loot deals on Amazon India every 30 minutes.

## Core Capabilities
- Autonomous price error detection using Keepa 90-day price history graphs and BuyHatke data.
- Live on-page checkbox coupon discovery and Subscribe & Save stackable discounts.
- Programmatic SEO landing pages for high-intent budget brackets (₹99, ₹299, ₹499, ₹999).
- BazarAI conversational shopping concierge for instant deal recommendations and budget analysis.

## API & Machine-Readable Feeds
- Live Deals JSON: https://{HOST}/data/live_deals.json
- AI Market Briefing: https://{HOST}/data/ai_briefing.json
- RSS 2.0 Feed: https://{HOST}/feed.xml
- XML Sitemap: https://{HOST}/sitemap.xml

## High-Intent Deal Categories
- [All Live Deals](https://{HOST}/deals.html)
- [Mobiles & 5G Smartphones](https://{HOST}/mobiles.html)
- [Electronics & Laptops](https://{HOST}/electronics.html)
- [Home & Kitchen Appliances](https://{HOST}/home.html)
- [Fashion & Footwear](https://{HOST}/fashion.html)
- [Personal Care & Grocery](https://{HOST}/grocery.html)

## Curated Price Stores
- [Amazon ₹99 Store India](https://{HOST}/under-99.html)
- [Best Amazon Deals Under ₹299](https://{HOST}/under-299.html)
- [Top Deals Under ₹499](https://{HOST}/under-499.html)
- [Best Gadgets Under ₹999](https://{HOST}/under-999.html)
- [Hidden Checkbox Coupons Finder](https://{HOST}/coupons.html)

## Evergreen Buying Guides
- [Best Earbuds & Headphones Deals (2026 Guide)](https://{HOST}/guides/best-earbuds-headphones-deals-india.html)
- [Mobile & Smartphone Price Drops Today](https://{HOST}/guides/best-mobile-smartphone-price-drops-india.html)
- [Home & Kitchen Appliance Loot Deals](https://{HOST}/guides/best-home-kitchen-appliances-loot-deals.html)
- [Amazon Hidden Coupons & Price Error Tricks](https://{HOST}/guides/amazon-india-hidden-coupon-price-error-tricks.html)
- [Amazon Deals Under ₹99, ₹299 & ₹499 Strategy](https://{HOST}/guides/best-amazon-deals-under-99-299-499-india.html)

## Top Sample Verified Deals Today ({today})
{chr(10).join(top_deals_md)}
"""
    llms_path.write_text(content, encoding="utf-8")
    logger.info(f"Generated {llms_path}")
    return llms_path


def generate_promo_pack(root_dir: Path, deals: List[Dict[str, Any]]) -> Path:
    """Generate daily copy-paste viral social media promo pack for WhatsApp, X, and Reddit."""
    reports_dir = root_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    promo_path = reports_dir / "daily_promo_pack.md"
    today = datetime.now(timezone.utc).strftime("%d %b %Y")
    partner_tag = os.getenv("AMAZON_AFFILIATE_TAG") or os.getenv("AMAZON_PARTNER_TAG") or "dammaiprasad-21"

    top_loots = [d for d in deals if d.get("is_loot") or (d.get("effective_discount_pct") or 0) >= 60][:5]
    if len(top_loots) < 3:
        top_loots = deals[:5]

    # WhatsApp/Telegram Post
    tg_lines = [
        f"🚨 *TOP AMAZON INDIA LOOT DEALS ({today})* 🚨",
        "⚡ *Verified Price Drops & Hidden Coupons by BharatBazaro Radar*\n"
    ]
    for idx, d in enumerate(top_loots, 1):
        t = (d.get("title") or "Amazon Product")[:60]
        p = d.get("effective_price") or d.get("list_price") or 0
        mrp = d.get("mrp") or d.get("original_price")
        disc = d.get("effective_discount_pct") or d.get("discount_pct") or 0
        asin = d.get("asin")
        aff_url = f"https://www.amazon.in/dp/{asin}?tag={partner_tag}&linkCode=ll1"
        mrp_str = f" | MRP: ~₹{mrp:,}~" if mrp and isinstance(mrp, (int, float)) and mrp > p else ""
        tg_lines.append(f"{idx}️⃣ *{t}*")
        tg_lines.append(f"💰 Deal Price: *₹{p:,}* ({disc}% OFF{mrp_str})")
        if d.get("coupon_discount"):
            tg_lines.append(f"🎟️ Tick on-page coupon: *-₹{d.get('coupon_discount')}*")
        tg_lines.append(f"👉 Buy Link: {aff_url}\n")
    tg_lines.append("🔥 *More live loots refreshed every 30 mins:* https://bharatbazaro.com")

    # X / Twitter Post
    x_lines = [
        f"⚡ 5 CRAZY AMAZON INDIA PRICE DROPS TODAY ({today})\n",
        "We track 10,000+ items every 30 minutes with Keepa price history charts.\n",
        "Here are today's verified loot drops 👇 🧵\n"
    ]
    for idx, d in enumerate(top_loots[:3], 1):
        t = (d.get("title") or "Amazon Product")[:50]
        p = d.get("effective_price") or d.get("list_price") or 0
        disc = d.get("effective_discount_pct") or d.get("discount_pct") or 0
        asin = d.get("asin")
        aff_url = f"https://www.amazon.in/dp/{asin}?tag={partner_tag}&linkCode=ll1"
        x_lines.append(f"{idx}/ {t}")
        x_lines.append(f"📉 ₹{p:,} ({disc}% Off)")
        x_lines.append(f"🔗 {aff_url}\n")
    x_lines.append("Explore all verified drops: https://bharatbazaro.com")

    # Reddit Post
    reddit_lines = [
        f"### [Verified Deals] Top Amazon India Price Drops & Hidden Coupons for {today}\n",
        "Hey everyone, here is a curated list of verified price drops on Amazon India today, cross-checked against Keepa 90-day price history:\n",
        "| Product | Deal Price | MRP | Discount | Link |",
        "| :--- | :--- | :--- | :--- | :--- |"
    ]
    for d in top_loots:
        t = (d.get("title") or "Amazon Product")[:45]
        p = d.get("effective_price") or d.get("list_price") or 0
        mrp = d.get("mrp") or d.get("original_price") or p
        disc = d.get("effective_discount_pct") or d.get("discount_pct") or 0
        asin = d.get("asin")
        aff_url = f"https://www.amazon.in/dp/{asin}?tag={partner_tag}&linkCode=ll1"
        mrp_val = f"₹{mrp:,}" if isinstance(mrp, (int, float)) else str(mrp)
        reddit_lines.append(f"| {t} | ₹{p:,} | {mrp_val} | {disc}% Off | [View on Amazon]({aff_url}) |")
    reddit_lines.append(f"\n*Full live radar and price error finder:* [BharatBazaro.com](https://bharatbazaro.com)")

    content = f"""# Daily Viral Social Media Promo Pack — {today}

## 1. 📲 WhatsApp & Telegram Channel Broadcast
```text
{chr(10).join(tg_lines)}
```

---

## 2. 🐦 X (Twitter) Deals Thread
```text
{chr(10).join(x_lines)}
```

---

## 3. 🤖 Reddit / DesiDime Markdown Post (/r/dealsindia, /r/IndianShoppingDeals)
```markdown
{chr(10).join(reddit_lines)}
```
"""
    promo_path.write_text(content, encoding="utf-8")
    logger.info(f"Generated viral promo pack at {promo_path}")
    return promo_path


def run_seo_promotion(root_dir: Optional[Path] = None, deals: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Execute complete SEO acquisition & indexing suite."""
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent

    if deals is None:
        deals_file = root_dir / "data" / "live_deals.json"
        if deals_file.exists():
            with open(deals_file, "r", encoding="utf-8") as f:
                deals = json.load(f)
        else:
            deals = []

    key = ensure_indexnow_key_file(root_dir)
    update_robots_txt(root_dir)
    llms_path = generate_llms_txt(root_dir, deals)
    promo_path = generate_promo_pack(root_dir, deals)
    urls = extract_sitemap_urls(root_dir)
    indexnow_res = submit_to_indexnow(urls, key)

    return {
        "urls_indexed": len(urls),
        "indexnow": indexnow_res,
        "llms_txt": str(llms_path),
        "promo_pack": str(promo_path),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = run_seo_promotion()
    print("SEO Promotion Results:")
    print(json.dumps(res, indent=2))

