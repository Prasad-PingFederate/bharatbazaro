"""
Unit tests for Autonomous Typesafe AI Web Search, ASIN Resolver, and Mandatory Live Verification Gate.
"""

from unittest.mock import MagicMock, patch
import pytest

from dealbot.ai_web_search import (
    WebDealCandidate,
    resolve_query_to_amazon_asin,
    fetch_ai_web_search_deals,
    _extract_deals_from_news_headline,
)
from dealbot.models import Deal
from dealbot.main import verify_and_enrich_deal
from dealbot.agent import score_deal


class TestWebDealCandidateSchema:
    def test_typesafe_candidate_from_valid_dict(self):
        raw = {
            "product_name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
            "amazon_url_or_asin": "https://www.amazon.in/dp/B09XS7JWHH",
            "deal_price": "₹26,990",
            "mrp": "₹34,990",
            "coupon_note": "Apply ₹1,500 coupon",
        }
        cand = WebDealCandidate.from_dict(raw, engine="gemini_grounded")
        assert cand is not None
        assert cand.product_name == "Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
        assert cand.asin == "B09XS7JWHH"
        assert cand.deal_price == 26990.0
        assert cand.mrp == 34990.0
        assert cand.discount_pct == 22.9
        assert cand.coupon_note == "Apply ₹1,500 coupon"
        assert cand.source_engine == "gemini_grounded"

    def test_typesafe_candidate_handles_malformed_llm_json(self):
        # Missing prices, weird string formats
        raw = {
            "title": "  [Deal Alert] Apple iPad 10th Gen 64GB Wi-Fi - Livemint  ",
            "url": "B0BJLXMVMV",
            "price": "Rs. 31,900.00",
            "list_price": "null",
            "discount": "18%",
        }
        cand = WebDealCandidate.from_dict(raw, engine="google_news_rss")
        assert cand is not None
        assert cand.product_name == "Apple iPad 10th Gen 64GB Wi-Fi"
        assert cand.asin == "B0BJLXMVMV"
        assert cand.deal_price == 31900.0
        assert cand.mrp is None
        assert cand.discount_pct == 18.0

    def test_typesafe_candidate_rejects_empty_or_invalid_names(self):
        assert WebDealCandidate.from_dict({}) is None
        assert WebDealCandidate.from_dict({"product_name": "abc"}) is None
        assert WebDealCandidate.from_dict("invalid") is None


class TestAmazonAsinResolver:
    MOCK_SEARCH_HTML = """
    <html>
      <body>
        <!-- Sponsored Ad (Must be skipped) -->
        <div data-component-type="s-search-result" data-asin="B0SPONSORED">
          <div class="AdHolder">
            <h2>Sponsored Wireless Earbuds</h2>
          </div>
        </div>
        <!-- Organic Target Result -->
        <div data-component-type="s-search-result" data-asin="B09TARGET9">
          <div>
            <h2>Samsung Galaxy Buds FE True Wireless Earbuds (Graphite)</h2>
          </div>
        </div>
      </body>
    </html>
    """

    def test_resolve_query_extracts_organic_asin(self):
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.read.return_value = self.MOCK_SEARCH_HTML.encode("utf-8")
            mock_urlopen.return_value.__enter__.return_value = mock_resp

            asin = resolve_query_to_amazon_asin("Samsung Galaxy Buds FE", timeout=2.0)
            assert asin == "B09TARGET9"

    def test_resolve_query_handles_empty_or_errors(self):
        assert resolve_query_to_amazon_asin("") is None
        with patch("urllib.request.urlopen", side_effect=Exception("Timeout")):
            assert resolve_query_to_amazon_asin("OnePlus 12R", timeout=1.0) is None


class TestGoogleNewsExtractor:
    def test_extract_deal_from_headline(self):
        title = "Amazon Sale: Samsung Galaxy M34 5G drops to ₹12,999 with ₹1,000 coupon - Gadgets 360"
        summary = "The phone was originally priced at Rs. 18,999."
        cand = _extract_deals_from_news_headline(title, summary)
        assert cand is not None
        assert "Samsung Galaxy M34 5G" in cand.product_name
        assert cand.deal_price == 12999.0
        assert cand.mrp == 18999.0
        assert cand.discount_pct == 31.6
        assert "apply" in (cand.coupon_note or "").lower() or "coupon" in (cand.coupon_note or "").lower()


class TestMandatoryLiveVerificationGate:
    def test_rejects_ai_web_deal_if_stock_not_verified(self):
        store = MagicMock()
        deal = Deal(
            id="aiweb:B0TEST1234",
            retailer="Amazon",
            title="Fire-Boltt Smartwatch",
            url="https://www.amazon.in/dp/B0TEST1234?tag=dammaiprasad-21&linkCode=ll1",
            current_price="₹1,499",
            original_price="₹4,999",
            discount_percent=70,
            category="AI Web Search",
            source_platform="AI Web Search",
            requires_live_verification=True,
        )

        with patch("dealbot.main.inspect_stock", return_value="out_of_stock"):
            passed = verify_and_enrich_deal(deal, store)
            assert passed is False
            assert deal._verify_skip_reason == "oos"

        with patch("dealbot.main.inspect_stock", return_value="stock_unknown"):
            passed = verify_and_enrich_deal(deal, store)
            assert passed is False
            assert deal._verify_skip_reason == "unverified_stock"

    def test_rejects_ai_web_deal_if_live_amazon_price_missing(self):
        store = MagicMock()
        deal = Deal(
            id="aiweb:B0TEST1234",
            retailer="Amazon",
            title="Fire-Boltt Smartwatch",
            url="https://www.amazon.in/dp/B0TEST1234?tag=dammaiprasad-21&linkCode=ll1",
            current_price="₹1,499",
            original_price="₹4,999",
            discount_percent=70,
            category="AI Web Search",
            source_platform="AI Web Search",
            requires_live_verification=True,
        )

        with patch("dealbot.main.inspect_stock", return_value="in_stock"):
            with patch("dealbot.main.enrich_amazon_deal", return_value={"live_price": None, "status": "unknown"}):
                passed = verify_and_enrich_deal(deal, store)
                assert passed is False
                assert deal._verify_skip_reason == "unverified_price"

    def test_accepts_verified_ai_web_deal_and_awards_bonus(self):
        store = MagicMock()
        store.record_price_sighting.return_value = {"status": "normal", "avg_price": None, "max_price": None}
        deal = Deal(
            id="aiweb:B0VERIFIED1",
            retailer="Amazon",
            title="OnePlus Nord Buds 2 True Wireless Earbuds",
            url="https://www.amazon.in/dp/B0VERIFIED1?tag=dammaiprasad-21&linkCode=ll1",
            current_price="₹1,999",
            original_price="₹3,299",
            discount_percent=39,
            category="AI Web Search",
            source_platform="AI Web Search",
            requires_live_verification=True,
        )

        with patch("dealbot.main.inspect_stock", return_value="in_stock"):
            with patch("dealbot.main.enrich_amazon_deal", return_value={
                "live_price": 1999,
                "mrp": 3299,
                "rating": 4.2,
                "review_count": 2500,
                "discount_pct": 39,
                "hi_res_image": "https://m.media-amazon.com/images/I/61abcde.jpg",
            }):
                passed = verify_and_enrich_deal(deal, store)
                assert passed is True
                assert deal.current_price == "₹1,999"

        # Check AI Web Discovery bonus in score_deal
        scored = score_deal(deal, recent_categories=[])
        assert "🌐 AI Web Discovery (+8)" in scored.reason
