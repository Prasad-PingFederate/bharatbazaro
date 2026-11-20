import pytest
from dealbot.ssg_engine import (
    PAGE_CONFIGS,
    filter_deals_for_page,
    render_product_page_html,
    render_deal_card_html,
)


def test_collection_page_configs_present():
    """Verify that all 4 curated budget collections exist with proper metadata & subtags."""
    collection_filenames = {cfg["filename"] for cfg in PAGE_CONFIGS}
    expected = {
        "collections/under-99.html",
        "collections/under-199.html",
        "collections/under-499.html",
        "collections/loot-of-the-day.html",
    }
    assert expected.issubset(collection_filenames)

    subtags = {cfg["filename"]: cfg.get("subtag") for cfg in PAGE_CONFIGS if cfg["filename"] in expected}
    assert subtags["collections/under-99.html"] == "web_col_under99"
    assert subtags["collections/under-199.html"] == "web_col_under199"
    assert subtags["collections/under-499.html"] == "web_col_under499"
    assert subtags["collections/loot-of-the-day.html"] == "web_col_loot"


def test_filter_deals_for_collection_under_199():
    """Verify that filter_deals_for_page correctly isolates deals under price cap."""
    cfg = next(c for c in PAGE_CONFIGS if c["filename"] == "collections/under-199.html")
    mock_deals = [
        {"asin": "B001", "title": "USB Cable", "effective_price": 99, "mrp": 299},
        {"asin": "B002", "title": "Spoon Set", "effective_price": 149, "mrp": 399},
        {"asin": "B003", "title": "Earbuds Case", "effective_price": 199, "mrp": 499},
        {"asin": "B004", "title": "Headphones", "effective_price": 1499, "mrp": 2999},
        {"asin": "B005", "title": "Smart Watch", "effective_price": 2499, "mrp": 4999},
        {"asin": "B006", "title": "Phone Cover", "effective_price": 129, "mrp": 299},
        {"asin": "B007", "title": "Pen Pack", "effective_price": 79, "mrp": 150},
        {"asin": "B008", "title": "Keychain", "effective_price": 59, "mrp": 120},
    ]

    filtered = filter_deals_for_page(cfg, mock_deals)
    for deal in filtered:
        assert deal["effective_price"] <= 199


def test_filter_deals_for_loot_of_the_day():
    """Verify that loot collection prioritizes is_loot and >= 50% discount deals."""
    cfg = next(c for c in PAGE_CONFIGS if c["filename"] == "collections/loot-of-the-day.html")
    mock_deals = [
        {"asin": "B001", "title": "Loot Item", "effective_price": 299, "is_loot": True, "discount_pct": 80},
        {"asin": "B002", "title": "Steep Drop", "effective_price": 499, "is_loot": False, "discount_pct": 65},
        {"asin": "B003", "title": "Regular Item", "effective_price": 999, "is_loot": False, "discount_pct": 10},
    ]

    filtered = filter_deals_for_page(cfg, mock_deals)
    top_asins = [d["asin"] for d in filtered]
    assert "B001" in top_asins
    assert "B002" in top_asins


def test_render_product_page_conversion_upgrades():
    """Verify 1-Click Copy Coupon, Urgency Countdown & Live Social Proof indicators in product page HTML."""
    deal_with_coupon = {
        "asin": "B0TESTCOUPON",
        "title": "boAt Bassheads 100 Wired Earphones with Mic",
        "effective_price": 299,
        "mrp": 999,
        "discount_pct": 70,
        "promo_code": "BOATLOOT50",
        "coupon_discount": 50,
        "brand": "boAt",
        "category": "Electronics & Audio",
        "rating": 4.4,
        "review_count": 85000,
        "is_loot": True,
        "affiliate_url": "https://www.amazon.in/dp/B0TESTCOUPON?tag=dammaiprasad-21",
    }
    stats = {"total_live_deals": 50}
    html = render_product_page_html(deal_with_coupon, [], stats)

    # 1. 1-Click Copy Coupon button
    assert "btn-copy-coupon-fast" in html
    assert "copyCouponAndOpen" in html
    assert "BOATLOOT50" in html
    assert "✂️ COPY CODE & OPEN AMAZON" in html

    # 2. Urgency Flash Sale Countdown Timer
    assert "bb-urgency-flash-bar" in html
    assert "bb-countdown-time" in html
    assert "Flash Deal Ends in" in html

    # 3. Live Social Proof Viewers Badge
    assert "bb-live-viewers" in html
    assert "bb-pulse-dot" in html
    assert "bb-viewers-count" in html
    assert "people viewing this deal right now" in html

    # 4. Conversion Engine script include
    assert 'src="/conversion_engine.js"' in html


def test_render_deal_card_subtag():
    """Verify subtag propagation into card affiliate links."""
    deal = {
        "asin": "B0TEST99",
        "title": "Braided Type-C Cable",
        "effective_price": 99,
        "mrp": 299,
        "discount_pct": 67,
    }
    card_html = render_deal_card_html(deal, card_index=0, subtag="web_col_under99")
    assert "ascsubtag=web_col_under99" in card_html
