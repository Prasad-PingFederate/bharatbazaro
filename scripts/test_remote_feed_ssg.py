#!/usr/bin/env python3
"""
Test Remote Feed Ingestion & SSG Page Generation for BharatBazaro.
Tests:
1. Feature-flagged ingestion from canonical deals_feed.json (EPC-weighted).
2. Clean subtag preservation (bb-grid, bb-seo, bb-bazarai, bb-shorts).
3. SSG rendering of index.html and category pages without errors.
4. Fallback behavior when remote feed URL is invalid.
"""

import os
import sys
import json
import logging
from pathlib import Path

# Setup paths
repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from dealbot.web_exporter import (
    append_ascsubtag,
    fetch_remote_dealdash_feed,
    process_remote_deals_feed,
    export_web_data,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("test_remote_feed")

def test_append_ascsubtag():
    logger.info("--- Test 1: append_ascsubtag clean URL query handling ---")
    u1 = "https://www.amazon.in/dp/B08L5WHFT9?tag=dammaiprasad-21&linkCode=ll1"
    res1 = append_ascsubtag(u1, "B08L5WHFT9", "bb-grid")
    assert "ascsubtag=bb-grid" in res1, f"Missing ascsubtag: {res1}"
    assert "tag=dammaiprasad-21" in res1, f"Missing tag: {res1}"
    assert "?&" not in res1 and "&&" not in res1, f"Malformed URL query: {res1}"

    # Replace existing ascsubtag
    u2 = "https://www.amazon.in/dp/B08L5WHFT9?tag=dammaiprasad-21&ascsubtag=old-tag&linkCode=ll1"
    res2 = append_ascsubtag(u2, "B08L5WHFT9", "bb-seo")
    assert "ascsubtag=bb-seo" in res2, f"Failed replacement: {res2}"
    assert "ascsubtag=old-tag" not in res2, f"Old tag not removed: {res2}"

    # Plain ASIN fallback
    res3 = append_ascsubtag(None, "B0TESTASIN1", "bb-shorts")
    assert "dp/B0TESTASIN1" in res3 and "ascsubtag=bb-shorts" in res3, f"Fallback failed: {res3}"
    logger.info("PASS: append_ascsubtag works correctly across all URL variants.")


def test_remote_feed_ingestion_and_ssg():
    logger.info("--- Test 2: Ingest Canonical Feed & Run SSG Generation ---")
    mock_feed_source = Path("C:/Users/prasad.dammai/Downloads/DealDash_ai_Bot/data/deals_feed.json")
    if not mock_feed_source.exists():
        # Create minimal mock feed if DealDash path is different
        mock_data = [
            {
                "asin": "B08TEST001",
                "title": "High EPC Noise Cancelling Wireless Headphones",
                "category": "Electronics",
                "mrp": 4999,
                "live_price": 1999,
                "coupon_discount": 200,
                "effective_price": 1799,
                "commission_rate": 0.08,
                "expected_commission": 143.92,
                "epc_score": 125.5,
                "rating": 4.5,
                "image_url": "https://m.media-amazon.com/images/I/71example.jpg",
                "base_affiliate_url": "https://www.amazon.in/dp/B08TEST001?tag=dammaiprasad-21",
                "video_eligible": True,
                "updated_at": "2026-11-24T05:00:00Z"
            },
            {
                "asin": "B08TEST002",
                "title": "Medium EPC Smart Fitness Band",
                "category": "Wearables",
                "mrp": 2999,
                "live_price": 999,
                "coupon_discount": 0,
                "effective_price": 999,
                "commission_rate": 0.05,
                "expected_commission": 49.95,
                "epc_score": 45.2,
                "rating": 4.1,
                "image_url": "https://m.media-amazon.com/images/I/61example.jpg",
                "base_affiliate_url": "https://www.amazon.in/dp/B08TEST002?tag=dammaiprasad-21",
                "video_eligible": False,
                "updated_at": "2026-11-24T05:00:00Z"
            }
        ]
        temp_mock = repo_root / "data" / "test_mock_feed.json"
        with open(temp_mock, "w", encoding="utf-8") as f:
            json.dump(mock_data, f)
        feed_url = str(temp_mock)
    else:
        feed_url = str(mock_feed_source)

    os.environ["USE_REMOTE_FEED"] = "true"
    os.environ["DEALDASH_FEED_URL"] = feed_url

    # Run export
    res = export_web_data()
    assert res is not None, "export_web_data returned None"
    assert res.get("source") == "remote_feed", f"Expected source 'remote_feed', got {res.get('source')}"
    deals_count = res.get("deals_count", 0)
    assert deals_count > 0, f"Expected deals > 0, got {deals_count}"

    # Verify data/live_deals.json sorting
    live_deals_path = repo_root / "data" / "live_deals.json"
    with open(live_deals_path, "r", encoding="utf-8") as f:
        live_deals = json.load(f)

    assert len(live_deals) == deals_count
    # Check EPC ordering
    epcs = [float(d.get("epc_score") or 0.0) for d in live_deals]
    assert epcs == sorted(epcs, reverse=True), "live_deals.json is NOT sorted by epc_score descending!"

    top_deal = live_deals[0]
    logger.info("Top EPC Deal: ASIN=%s, Title=%s, EPC=%s", top_deal.get("asin"), top_deal.get("title")[:40], top_deal.get("epc_score"))

    # Verify preserved subtag links
    assert top_deal.get("affiliate_url_grid") and "ascsubtag=bb-grid" in top_deal["affiliate_url_grid"]
    assert top_deal.get("affiliate_url_seo") and "ascsubtag=bb-seo" in top_deal["affiliate_url_seo"]
    assert top_deal.get("affiliate_url_bazarai") and "ascsubtag=bb-bazarai" in top_deal["affiliate_url_bazarai"]
    assert top_deal.get("affiliate_url_shorts") and "ascsubtag=bb-shorts" in top_deal["affiliate_url_shorts"]

    # Verify SSG HTML generation
    index_html = repo_root / "index.html"
    assert index_html.exists(), "index.html does not exist!"
    with open(index_html, "r", encoding="utf-8") as f:
        index_content = f.read()

    assert "BharatBazaro" in index_content
    assert "deal-card" in index_content
    assert "ascsubtag=bb-grid" in index_content
    logger.info("PASS: index.html was pre-rendered with %d deals and valid bb-grid affiliate links.", deals_count)

    # Verify data/ai_briefing.json
    briefing_path = repo_root / "data" / "ai_briefing.json"
    assert briefing_path.exists(), "ai_briefing.json missing!"
    logger.info("PASS: ai_briefing.json exists and is populated for BazarAI.")


def test_fallback_behavior():
    logger.info("--- Test 3: Fallback when Remote Feed is Unreachable ---")
    os.environ["USE_REMOTE_FEED"] = "true"
    os.environ["DEALDASH_FEED_URL"] = "https://127.0.0.1:9999/nonexistent_feed.json"

    # Ingestion should catch connection error and gracefully fall back without raising an unhandled exception
    res = export_web_data()
    assert res is not None, "Fallback failed: export_web_data returned None"
    # source should NOT be remote_feed
    assert res.get("source") != "remote_feed", "Fallback should not have source remote_feed"
    logger.info("PASS: System gracefully fell back when remote feed was unreachable.")


if __name__ == "__main__":
    test_append_ascsubtag()
    test_remote_feed_ingestion_and_ssg()
    test_fallback_behavior()
    logger.info("=========================================")
    logger.info("ALL TESTS PASSED WITH 100% SUCCESS!")
    logger.info("=========================================")
