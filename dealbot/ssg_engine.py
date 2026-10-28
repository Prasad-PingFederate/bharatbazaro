"""
Static Site Generation (SSG) Pre-rendering, Category Landing Pages & Rich Google Schema
for BharatBazaro.com.

Pre-renders live Amazon India deals into static semantic HTML deal cards inside:
- index.html (Top 30 deals across all categories)
- deals.html (Top Loot Alerts & steepest discount deals, window.INITIAL_FILTER = "loot")
- mobiles.html (Mobile & Accessories deals, window.INITIAL_CATEGORY = "mobiles")
- electronics.html (Electronics, Audio & Laptop deals, window.INITIAL_CATEGORY = "electronics")
- home.html (Home & Kitchen deals, window.INITIAL_CATEGORY = "home")
- fashion.html (Fashion & Footwear deals, window.INITIAL_CATEGORY = "fashion")
- grocery.html (Grocery & Personal Care deals, window.INITIAL_CATEGORY = "grocery")
"""

import html as html_lib
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

PAGE_CONFIGS = [
    {
        "filename": "index.html",
        "title": "BharatBazaro — Live Amazon India Loot Deals, Price Drop Radar & Hidden Coupon Finder (2026)",
        "canonical": "https://bharatbazaro.com/",
        "meta_description": "Discover screaming Amazon India price drops, 80% off lightning loot deals, and stackable hidden on-page coupons verified live 24/7 with BharatBazaro's AI Deal Radar.",
        "hero_title": 'India\'s 24/7 AI Deal & <span class="gradient-text">Price Drop Radar</span>',
        "hero_subtitle": "Real-time price error alerts, stackable on-page coupons, Keepa charts & BuyHatke-inspired confidence ratings verified autonomously every cycle.",
        "category_slug": "all",
        "initial_filter": None,
        "breadcrumb_name": None,
    },
    {
        "filename": "deals.html",
        "title": "Today's Top Amazon Loot Deals, Price Errors & 80% Off Lightning Offers | BharatBazaro",
        "canonical": "https://bharatbazaro.com/deals.html",
        "meta_description": "Today's verified Amazon India loot deals, 80% off lightning price errors, and screaming discounts verified live 24/7 by BharatBazaro AI Deal Radar.",
        "hero_title": 'Today\'s Top Amazon <span class="gradient-text">Loot Deals & 80% Off Offers</span>',
        "hero_subtitle": "Autonomous radar tracking price errors, 70%–90% off lightning deals, and screaming Amazon discounts verified live.",
        "category_slug": None,
        "initial_filter": "loot",
        "breadcrumb_name": "Loot Deals",
    },
    {
        "filename": "mobiles.html",
        "title": "Best Mobile Phone Deals Today in India — iPhone, Samsung, OnePlus Price Drops | BharatBazaro",
        "canonical": "https://bharatbazaro.com/mobiles.html",
        "meta_description": "Best smartphone and mobile phone deals today in India. Live price drops on iPhones, Samsung Galaxy, OnePlus, chargers, cases, and mobile accessories.",
        "hero_title": 'Best Mobile Phone Deals & <span class="gradient-text">Smartphone Price Drops</span>',
        "hero_subtitle": "Live automated price drops on iPhones, Samsung Galaxy, OnePlus, chargers, and mobile accessories.",
        "category_slug": "mobiles",
        "initial_filter": None,
        "breadcrumb_name": "Mobiles & Accessories",
    },
    {
        "filename": "electronics.html",
        "title": "Top Electronics, Headphones, Laptops & Smartwatch Price Drops Today | BharatBazaro",
        "canonical": "https://bharatbazaro.com/electronics.html",
        "meta_description": "Top electronics, noise-cancelling headphones, gaming laptops, smartwatches, and computing gear price drops on Amazon India.",
        "hero_title": 'Top Electronics, Audio & <span class="gradient-text">Laptop Price Drops Today</span>',
        "hero_subtitle": "Discover screaming discounts on noise-cancelling headphones, laptops, PC accessories, and smart electronics.",
        "category_slug": "electronics",
        "initial_filter": None,
        "breadcrumb_name": "Electronics, Audio & Computing",
    },
    {
        "filename": "home.html",
        "title": "Home & Kitchen Appliances Loot Deals — Air Fryers, Mixer Grinders & Daily Essentials | BharatBazaro",
        "canonical": "https://bharatbazaro.com/home.html",
        "meta_description": "Home and kitchen appliances loot deals in India. Air fryers, mixer grinders, cookware, water purifiers, and home essentials with verified price drops.",
        "hero_title": 'Home & Kitchen Appliances <span class="gradient-text">Loot Deals & Offers</span>',
        "hero_subtitle": "Unbeatable price drops on air fryers, mixer grinders, cookware, water purifiers, and home essentials.",
        "category_slug": "home",
        "initial_filter": None,
        "breadcrumb_name": "Home & Kitchen",
    },
    {
        "filename": "fashion.html",
        "title": "Branded Fashion, Footwear & Watch Loot Deals Today (50%–85% Off) | BharatBazaro",
        "canonical": "https://bharatbazaro.com/fashion.html",
        "meta_description": "Branded fashion, footwear, sneakers, and luxury watch deals today (50%–85% off) on Amazon India verified by BharatBazaro.",
        "hero_title": 'Branded Fashion, Footwear & <span class="gradient-text">Watch Loot Deals (50%–85% Off)</span>',
        "hero_subtitle": "Steep discounts on Puma, Adidas, Casio, Levi's, sneakers, formal wear, and designer accessories.",
        "category_slug": "fashion",
        "initial_filter": None,
        "breadcrumb_name": "Fashion & Footwear",
    },
    {
        "filename": "grocery.html",
        "title": "Online Grocery, Skincare & Amazon Subscribe & Save Coupon Deals India | BharatBazaro",
        "canonical": "https://bharatbazaro.com/grocery.html",
        "meta_description": "Online grocery, skincare, and daily essentials with extra stackable on-page coupons and Amazon Subscribe & Save deals in India.",
        "hero_title": 'Online Grocery, Skincare & <span class="gradient-text">Subscribe & Save Coupon Deals</span>',
        "hero_subtitle": "Extra stackable on-page coupons and discounts on daily groceries, personal care, dry fruits, and skincare.",
        "category_slug": "grocery",
        "initial_filter": None,
        "breadcrumb_name": "Personal Care & Grocery",
    },
]


def ensure_og_banner(root_dir: Path) -> Path:
    """Ensure a high-resolution 1200x630 landscape social preview banner exists."""
    banner_path = root_dir / "og-banner.png"
    try:
        from PIL import Image, ImageDraw, ImageFont
        if banner_path.exists():
            try:
                with Image.open(banner_path) as im:
                    if im.size == (1200, 630):
                        return banner_path
            except Exception:
                pass

        W, H = 1200, 630
        img = Image.new("RGBA", (W, H), (11, 17, 32, 255))
        draw = ImageDraw.Draw(img)

        # Gradient background
        for y in range(H):
            t = y / H
            r = int(10 * (1 - t) + 4 * t)
            g = int(22 * (1 - t) + 38 * t)
            b = int(40 * (1 - t) + 30 * t)
            draw.line([(0, y), (W, y)], fill=(r, g, b, 255))

        # Ambient radial glow
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        for rad in range(450, 0, -15):
            alpha = int(40 * (1 - rad / 450))
            gdraw.ellipse([980 - rad, 160 - rad, 980 + rad, 160 + rad], fill=(16, 185, 129, alpha))
            gdraw.ellipse([180 - rad, 480 - rad, 180 + rad, 480 + rad], fill=(6, 182, 212, int(alpha * 0.8)))
        img = Image.alpha_composite(img, glow)
        draw = ImageDraw.Draw(img)

        # Border accents
        draw.rounded_rectangle([15, 15, W - 16, H - 16], radius=24, outline=(16, 185, 129, 70), width=2)
        draw.rounded_rectangle([25, 25, W - 26, H - 26], radius=18, outline=(255, 255, 255, 20), width=1)

        # Fonts
        windir = os.environ.get("WINDIR", "C:/Windows")
        f_pill = f_title = f_h2 = f_sub = f_chip = f_url = None
        font_candidates = [
            os.path.join(windir, "Fonts", "segoeuib.ttf"),
            os.path.join(windir, "Fonts", "arialbd.ttf"),
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        ]
        for fc in font_candidates:
            if os.path.exists(fc):
                try:
                    f_pill = ImageFont.truetype(fc, 18)
                    f_title = ImageFont.truetype(fc, 64)
                    f_h2 = ImageFont.truetype(fc, 36)
                    f_chip = ImageFont.truetype(fc, 18)
                    f_url = ImageFont.truetype(fc, 20)
                    break
                except Exception:
                    pass
        reg_candidates = [
            os.path.join(windir, "Fonts", "segoeui.ttf"),
            os.path.join(windir, "Fonts", "arial.ttf"),
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
        for rc in reg_candidates:
            if os.path.exists(rc):
                try:
                    f_sub = ImageFont.truetype(rc, 24)
                    break
                except Exception:
                    pass

        if not f_pill:
            f_pill = f_title = f_h2 = f_sub = f_chip = f_url = ImageFont.load_default()

        # Top Pill Badge
        pill_text = "⚡ AUTONOMOUS DEAL & PRICE DROP RADAR"
        bbox = draw.textbbox((0, 0), pill_text, font=f_pill)
        pw = bbox[2] - bbox[0] + 36
        ph = bbox[3] - bbox[1] + 16
        px, py = 70, 60
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=14, fill=(16, 185, 129, 35), outline=(16, 185, 129, 120), width=1)
        draw.text((px + 18, py + 7), pill_text, font=f_pill, fill=(52, 211, 153))

        # Icon
        icon_path = root_dir / "icon-512.png"
        if icon_path.exists():
            with Image.open(icon_path) as icon_img:
                icon_res = icon_img.convert("RGBA").resize((130, 130), Image.Resampling.LANCZOS)
                img.paste(icon_res, (70, 130), icon_res)

        # Brand Title
        draw.text((225, 135), "Bharat", font=f_title, fill=(255, 255, 255))
        b_w = draw.textbbox((225, 135), "Bharat", font=f_title)[2]
        draw.text((b_w + 5, 135), "Bazaro", font=f_title, fill=(52, 211, 153))

        # Headline & Subtitle
        draw.text((70, 290), "Live Amazon India Loot Deals, Price Drops & Hidden Coupons", font=f_h2, fill=(241, 245, 249))
        draw.text((70, 350), "Real-time price error alerts, stackable on-page coupons & Keepa charts verified 24/7", font=f_sub, fill=(148, 163, 184))

        # Feature Chips
        chips = ["🔥 10,000+ Items Scanned", "🚨 Verified Loot Alerts", "📉 All-Time Lows", "🎟️ On-Page Coupons"]
        cx = 70
        cy = 430
        for ch in chips:
            c_box = draw.textbbox((0, 0), ch, font=f_chip)
            cw = c_box[2] - c_box[0] + 28
            ch_h = c_box[3] - c_box[1] + 14
            draw.rounded_rectangle([cx, cy, cx + cw, cy + ch_h], radius=10, fill=(30, 41, 59, 200), outline=(51, 65, 85, 255), width=1)
            draw.text((cx + 14, cy + 6), ch, font=f_chip, fill=(226, 232, 240))
            cx += cw + 16

        # Footer Bar
        draw.line([(70, 520), (W - 70, 520)], fill=(30, 41, 59, 255), width=1)
        draw.text((70, 545), "🌐 bharatbazaro.com", font=f_url, fill=(52, 211, 153))

        img.convert("RGB").save(banner_path, "PNG", optimize=True)
        logger.info(f"Generated 1200x630 og-banner at {banner_path}")
    except Exception as e:
        logger.debug(f"ensure_og_banner error: {e}")
    return banner_path


def render_deal_card_html(d: Dict[str, Any]) -> str:
    """Render a semantic HTML article matching client-side createDealCardHtml in app.js."""
    asin = html_lib.escape(str(d.get("asin") or "B0UNKNOWN0"))
    title = html_lib.escape(str(d.get("title") or "Amazon Deal"))
    eff_price = d.get("effective_price") or d.get("list_price") or 0
    if eff_price <= 0:
        return ""
    mrp = d.get("mrp") or 0
    disc_pct = d.get("effective_discount_pct") or d.get("discount_pct") or 0
    savings_inr = d.get("savings_inr") or 0
    buy_conf = d.get("buy_confidence") or 75
    brand_chip = html_lib.escape(str(d.get("brand") or d.get("category") or "Amazon"))
    affiliate_url = html_lib.escape(str(d.get("affiliate_url") or f"https://www.amazon.in/dp/{asin}?tag=dammaiprasad-21&linkCode=ll1"))
    image_url = html_lib.escape(str(d.get("image_url") or f"https://m.media-amazon.com/images/P/{asin}.jpg"))
    is_loot = bool(d.get("is_loot"))

    badges = []
    if d.get("is_new") or (d.get("age_hours") is not None and d.get("age_hours") <= 2.0):
        badges.append('<span class="badge-tag badge-new">⚡ NEW</span>')
    if is_loot:
        badges.append('<span class="badge-tag badge-loot">🚨 LOOT ALERT</span>')
    if d.get("price_context") == "all_time_low":
        badges.append('<span class="badge-tag badge-drop">📉 ALL-TIME LOW</span>')
    elif d.get("is_further_drop"):
        badges.append('<span class="badge-tag badge-further">🔥 FURTHER DROP</span>')
    if d.get("brand_tier") == "tier1":
        badges.append('<span class="badge-tag badge-tier1">🏆 TIER-1 BRAND</span>')
    badges_html = "".join(badges)

    updated_at = d.get("updated_at") or int(time.time())
    diff_sec = max(0, int(time.time() - updated_at))
    if diff_sec < 60:
        time_ago = "Just now"
    elif diff_sec < 3600:
        time_ago = f"{diff_sec // 60}m ago"
    elif diff_sec < 86400:
        time_ago = f"{diff_sec // 3600}h ago"
    else:
        time_ago = f"{diff_sec // 86400}d ago"

    rating = d.get("rating")
    review_count = d.get("review_count")
    rating_html = ""
    if rating:
        rev_str = f'<span class="reviews-count">({review_count:,})</span>' if review_count else ""
        rating_html = f'''
            <div class="rating-chip">
              <span>⭐ {rating}</span>
              {rev_str}
            </div>'''

    mrp_html = f'<span class="original-mrp">₹{mrp:,}</span>' if (mrp and mrp > eff_price) else ""
    disc_html = f'<span class="discount-badge">{disc_pct}% OFF</span>' if disc_pct else ""
    savings_html = f'<div class="savings-line">You save ₹{savings_inr:,}</div>' if savings_inr > 0 else ""

    coupon_claim_banner = ""
    coupon_disc = d.get("coupon_discount")
    coupon_text = d.get("coupon_text")
    if coupon_disc or coupon_text:
        c_label = coupon_text or f"Apply ₹{coupon_disc:,} coupon"
        c_tag = f'<span class="coupon-discount-tag">(-₹{coupon_disc:,})</span>' if coupon_disc else ""
        coupon_claim_banner = f'''
          <div class="coupon-claim-banner" title="Tick this coupon on Amazon product page">
            <span class="coupon-tick-icon">☑️</span>
            <span class="coupon-claim-text">Tick <b>"{html_lib.escape(str(c_label))}"</b> on Amazon page {c_tag}</span>
          </div>'''

    extra_offers = d.get("extra_offers") or []
    extra_offers_html = ""
    if extra_offers:
        chips = "".join(f'<span class="extra-offer-chip">{html_lib.escape(str(o))}</span>' for o in extra_offers)
        extra_offers_html = f'''
          <div class="extra-offers-row">
            {chips}
          </div>'''

    callouts = []
    if coupon_disc and coupon_disc > 0:
        callouts.append(f'''
          <div class="callout-pill callout-coupon">
            <span>🎟️ Includes ₹{coupon_disc:,} On-Page Coupon</span>
            <span style="font-weight:700;">Applied</span>
          </div>''')
    bank_offer = d.get("bank_offer")
    if bank_offer:
        callouts.append(f'''
          <div class="callout-pill callout-bank" title="{html_lib.escape(str(bank_offer))}">
            <span>💳 {html_lib.escape(str(bank_offer)[:48])}...</span>
          </div>''')
    promo_code = d.get("promo_code")
    if promo_code:
        callouts.append(f'''
          <div class="callout-pill callout-promo btn-copy-promo" data-promo="{html_lib.escape(str(promo_code))}" title="Click to copy promo code">
            <span>🎟️ Code: <code style="font-weight:700;">{html_lib.escape(str(promo_code))}</code></span>
            <span class="promo-copy-action">📋 Tap to Copy</span>
          </div>''')
    callouts_html = f'<div class="callouts-list">{"".join(callouts)}</div>' if callouts else ""

    if buy_conf >= 90:
        conf_class = "high"
        conf_text = "Screaming Deal, Buy Now!"
        conf_icon = "🟢"
    elif buy_conf >= 80:
        conf_class = "medium"
        conf_text = "Strong Price Drop"
        conf_icon = "🟢"
    else:
        conf_class = "normal"
        conf_text = "Good Value"
        conf_icon = "🟡"

    hist_avg = d.get("historical_avg")
    trajectory_html = ""
    if hist_avg and hist_avg > eff_price:
        drop_amt = hist_avg - eff_price
        trajectory_html = f'<div class="historical-trajectory-text">📉 <b>₹{drop_amt:,}</b> below tracked average (₹{hist_avg:,})</div>'

    loot_class = "is-loot" if is_loot else ""

    return f'''      <article class="deal-card {loot_class}" data-asin="{asin}">
        <div class="card-top">
          <div class="card-badges">
            {badges_html}
          </div>
          <div class="card-top-actions">
            <span class="time-ago">{time_ago}</span>
            <button class="btn-watchlist" data-asin="{asin}" title="Save to Watchlist">
              🤍
            </button>
          </div>
        </div>

        <div class="card-media">
          <div class="card-image-wrap">
            <img src="{image_url}" alt="{title}" class="card-img" loading="lazy" onerror="this.src='https://m.media-amazon.com/images/P/{asin}.jpg'">
          </div>
          <div class="card-meta-bar">
            <span class="brand-chip">{brand_chip}</span>{rating_html}
          </div>
        </div>

        <div class="card-content">
          <a href="{affiliate_url}" target="_blank" rel="noopener noreferrer" class="card-title" title="{title}">
            {title}
          </a>

          <!-- Price Waterfall -->
          <div class="price-waterfall-box">
            <div class="price-main-row">
              <span class="effective-price">₹{eff_price:,}</span>
              {mrp_html}
              {disc_html}
            </div>
            {savings_html}
          </div>

          {coupon_claim_banner}
          {extra_offers_html}
          {callouts_html}

          <!-- Buy Confidence Meter -->
          <div class="confidence-meter-box">
            <div class="confidence-header">
              <span class="confidence-label">
                <span>{conf_icon}</span>
                <span>{conf_text}</span>
              </span>
              <span class="confidence-pct">{buy_conf}% Confidence</span>
            </div>
            <div class="confidence-bar-bg">
              <div class="confidence-bar-fill {conf_class}" style="width: {buy_conf}%"></div>
            </div>
            {trajectory_html}
          </div>
        </div>

        <div class="card-footer">
          <a href="{affiliate_url}" target="_blank" rel="noopener noreferrer" class="btn-buy-deal">
            <span>🛒 Grab Deal on Amazon ↗</span>
          </a>
          <button class="btn-card-share" data-asin="{asin}" title="Share Deal via WhatsApp / Copy Link">
            <span>📤 Share</span>
          </button>
          <button class="btn-chart-deal btn-open-modal" data-asin="{asin}" title="View Price History & Keepa Chart">
            <span>📈 Chart</span>
          </button>
        </div>
      </article>'''


def build_structured_data(page_cfg: dict, page_deals: list) -> str:
    """Generate rich Google Schema JSON-LD for WebSite, Organization, BreadcrumbList, and ItemList."""
    canonical = page_cfg["canonical"]
    is_home = page_cfg["filename"] == "index.html"

    graph = [
        {
            "@type": "WebSite",
            "@id": "https://bharatbazaro.com/#website",
            "url": "https://bharatbazaro.com/",
            "name": "BharatBazaro",
            "description": "Live Amazon India Loot Deals, Price Drop Radar & Hidden Coupon Finder",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://bharatbazaro.com/?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        },
        {
            "@type": "Organization",
            "@id": "https://bharatbazaro.com/#organization",
            "name": "BharatBazaro",
            "url": "https://bharatbazaro.com/",
            "logo": {
                "@type": "ImageObject",
                "url": "https://bharatbazaro.com/icon-512.png",
                "width": 512,
                "height": 512
            },
            "sameAs": [
                "https://t.me/Flash_Deals_Flipkart_Amazon"
            ]
        }
    ]

    if not is_home and page_cfg.get("breadcrumb_name"):
        graph.append({
            "@type": "BreadcrumbList",
            "@id": f"{canonical}#breadcrumb",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://bharatbazaro.com/"
                },
                {
                    "@type": "ListItem",
                    "position": 2,
                    "name": page_cfg["breadcrumb_name"],
                    "item": canonical
                }
            ]
        })

    items = []
    for idx, d in enumerate(page_deals[:30], 1):
        eff_price = d.get("effective_price") or d.get("list_price") or 0
        if eff_price <= 0:
            continue
        asin = d.get("asin") or ""
        aff_url = d.get("affiliate_url") or f"https://www.amazon.in/dp/{asin}?tag=dammaiprasad-21&linkCode=ll1"
        img_url = d.get("image_url") or f"https://m.media-amazon.com/images/P/{asin}.jpg"
        title = d.get("title") or "Amazon Deal"
        brand = d.get("brand") or "Amazon"

        prod_schema = {
            "@type": "Product",
            "name": title,
            "image": img_url,
            "description": f"{title} - Amazon deal at ₹{eff_price:,}",
            "sku": asin,
            "brand": {
                "@type": "Brand",
                "name": brand
            },
            "offers": {
                "@type": "Offer",
                "priceCurrency": "INR",
                "price": str(eff_price),
                "priceValidUntil": "2026-12-31",
                "availability": "https://schema.org/InStock",
                "url": aff_url
            }
        }
        if d.get("rating"):
            prod_schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": str(d.get("rating")),
                "reviewCount": str(d.get("review_count") or 1)
            }
        items.append({
            "@type": "ListItem",
            "position": idx,
            "item": prod_schema
        })

    if items:
        graph.append({
            "@type": "ItemList",
            "@id": f"{canonical}#itemlist",
            "name": page_cfg["title"],
            "numberOfItems": len(items),
            "itemListElement": items
        })

    data = {
        "@context": "https://schema.org",
        "@graph": graph
    }
    return f'<script type="application/ld+json">\n{json.dumps(data, indent=2, ensure_ascii=False)}\n  </script>'


def filter_deals_for_page(page_cfg: dict, all_deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter deals matching the category or filter, backfilling if sparse so Googlebot always has rich content."""
    slug = page_cfg.get("category_slug")
    filt = page_cfg.get("initial_filter")

    if filt == "loot":
        loots = [d for d in all_deals if d.get("is_loot")]
        steep = [d for d in all_deals if not d.get("is_loot") and (d.get("effective_discount_pct") or d.get("discount_pct") or 0) >= 50]
        combined = loots + [d for d in steep if d not in loots]
        if len(combined) < 15:
            combined += [d for d in all_deals if d not in combined]
        return combined[:30]

    if not slug or slug == "all":
        return all_deals[:30]

    matched = []
    for d in all_deals:
        cat = (d.get("category") or "").lower()
        t = (d.get("title") or "").lower()
        if slug == "mobiles":
            if "mobile" in cat or any(w in t for w in ("phone", "iphone", "samsung", "oneplus", "mobile", "case", "charger", "power bank", "tempered glass")):
                matched.append(d)
        elif slug == "electronics":
            if any(c in cat for c in ("electronic", "audio", "laptop", "computing")) or any(w in t for w in ("headphone", "earphone", "audio", "speaker", "soundbar", "laptop", "monitor", "keyboard", "mouse", "ssd", "smartwatch")):
                matched.append(d)
        elif slug == "home":
            if "home" in cat or "kitchen" in cat or any(w in t for w in ("cooker", "fryer", "air fryer", "pan", "bottle", "purifier", "mixer", "grinder", "kitchen", "kettle", "bedsheet", "curtain", "appliance", "blender", "iron", "toaster")):
                matched.append(d)
        elif slug == "fashion":
            if "fashion" in cat or "footwear" in cat or any(w in t for w in ("shirt", "shoe", "shoes", "sneaker", "jeans", "saree", "kurta", "jacket", "sandals", "wallet", "backpack", "watch", "watches")):
                matched.append(d)
        elif slug == "grocery":
            if any(c in cat for c in ("grocery", "personal care", "beauty")) or any(w in t for w in ("shampoo", "cream", "serum", "perfume", "soap", "tea", "coffee", "biscuit", "almond", "oil", "chocolate", "snack", "diaper", "sunscreen", "lotion", "moisturizer")):
                matched.append(d)

    # Backfill with top featured deals if category has fewer than 6 deals so Googlebot gets full indexable content
    if len(matched) < 6:
        backfill = [d for d in all_deals if d not in matched]
        matched += backfill

    return matched[:30]


def build_head_html(page_cfg: dict, page_deals: list) -> str:
    """Build a clean, standard, Google-compliant head block for any page."""
    ld_json = build_structured_data(page_cfg, page_deals)
    return f'''<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{page_cfg["title"]}</title>
  <meta name="description" content="{page_cfg["meta_description"]}">
  <meta name="keywords" content="Amazon deals, price drop alert, loot deals, coupons, India deals, Keepa charts, BuyHatke, PriceHistory">
  <link rel="canonical" href="{page_cfg["canonical"]}">

  <!-- OpenGraph / Social Sharing -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="{page_cfg["canonical"]}">
  <meta property="og:title" content="{page_cfg["title"]}">
  <meta property="og:description" content="{page_cfg["meta_description"]}">
  <meta property="og:image" content="https://bharatbazaro.com/og-banner.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{page_cfg["title"]}">
  <meta name="twitter:description" content="{page_cfg["meta_description"]}">
  <meta name="twitter:image" content="https://bharatbazaro.com/og-banner.png">

  <!-- Favicons, Touch Icons & PWA Manifest -->
  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

  <!-- Schema.org Structured Data -->
  {ld_json}

  <!-- Fonts & Stylesheet -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>'''


def generate_page_html(
    base_html: str,
    page_cfg: dict,
    page_deals: List[Dict[str, Any]],
    all_deals: List[Dict[str, Any]],
    stats: Dict[str, Any]
) -> str:
    """Generate complete standalone static HTML for a given page configuration."""
    html_out = base_html

    # 1. Cleanly replace the entire <head>...</head> section
    new_head = build_head_html(page_cfg, page_deals)
    html_out = re.sub(r'<head>.*?</head>', new_head, html_out, count=1, flags=re.DOTALL)

    # 2. Hero Title & Subtitle
    html_out = re.sub(
        r'<h1\s+class=["\']hero-title["\']>.*?</h1>',
        f'<h1 class="hero-title">\n          {page_cfg["hero_title"]}\n        </h1>',
        html_out,
        count=1,
        flags=re.DOTALL
    )
    html_out = re.sub(
        r'<p\s+class=["\']hero-subtitle["\']>.*?</p>',
        f'<p class="hero-subtitle">\n          {page_cfg["hero_subtitle"]}\n        </p>',
        html_out,
        count=1,
        flags=re.DOTALL
    )

    # 3. Stats values
    html_out = re.sub(r'(<span\s+class=["\']stat-val["\']\s+id=["\']statLiveDeals["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("total_live_deals", len(all_deals))}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']stat-val["\']\s+id=["\']statLootCount["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("loot_count", 0)}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']stat-val["\']\s+id=["\']statMaxDiscount["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("max_discount_pct", 0)}%\\g<2>', html_out)
    total_sav = stats.get("total_savings_available", 0)
    sav_str = f'₹{(total_sav / 100000):.2f}L' if total_sav >= 100000 else f'₹{total_sav:,}'
    html_out = re.sub(r'(<span\s+class=["\']stat-val["\']\s+id=["\']statTotalSavings["\']>)[^<]*(</span>)', f'\\g<1>{sav_str}\\g<2>', html_out)

    # 4. Tab counts
    html_out = re.sub(r'(<span\s+class=["\']tab-count["\']\s+id=["\']countAll["\']>)[^<]*(</span>)', f'\\g<1>{len(all_deals)}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']tab-count["\']\s+id=["\']countLoot["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("loot_count", 0)}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']tab-count["\']\s+id=["\']countDrops["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("all_time_lows_count", 0)}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']tab-count["\']\s+id=["\']countCoupons["\']>)[^<]*(</span>)', f'\\g<1>{stats.get("coupon_deals_count", 0)}\\g<2>', html_out)
    html_out = re.sub(r'(<span\s+class=["\']tab-count["\']\s+id=["\']countTier1["\']>)[^<]*(</span>)', f'\\g<1>{sum(1 for d in all_deals if d.get("brand_tier") == "tier1")}\\g<2>', html_out)

    # 5. Category pills & active states
    cat_slug = page_cfg.get("category_slug")
    init_filter = page_cfg.get("initial_filter")

    # Ensure Electronics pill exists
    if 'data-category="Electronics & Audio"' not in html_out:
        html_out = html_out.replace(
            '<button class="cat-pill" data-category="Mobiles & Accessories">📱 Mobiles</button>',
            '<button class="cat-pill" data-category="Mobiles & Accessories">📱 Mobiles</button>\n        <button class="cat-pill" data-category="Electronics & Audio">⚡ Electronics</button>'
        )

    # Reset active on category pills
    html_out = re.sub(r'class="cat-pill active"', 'class="cat-pill"', html_out)
    slug_to_cat = {
        "all": "all",
        "mobiles": "Mobiles & Accessories",
        "electronics": "Electronics & Audio",
        "home": "Home & Kitchen",
        "fashion": "Fashion & Footwear",
        "grocery": "Personal Care & Grocery",
    }
    target_cat = slug_to_cat.get(cat_slug, "all")
    html_out = html_out.replace(f'class="cat-pill" data-category="{target_cat}"', f'class="cat-pill active" data-category="{target_cat}"')

    # Reset active on filter tabs
    html_out = re.sub(r'class="filter-tab active"', 'class="filter-tab"', html_out)
    html_out = re.sub(r'class="filter-tab loot-tab active"', 'class="filter-tab loot-tab"', html_out)
    if init_filter == "loot":
        html_out = html_out.replace('class="filter-tab loot-tab" data-tab="loot"', 'class="filter-tab loot-tab active" data-tab="loot"')
    else:
        html_out = html_out.replace('class="filter-tab" data-tab="all"', 'class="filter-tab active" data-tab="all"')

    # 6. Inject deals inside #dealsGrid
    cards_html = "\n".join(render_deal_card_html(d) for d in page_deals)
    html_out = re.sub(
        r'(<div\s+id=["\']dealsGrid["\'][^>]*>).*?(</div>\s*<!--\s*Empty State)',
        rf'\g<1>\n{cards_html}\n    \g<2>',
        html_out,
        count=1,
        flags=re.DOTALL
    )

    # 7. Visible count
    html_out = re.sub(r'(<span\s+id=["\']visibleCount["\']\s+class=["\']font-bold["\']>)[^<]*(</span>)', f'\\g<1>{len(page_deals)}\\g<2>', html_out)

    # 8. Ensure home.html is in footer links
    if '<a href="/home.html"' not in html_out:
        html_out = html_out.replace(
            '<a href="/mobiles.html" class="footer-link">📱 Mobiles</a>',
            '<a href="/mobiles.html" class="footer-link">📱 Mobiles</a>\n          <a href="/home.html" class="footer-link">🏠 Home & Kitchen</a>'
        )

    # 9. Clean any existing window.INITIAL_* scripts
    html_out = re.sub(r'\s*<script>\s*window\.INITIAL_[^<]*</script>', '', html_out)

    # 10. Initial routing injection script
    script_injections = []
    if cat_slug and cat_slug != "all":
        script_injections.append(f'<script>window.INITIAL_CATEGORY = "{cat_slug}";</script>')
    if init_filter:
        script_injections.append(f'<script>window.INITIAL_FILTER = "{init_filter}";</script>')

    if script_injections:
        injection_code = "  " + "\n  ".join(script_injections) + "\n  <script src=\"app.js\">"
        html_out = re.sub(r'\s*<script\s+src=["\']app\.js["\']>', f'\n{injection_code}', html_out, count=1)

    return html_out


def update_sitemap_xml(root_dir: Path):
    """Ensure sitemap.xml contains all 7 canonical URLs with updated lastmod."""
    sitemap_path = root_dir / "sitemap.xml"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://bharatbazaro.com/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/deals.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/mobiles.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/electronics.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/home.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/fashion.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://bharatbazaro.com/grocery.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
'''
    sitemap_path.write_text(xml, encoding="utf-8")
    logger.info(f"Updated {sitemap_path} with 7 canonical landing page URLs.")


def pre_render_all_pages(deals: List[Dict[str, Any]], stats: Dict[str, Any], root_dir: Optional[Path] = None):
    """Pre-render static deal cards and rich schema across index.html and all 6 category pages."""
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent

    base_index_path = root_dir / "index.html"
    if not base_index_path.exists():
        logger.warning(f"Base index.html not found at {base_index_path}")
        return

    base_html = base_index_path.read_text(encoding="utf-8")

    for page_cfg in PAGE_CONFIGS:
        try:
            page_deals = filter_deals_for_page(page_cfg, deals)
            page_html = generate_page_html(base_html, page_cfg, page_deals, deals, stats)
            dest_file = root_dir / page_cfg["filename"]
            dest_file.write_text(page_html, encoding="utf-8")
            logger.info(f"Pre-rendered {len(page_deals)} deals into {dest_file} ({page_cfg['title'][:35]}...)")
        except Exception as e:
            logger.error(f"Failed to pre-render {page_cfg['filename']}: {e}", exc_info=True)

    try:
        update_sitemap_xml(root_dir)
    except Exception as e:
        logger.error(f"Failed to update sitemap.xml: {e}", exc_info=True)
