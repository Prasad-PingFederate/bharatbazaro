import json
import sqlite3
from pathlib import Path
import pytest

from dealbot.models import Deal
from dealbot.publisher import StateStore
from dealbot.web_exporter import (
    detect_brand,
    extract_asin,
    map_ui_category,
    deal_to_web_json,
    export_web_feed,
)


def test_extract_asin_and_detect_brand():
    deal = Deal(
        id="amz-B0BS1QCFHX",
        retailer="Amazon",
        title="Sony WH-1000XM5 Wireless Headphones",
        url="https://www.amazon.in/dp/B0BS1QCFHX",
        current_price="₹24,990",
    )
    assert extract_asin(deal) == "B0BS1QCFHX"
    assert extract_asin("https://www.amazon.in/dp/B09V3HM4XY") == "B09V3HM4XY"
    assert detect_brand(deal.title) == "Sony"
    assert detect_brand("Apple iPad 10th Gen") == "Apple"


def test_map_ui_category():
    assert map_ui_category("electronics", "Samsung Galaxy S24 Ultra") == "Mobiles & Accessories"
    assert map_ui_category("electronics", "Apple MacBook Air M2 16GB") == "Laptops & Computing"
    assert map_ui_category("electronics", "Sony WH-CH520 Wireless Bluetooth Headphones") == "Audio & Headphones"
    assert map_ui_category("home", "Prestige Deluxe Alpha Pressure Cooker 3L") == "Home & Kitchen"
    assert map_ui_category("fashion", "Puma Men Nitro Running Shoes") == "Fashion & Footwear"
    assert map_ui_category("grocery", "Tata Tea Gold 1kg") == "Personal Care & Grocery"


def test_deal_to_web_json():
    deal = Deal(
        id="amz-B0BS1QCFHX",
        retailer="Amazon",
        title="Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        url="https://www.amazon.in/dp/B0BS1QCFHX",
        original_price="₹34,990",
        current_price="₹24,990",
        discount_percent=29,
        effective_price=22990,
        coupon_discount=2000,
        promo_code="SONY2K",
        bank_offer="10% Instant Discount on HDFC Credit Cards",
        rating=4.6,
        review_count=5200,
    )
    sightings = {"min_price": 22990, "avg_price": 27490, "max_price": 34990}
    w_json = deal_to_web_json(deal, score=92, price_sightings=sightings)

    assert w_json["id"] == "amazon:B0BS1QCFHX"
    assert w_json["asin"] == "B0BS1QCFHX"
    assert w_json["brand"] == "Sony"
    assert w_json["brand_tier"] == "tier1"
    assert w_json["effective_price"] == 22990
    assert w_json["mrp"] == 34990
    assert w_json["coupon_discount"] == 2000
    assert w_json["coupon_text"] == "Apply ₹2,000 on-page coupon"
    assert w_json["promo_code"] == "SONY2K"
    assert w_json["savings_inr"] == 12000
    assert w_json["rating"] == 4.6
    assert w_json["review_count"] == 5200
    assert w_json["score"] == 92
    assert w_json["historical_min"] == 22990
    assert w_json["historical_avg"] == 27490
    assert w_json["is_loot"] is True
    assert "https://www.amazon.in/dp/B0BS1QCFHX?tag=dammaiprasad-21&linkCode=ll1" in w_json["affiliate_url"]


def test_export_web_feed(tmp_path):
    db_file = tmp_path / "test_store.db"
    store = StateStore(db_file)

    # Insert 3 deals
    for i in range(1, 4):
        store.mark_posted(
            deal_id=f"amz-B00000000{i}",
            retailer="Amazon",
            chat_id="-1001",
            message_id=200 + i,
            caption=f"🔥 <b>LOOT</b> · Amazon\n<b>Sony Product {i} Audio Gadget</b>\nList Price: ₹1,499 (Apply ₹200 on-page coupon)\n<code>SAVE200</code>",
            price=1499,
            discount=40,
            agent_score=85,
            canonical_product_id=f"amazon:B00000000{i}",
        )

    out_dir = tmp_path / "web_data"
    res = export_web_feed(store, output_dir=out_dir)

    assert res["deals_count"] == 3
    assert (out_dir / "live_deals.json").exists()
    assert (out_dir / "stats.json").exists()

    with open(out_dir / "live_deals.json", "r", encoding="utf-8") as f:
        live_deals = json.load(f)
    assert len(live_deals) == 3
    assert live_deals[0]["asin"] in {"B000000001", "B000000002", "B000000003"}
    assert live_deals[0]["brand"] == "Sony"

    with open(out_dir / "stats.json", "r", encoding="utf-8") as f:
        stats = json.load(f)
    assert stats["total_live_deals"] == 3
    assert stats["max_discount_pct"] >= 40


def test_freshness_time_decay_and_pruning():
    deal = Deal(
        id="amz-B09TEST001",
        retailer="Amazon",
        title="Puma Running Shoes",
        url="https://amazon.in/dp/B09TEST001",
        current_price="₹1,999",
        original_price="₹4,999",
        discount_percent=60,
        effective_price=1999,
    )
    import time
    now_epoch = int(time.time())

    # Fresh deal (0h old): age_hours=0, decay=0, is_new=True
    w_fresh = deal_to_web_json(deal, score=80, posted_epoch=now_epoch)
    assert w_fresh["is_new"] is True
    assert w_fresh["age_hours"] == 0.0
    assert w_fresh["trending_score"] == 80.0

    # 10h old deal: age_hours=10, decay=(10-2)*2.5 = 20.0, trending_score = 60.0
    w_older = deal_to_web_json(deal, score=80, posted_epoch=now_epoch - 36000)
    assert w_older["is_new"] is False
    assert w_older["age_hours"] == 10.0
    assert w_older["trending_score"] == 60.0


def test_programmatic_seo_price_stores_and_rss_feed(tmp_path):
    from dealbot.ssg_engine import pre_render_all_pages, generate_rss_feed, update_sitemap_xml

    # Prepare mock base index.html
    base_html = """<!DOCTYPE html><html><head><title>BharatBazaro</title></head><body>
    <h1 class="hero-title">Title</h1>
    <p class="hero-subtitle">Sub</p>
    <div id="dealsGrid"></div><!-- Empty State -->
    <div class="footer-links"><a href="/mobiles.html" class="footer-link">Mobiles</a></div>
    <script src="app.js"></script>
    </body></html>"""
    (tmp_path / "index.html").write_text(base_html, encoding="utf-8")

    sample_deals = [
        {
            "asin": "B0TEST9901",
            "title": "USB-C Fast Charging Cable 1M",
            "effective_price": 89,
            "list_price": 199,
            "mrp": 399,
            "discount_pct": 77,
            "effective_discount_pct": 77,
            "savings_inr": 310,
            "brand": "Boat",
            "category": "Electronics & Audio",
            "coupon_discount": 20,
            "coupon_text": "Apply ₹20 coupon",
            "affiliate_url": "https://www.amazon.in/dp/B0TEST9901?tag=dammaiprasad-21&linkCode=ll1",
            "image_url": "https://m.media-amazon.com/images/P/B0TEST9901.jpg",
            "is_loot": True,
            "buy_confidence": 95,
            "updated_at": 1700000000,
        },
        {
            "asin": "B0TEST2991",
            "title": "Wireless Bluetooth Mouse",
            "effective_price": 249,
            "list_price": 499,
            "mrp": 999,
            "discount_pct": 75,
            "effective_discount_pct": 75,
            "savings_inr": 750,
            "brand": "Portronics",
            "category": "Electronics & Audio",
            "affiliate_url": "https://www.amazon.in/dp/B0TEST2991?tag=dammaiprasad-21&linkCode=ll1",
            "image_url": "https://m.media-amazon.com/images/P/B0TEST2991.jpg",
            "is_loot": False,
            "buy_confidence": 85,
            "updated_at": 1700000000,
        }
    ]
    stats = {"total_live_deals": 2, "loot_count": 1, "max_discount_pct": 77}

    pre_render_all_pages(sample_deals, stats, root_dir=tmp_path)

    # 1. Verify Price Store & Category pages exist
    for page in ["under-99.html", "under-299.html", "under-499.html", "under-999.html", "coupons.html", "deals.html"]:
        p_file = tmp_path / page
        assert p_file.exists(), f"{page} was not generated!"
        content = p_file.read_text(encoding="utf-8")
        assert "BharatBazaro" in content
        assert 'article class="deal-card' in content

    # 2. Verify Programmatic Deal pages exist
    deal_dir = tmp_path / "deal"
    assert deal_dir.exists()
    assert (deal_dir / "B0TEST9901.html").exists()
    assert (deal_dir / "B0TEST2991.html").exists()
    deal_content = (deal_dir / "B0TEST9901.html").read_text(encoding="utf-8")
    assert "https://graph.keepa.com/pricehistory.png?asin=B0TEST9901" in deal_content
    assert "tag=dammaiprasad-21" in deal_content
    assert '"@type": "Product"' in deal_content

    # 3. Verify RSS Feed exists & is valid
    feed_file = tmp_path / "feed.xml"
    assert feed_file.exists()
    feed_content = feed_file.read_text(encoding="utf-8")
    assert '<rss version="2.0"' in feed_content
    assert "https://bharatbazaro.com/deal/B0TEST9901.html" in feed_content

    # 4. Verify Sitemap has all URLs
    sitemap_file = tmp_path / "sitemap.xml"
    assert sitemap_file.exists()
    sitemap_content = sitemap_file.read_text(encoding="utf-8")
    assert "https://bharatbazaro.com/under-99.html" in sitemap_content
    assert "https://bharatbazaro.com/deal/B0TEST9901.html" in sitemap_content


def test_bazar_ai_briefing_and_widget_export(tmp_path):
    from dealbot.web_exporter import export_ai_briefing
    from dealbot.ssg_engine import pre_render_all_pages

    base_html = '''<!DOCTYPE html><html><head><title>BharatBazaro</title></head><body>
    <h1 class="hero-title">Title</h1><p class="hero-subtitle">Sub</p>
    <div id="dealsGrid"></div><!-- Empty State -->
    <script src="app.js"></script></body></html>'''
    (tmp_path / "index.html").write_text(base_html, encoding="utf-8")

    deals = [
        {
            "asin": "B0BAZAR001",
            "title": "Sony WH-1000XM5 Wireless Headphones",
            "effective_price": 24990,
            "mrp": 34990,
            "discount_pct": 29,
            "effective_discount_pct": 29,
            "savings_inr": 10000,
            "brand": "Sony",
            "brand_tier": "tier1",
            "category": "Electronics & Audio",
            "is_loot": True,
            "buy_confidence": 92,
            "affiliate_url": "https://www.amazon.in/dp/B0BAZAR001?tag=dammaiprasad-21&linkCode=ll1",
        },
        {
            "asin": "B0BAZAR002",
            "title": "Type-C Braided Cable Under 299",
            "effective_price": 199,
            "mrp": 599,
            "discount_pct": 67,
            "effective_discount_pct": 67,
            "savings_inr": 400,
            "brand": "boAt",
            "category": "Mobiles & Accessories",
            "coupon_text": "Apply ₹20 coupon",
            "is_loot": False,
            "buy_confidence": 88,
            "affiliate_url": "https://www.amazon.in/dp/B0BAZAR002?tag=dammaiprasad-21&linkCode=ll1",
        }
    ]
    stats = {"total_live_deals": 2, "loot_count": 1, "max_discount_pct": 67, "total_savings_available": 10400}

    # 1. Test AI briefing export
    briefing = export_ai_briefing(deals, stats, output_dir=tmp_path)
    assert (tmp_path / "ai_briefing.json").exists()
    assert len(briefing["top_loot_summary"]) >= 1
    assert briefing["top_loot_summary"][0]["asin"] == "B0BAZAR001"
    assert briefing["market_stats"]["loot_count"] == 1
    assert briefing["best_under_299"]["asin"] == "B0BAZAR002"

    # 2. Test widget inclusion across generated pages
    pre_render_all_pages(deals, stats, root_dir=tmp_path)
    for page in ["index.html", "deals.html", "under-99.html", "coupons.html"]:
        content = (tmp_path / page).read_text(encoding="utf-8")
        assert 'id="bazaroAiWidget"' in content
        assert "⚡ Ask BazarAI • Discounts Finder" in content
        assert "bazaro_ai.js" in content

    # Check deal page
    deal_file = tmp_path / "deal" / "B0BAZAR001.html"
    assert deal_file.exists()
    deal_html = deal_file.read_text(encoding="utf-8")
    assert 'id="bazaroAiWidget"' in deal_html
    assert "bazaro_ai.js" in deal_html
