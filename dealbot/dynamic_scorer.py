"""
Dynamic Deal Scorer (0-100) for BharatBazaro.
Combines:
- Discount percentage (heavy weight on >= 40%)
- Proximity to 90-day / all-time low (strict <= hist_low * 1.03)
- Rating + review count
- Brand tier / reliability
- Extra boost for deals that historically convert well on WhatsApp (impulse prices, high-commission categories)
- Strict penalties on 0% commission categories (mobiles, expensive laptops)
"""

from typing import Dict, Any


def calculate_dynamic_deal_score(deal: Dict[str, Any]) -> int:
    eff_price = float(deal.get("effective_price") or deal.get("list_price") or deal.get("price") or 0)
    mrp = float(deal.get("mrp") or eff_price or 1)
    disc_pct = float(deal.get("effective_discount_pct") or deal.get("discount_pct") or 0)
    if mrp > eff_price and not disc_pct:
        disc_pct = round(((mrp - eff_price) / mrp) * 100, 1)

    hist_low = float(deal.get("historical_min") or eff_price)
    hist_avg = float(deal.get("historical_avg") or 0)
    rating = float(deal.get("rating") or 4.0)
    reviews = int(deal.get("reviews") or deal.get("review_count") or 0)
    brand_tier = str(deal.get("brand_tier") or "").lower()
    category = str(deal.get("category") or "").lower()
    title = str(deal.get("title") or "").lower()

    # 1. Discount Percentage (0 - 40 pts, heavy weight on >=40%)
    if disc_pct >= 60:
        score_disc = 40.0
    elif disc_pct >= 45:
        score_disc = 34.0
    elif disc_pct >= 40:
        score_disc = 28.0
    elif disc_pct >= 25:
        score_disc = 16.0
    else:
        score_disc = max(0.0, (disc_pct / 25.0) * 10.0)

    # 2. Historical Low Proximity (0 - 25 pts)
    # Strict gate: current_price <= historical_low * 1.03
    score_hist = 0.0
    if eff_price > 0 and eff_price <= (hist_low * 1.03):
        score_hist = 25.0
    elif eff_price > 0 and eff_price <= (hist_low * 1.10):
        score_hist = 16.0
    elif hist_avg > 0 and eff_price < (hist_avg * 0.90):
        score_hist = 10.0

    # 3. Rating & Reviews (0 - 15 pts)
    score_rating = 0.0
    if rating >= 4.2 and reviews >= 500:
        score_rating = 15.0
    elif rating >= 4.0 and reviews >= 100:
        score_rating = 10.0
    elif rating >= 3.8:
        score_rating = 6.0
    elif 0 < rating < 3.6:
        score_rating = -10.0

    # 4. Brand Tier & Reliability (0 - 10 pts)
    score_brand = 4.0
    if brand_tier in ("tier1", "top"):
        score_brand = 10.0
    elif brand_tier in ("tier2", "standard"):
        score_brand = 7.0

    # 5. WhatsApp Conversion Boost (Sweet spot impulse buys: Home, Kitchen, Beauty, Personal Care, Under Rs 499/999) (0 - 10 pts)
    score_wa = 0.0
    if 0 < eff_price <= 499:
        score_wa += 6.0
    elif 0 < eff_price <= 999:
        score_wa += 4.0

    is_high_comm = any(k in (category + " " + title) for k in [
        "kitchen", "home", "cookware", "appliance", "beauty", "grooming",
        "personal", "skincare", "hair", "fashion", "footwear", "essential",
        "grocery", "snack", "stationery", "cable", "charger", "tool"
    ])
    if is_high_comm:
        score_wa += 4.0

    # Penalty on 0% commission categories
    if "smartphone" in category or "mobile" in category or "smartphone" in title:
        score_wa -= 35.0
    elif eff_price > 35000 and "laptop" in category:
        score_wa -= 25.0

    # Coupon bonus
    coupon_bonus = 4.0 if (deal.get("coupon_text") or deal.get("promo_code") or deal.get("coupon_discount")) else 0.0

    total = round(score_disc + score_hist + score_rating + score_brand + score_wa + coupon_bonus)
    return max(5, min(99, total))


def is_strict_all_time_low(deal: Dict[str, Any]) -> bool:
    """Enforce strict mathematical gatekeeping for the All-Time Low badge:
    current_price <= historical_low * 1.03
    """
    eff_price = float(deal.get("effective_price") or deal.get("list_price") or deal.get("price") or 0)
    hist_low = float(deal.get("historical_min") or eff_price)
    if eff_price <= 0 or hist_low <= 0:
        return False
    return eff_price <= (hist_low * 1.03)
