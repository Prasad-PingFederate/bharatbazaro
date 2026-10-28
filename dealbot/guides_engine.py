"""
Evergreen SEO Buying Guides Generator for BharatBazaro.com.
Generates 5 rich, high-ranking buying guides with Article, FAQPage, BreadcrumbList schema,
comparison tables, pre-rendered live deal widgets, and embedded BazarAI shopping assistant.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

GUIDES_SPEC = [
    {
        "slug": "best-earbuds-headphones-deals-india",
        "title": "Best Earbuds & Headphones Deals on Amazon India (2026 Price Drop Radar & Buyer's Guide) | BharatBazaro",
        "h1": "Best Earbuds & Headphones Deals on Amazon India (2026 Price Drop Radar)",
        "meta_desc": "Find verified discounts on boAt, Sony, JBL & Noise TWS earbuds, neckbands and ANC headphones on Amazon India. Live price comparison and historical lows.",
        "keywords": "best earbuds under 1000, boat airdopes deals, amazon headphones sale, sony anc discounts",
        "category_filter": ["audio", "headphone", "earbud", "soundbar", "speaker", "electronics"],
        "icon": "🎧",
        "intro": "Looking for the highest-discount TWS earbuds, bass-heavy neckbands, or noise-cancelling headphones on Amazon India? BharatBazaro's 24/7 Deal Radar monitors price cuts across boAt, Sony, JBL, Noise, OnePlus, and Boult to surface genuine all-time low deals verified by Keepa historical charts.",
        "comparison_headers": ["Model / Category", "Best Known For", "Typical Price Range", "Ideal Target Discount"],
        "comparison_rows": [
            ["boAt Airdopes Series", "Deep bass & workout battery life", "₹899 – ₹1,499", "60% – 75% Off"],
            ["OnePlus Nord Buds", "Balanced sound & ultra-fast Warp charge", "₹1,999 – ₹2,799", "25% – 40% Off"],
            ["Sony WF / WH Series", "Industry-leading Active Noise Cancellation (ANC)", "₹7,990 – ₹24,990", "30% – 45% Off"],
            ["Realme Buds Air", "Low latency gaming & Spatial Audio", "₹1,499 – ₹3,299", "35% – 50% Off"],
            ["JBL Wave & Tune Series", "Signature Pure Bass & durability", "₹1,799 – ₹3,999", "40% – 60% Off"]
        ],
        "faqs": [
            {
                "q": "What is the best time to buy earbuds at the lowest price on Amazon India?",
                "a": "Apart from Amazon Great Indian Festival and Prime Day, lightning deals with on-page checkbox coupons typically drop between Tuesday and Thursday nights. BharatBazaro tracks real-time drops so you never miss an unadvertised flash sale."
            },
            {
                "q": "How can I verify if an earbud discount on Amazon is real?",
                "a": "Always cross-check the price with Keepa 90-day price history charts. BharatBazaro displays 90-day price history graphs and BuyHatke-inspired confidence ratings on every deal page."
            },
            {
                "q": "Which brand offers the best TWS earbuds under ₹1,000?",
                "a": "boAt (Airdopes series), Noise (Buds VS series), and Boult Audio regularly drop under ₹999 during flash coupon hours, offering 30+ hours of playtime and IPX4 splash resistance."
            },
            {
                "q": "Are Amazon checkbox coupons applicable on top of sale discounts?",
                "a": "Yes! Amazon India on-page checkbox coupons stack with existing MRP discounts. Simply tick the checkbox on the Amazon product page before adding to cart to get extra ₹100–₹500 instant savings."
            }
        ]
    },
    {
        "slug": "best-mobile-smartphone-price-drops-india",
        "title": "Amazon India Mobile & Smartphone Price Drops Today — 5G Phones Under ₹10k, ₹15k & ₹20k | BharatBazaro",
        "h1": "Amazon India Mobile & Smartphone Price Drops Today",
        "meta_desc": "Track real-time smartphone price drops, exchange bonuses, and SBI/HDFC bank discounts on OnePlus, Samsung, iQOO, Realme, and Redmi.",
        "keywords": "amazon smartphone deals, 5g phone under 15000, oneplus discount amazon, samsung galaxy price drop",
        "category_filter": ["mobile", "phone", "smartphone"],
        "icon": "📱",
        "intro": "Upgrading to a 5G smartphone? Amazon India frequently rotates instant bank discounts (SBI, HDFC, ICICI), coupon vouchers, and exchange bonuses across top smartphones. BharatBazaro's AI radar scans for unadvertised price reductions on Samsung Galaxy, OnePlus, iQOO, Narzo, and Redmi devices.",
        "comparison_headers": ["Budget Segment", "Popular Contenders", "Key Features to Expect", "Effective Deal Price Range"],
        "comparison_rows": [
            ["Under ₹10,000", "Redmi 13C 5G, POCO M6 5G, Realme Narzo N65", "Dimensity 6100+, 5000mAh, 90Hz Display", "₹8,499 – ₹9,999"],
            ["Under ₹15,000", "iQOO Z9x, Samsung Galaxy M15, Moto G64", "6000mAh Battery, Dimensity 7025 / Snapdragon 6 Gen 1", "₹11,999 – ₹14,499"],
            ["Under ₹20,000", "OnePlus Nord CE4 Lite, iQOO Z9, Realme 12+", "AMOLED 120Hz, Sony OIS Camera, 67W–80W Fast Charge", "₹16,999 – ₹19,999"],
            ["Premium Flagships", "OnePlus 12, Samsung Galaxy S24, iQOO 12", "Snapdragon 8 Gen 3, LTPO Displays, Periscope Telephoto", "₹52,999 – ₹69,999"]
        ],
        "faqs": [
            {
                "q": "How do I get the lowest price on smartphones on Amazon India?",
                "a": "Combine 3 savings layers: 1) Flash sale price cut, 2) Amazon on-page coupon checkbox (if available), and 3) Bank credit card instant discounts (SBI, HDFC, ICICI, Axis) which typically save an additional ₹1,000 to ₹5,000."
            },
            {
                "q": "Do smartphone prices drop right after a new model is launched?",
                "a": "Yes. When a new iteration launches (such as OnePlus Nord or Samsung M-series), previous generation stock gets discounted by 25% to 40% on Amazon to clear inventory."
            },
            {
                "q": "Can I trust refurbished or renewed phones on Amazon?",
                "a": "Amazon Renewed products undergo a 47-point quality inspection and carry a 6-month seller-backed warranty. Look for 'Renewed Premium' for like-new condition."
            }
        ]
    },
    {
        "slug": "best-home-kitchen-appliances-loot-deals",
        "title": "Best Home & Kitchen Appliance Loot Deals on Amazon India (Air Fryers, Blenders & Geysers) | BharatBazaro",
        "h1": "Best Home & Kitchen Appliance Loot Deals on Amazon India",
        "meta_desc": "Top discounts on Philips, Prestige, Wonderchef, and Havells home appliances. Verified 50% to 75% price drops with Keepa chart confirmation.",
        "keywords": "amazon kitchen loots, air fryer deal amazon, wonderchef nutri-blend discount, prestige cooker sale",
        "category_filter": ["home", "kitchen", "appliance"],
        "icon": "🏠",
        "intro": "Upgrade your kitchen and home without overspending. BharatBazaro tracks massive price drops on air fryers, mixer grinders, ceiling fans, induction cooktops, and vacuum cleaners from trusted brands like Philips, Prestige, Havells, Wonderchef, and Lifelong.",
        "comparison_headers": ["Appliance Type", "Top Recommended Brands", "Key Must-Have Specs", "Typical Deal Savings"],
        "comparison_rows": [
            ["Mixer Grinder / Blenders", "Wonderchef Nutri-Blend, Prestige, Lifelong", "500W–750W copper motor, 3 stainless jars", "50% – 65% Off"],
            ["Digital Air Fryers", "PHILIPS Essential, Pigeon Healthifry, Havells", "Rapid Air technology, 4L–5L capacity, touch presets", "45% – 60% Off"],
            ["BLDC Energy Saving Fans", "Havells Ambrose, Crompton, Atomberg", "5-star BEE rating, remote control, 60% power saving", "30% – 45% Off"],
            ["Kitchen Chimneys", "Crompton Curved, Hindware, Faber", "1200+ m3/hr suction, filterless, motion sensor", "55% – 70% Off"]
        ],
        "faqs": [
            {
                "q": "Which is the best mixer grinder under ₹3,500 on Amazon?",
                "a": "The Wonderchef Nutri-Blend Turbo 750W and Lifelong 500W-750W models provide incredible value, offering high RPM blending, durable stainless-steel blades, and compact space-saving profiles."
            },
            {
                "q": "Is buying BLDC fans worth it compared to normal fans?",
                "a": "Absolutely. BLDC fans consume around 28W–32W compared to 75W for standard induction fans, saving approximately ₹1,500 per year per fan on electricity bills, paying for themselves in under two years."
            },
            {
                "q": "How does BharatBazaro verify appliance deals?",
                "a": "Our automated radar compares the current Amazon.in price against historical pricing from Keepa and BuyHatke databases to ensure the advertised discount is not an inflated MRP gimmick."
            }
        ]
    },
    {
        "slug": "amazon-india-hidden-coupon-price-error-tricks",
        "title": "Amazon India Hidden Coupons & Price Error Tricks (How to Get 70%–90% Off Legally) | BharatBazaro",
        "h1": "Amazon India Hidden Coupons & Price Error Tricks (70%–90% Off Guide)",
        "meta_desc": "Comprehensive guide to claiming Amazon India hidden checkbox coupons, Subscribe & Save stacking, Lightning Deals alerts, and price drops.",
        "keywords": "amazon coupons tricks, amazon price error deals, amazon coupon finder india, how to get 90% off amazon",
        "category_filter": ["coupon", "loot", "drops"],
        "icon": "🎟️",
        "intro": "Did you know thousands of Amazon India products feature unadvertised checkbox coupons that can be stacked with bank promotions and Subscribe & Save discounts? In this masterclass guide, BharatBazaro reveals the algorithmic tricks used by pro deal hunters to unlock 70% to 90% savings.",
        "comparison_headers": ["Discount Method", "How to Unlock It", "Average Savings", "Stackable With Other Offers?"],
        "comparison_rows": [
            ["On-Page Checkbox Coupon", "Check the green 'Apply ₹X Coupon' box on product page", "₹50 – ₹1,000 Flat", "Yes (Stacks with MRP drop & Cards)"],
            ["Subscribe & Save (S&S)", "Select monthly recurring delivery (can cancel anytime)", "5% – 10% Extra", "Yes (Stacks with coupons)"],
            ["Bank Instant Card Offers", "Pay using eligible credit/debit card (HDFC/SBI/ICICI)", "10% – 15% Instant Off", "Yes (Deducted at final checkout)"],
            ["Amazon Pay Balance Cashback", "Load wallet using credit card rewards / UPI promo", "₹25 – ₹100 Cashback", "Yes (Credited after dispatch)"],
            ["Lightning Deal Windows", "Buy within 2 to 4 hour lightning deals window", "40% – 80% Off", "Yes (Limited quantity)"]
        ],
        "faqs": [
            {
                "q": "What causes Amazon price errors and do orders get cancelled?",
                "a": "Price errors happen when third-party sellers make algorithmic mistakes in dynamic repricing tools or during promotional catalog updates. While Amazon occasionally cancels severe glitches (like 99% off iPhones), 80%+ of modest price-drop errors get successfully dispatched if ordered immediately."
            },
            {
                "q": "How do I find products that have checkbox coupons?",
                "a": "You can browse BharatBazaro's dedicated Hidden Coupons Finder (/coupons.html) where our Deal Radar automatically extracts and tags every active deal with a verified coupon code or checkbox amount."
            },
            {
                "q": "Can I cancel Amazon Subscribe & Save after placing the order?",
                "a": "Yes. Once your order has shipped, you can easily go to 'Your Subscribe & Save Items' in your Amazon account and cancel the recurring subscription with one click at no charge."
            }
        ]
    },
    {
        "slug": "best-amazon-deals-under-99-299-499-india",
        "title": "Best Amazon Deals Under ₹99, ₹299 & ₹499 Today — Daily Essentials, Fashion & Gadgets | BharatBazaro",
        "h1": "Best Amazon Deals Under ₹99, ₹299 & ₹499 Today in India",
        "meta_desc": "Curated Amazon India pocket stores: discover high-rating cables, daily personal care, stationery, and kitchen gadgets priced under ₹99, ₹299, and ₹499.",
        "keywords": "amazon 99 store, deals under 299 amazon, budget gadgets under 500, amazon loot under 99",
        "category_filter": ["under-99", "under-299", "under-499"],
        "icon": "🪙",
        "intro": "You don't need a massive budget to find satisfying loot deals. Amazon India has thousands of useful daily items—from braided fast-charging cables and skincare essentials to kitchen peelers and smartphone stands—priced under ₹99, ₹299, and ₹499 with Prime free delivery.",
        "comparison_headers": ["Price Bracket", "Best Categories to Look For", "Verified Deal Examples", "Free Delivery Tip"],
        "comparison_rows": [
            ["🪙 ₹99 Store", "Mobile cables, cable protectors, keychains, face wipes", "Type-C OTG adapters, microfibre cloths", "Use Amazon Prime for ₹0 delivery on single items"],
            ["Under ₹299", "Fast charging cables, phone stands, kitchen peelers, socks", "Ambrane cables, Bata sandals, Vega combs", "Combine 2 items or add Prime"],
            ["Under ₹499", "Wireless mice, surge protectors, basic t-shirts, earphone cases", "Portronics surge protectors, Zebronics mouse", "Usually free delivery with Prime"],
            ["Under ₹999", "Smart bands, basic TWS earbuds, casual sneakers, electric kettles", "boAt Airdopes, Puma sneakers, Pigeon kettles", "Qualifies for free delivery automatically"]
        ],
        "faqs": [
            {
                "q": "How do I avoid delivery fees on items under ₹99 on Amazon?",
                "a": "If you have Amazon Prime, fulfilled-by-Amazon (FBA) items have free delivery regardless of order value. For non-Prime accounts, combine items until the cart reaches ₹499 for free standard delivery."
            },
            {
                "q": "Are products under ₹99 genuine quality?",
                "a": "BharatBazaro only indexes deals from Amazon sellers with 4.0★+ ratings and at least 50 customer reviews, filtering out counterfeit listings and spam sellers automatically."
            },
            {
                "q": "Where can I see live deals filtered by price on BharatBazaro?",
                "a": "Visit our dedicated price stores: /under-99.html, /under-299.html, /under-499.html, and /under-999.html, updated every 30 minutes with live stock confirmation."
            }
        ]
    }
]


def render_guide_html(spec: Dict[str, Any], deals: List[Dict[str, Any]], root_dir: Path) -> str:
    """Render a standalone, semantic, rich SEO guide page."""
    slug = spec["slug"]
    canonical_url = f"https://bharatbazaro.com/guides/{slug}.html"
    partner_tag = os.getenv("AMAZON_AFFILIATE_TAG") or os.getenv("AMAZON_PARTNER_TAG") or "dammaiprasad-21"

    # Filter 4-8 relevant deals for the guide
    cat_keys = [k.lower() for k in spec["category_filter"]]
    matched_deals = []
    for d in deals:
        t = (d.get("title") or "").lower()
        c = (d.get("category") or "").lower()
        price = d.get("effective_price") or d.get("list_price") or 999999
        if "under-99" in cat_keys and price <= 99:
            matched_deals.append(d)
        elif "under-299" in cat_keys and price <= 299:
            matched_deals.append(d)
        elif "under-499" in cat_keys and price <= 499:
            matched_deals.append(d)
        elif any(k in t or k in c for k in cat_keys):
            matched_deals.append(d)
    if len(matched_deals) < 4:
        matched_deals.extend([d for d in deals if d not in matched_deals][:6])
    display_deals = matched_deals[:6]

    # Render deal cards
    deal_cards_html = []
    svg_placeholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='100%' height='100%' fill='%23f1f5f9'/><text x='50%' y='45%' font-size='48' text-anchor='middle' dominant-baseline='middle'>⚡</text><text x='50%' y='72%' font-size='13' font-weight='bold' fill='%2364748b' text-anchor='middle' font-family='sans-serif'>Amazon Verified Deal</text></svg>"

    for d in display_deals:
        asin = d.get("asin")
        title = d.get("title")
        img = d.get("image_url") or f"https://m.media-amazon.com/images/P/{asin}.jpg"
        eff_p = d.get("effective_price") or d.get("list_price") or 0
        mrp = d.get("mrp") or d.get("original_price")
        disc = d.get("effective_discount_pct") or d.get("discount_pct") or 0
        aff_url = f"https://www.amazon.in/dp/{asin}?tag={partner_tag}&linkCode=ll1"

        deal_cards_html.append(f"""
        <article class="deal-card" style="border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px; background: var(--bg-card); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="height: 180px; display: flex; align-items: center; justify-content: center; background: #ffffff; border-radius: var(--radius-sm); margin-bottom: 12px; overflow: hidden;">
              <a href="/deal/{asin}.html" title="{title}">
                <img src="{img}" alt="{title}" style="max-height: 160px; max-width: 100%; object-fit: contain;" loading="lazy" onload="if(this.naturalWidth<=1||this.naturalHeight<=1){{this.src='{svg_placeholder}';}}" onerror="this.src='{svg_placeholder}';">
              </a>
            </div>
            <a href="/deal/{asin}.html" style="font-size: 0.92rem; font-weight: 700; color: var(--text-main); text-decoration: none; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px;">
              {title}
            </a>
            <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px;">
              <span style="font-size: 1.25rem; font-weight: 800; color: #10b981;">₹{eff_p:,}</span>
              {f'<span style="font-size: 0.85rem; text-decoration: line-through; color: var(--text-muted);">₹{mrp:,}</span>' if mrp and mrp > eff_p else ''}
              {f'<span style="font-size: 0.78rem; font-weight: 700; color: #ef4444; background: rgba(239, 68, 68, 0.12); padding: 2px 6px; border-radius: 4px;">{disc}% OFF</span>' if disc > 0 else ''}
            </div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <a href="{aff_url}" target="_blank" rel="noopener noreferrer" style="flex: 1; text-align: center; background: #f59e0b; color: #090d16; padding: 8px; border-radius: var(--radius-full); font-weight: 700; font-size: 0.85rem; text-decoration: none;">🛒 Grab on Amazon</a>
            <a href="/deal/{asin}.html" style="padding: 8px 12px; background: var(--bg-input); color: var(--text-main); border: 1px solid var(--border-card); border-radius: var(--radius-full); font-size: 0.85rem; text-decoration: none; font-weight: 600;">Chart</a>
          </div>
        </article>
        """)

    # Schema JSON-LD
    schema_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": f["q"],
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": f["a"]
                }
            }
            for f in spec["faqs"]
        ]
    }

    schema_article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": spec["h1"],
        "description": spec["meta_desc"],
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonical_url
        },
        "author": {
            "@type": "Organization",
            "name": "BharatBazaro Deal Intelligence Team",
            "url": "https://bharatbazaro.com/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "BharatBazaro",
            "logo": {
                "@type": "ImageObject",
                "url": "https://bharatbazaro.com/og-banner.png"
            }
        },
        "datePublished": "2026-10-28T00:00:00+05:30",
        "dateModified": "2026-10-28T20:00:00+05:30"
    }

    schema_breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "BharatBazaro",
                "item": "https://bharatbazaro.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Guides",
                "item": "https://bharatbazaro.com/#buyingGuidesSection"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": spec["h1"],
                "item": canonical_url
            }
        ]
    }

    # Render comparison table
    table_head = "".join(f"<th style='padding: 10px 14px; text-align: left; background: var(--bg-input); border: 1px solid var(--border-card); font-size: 0.85rem;'>{h}</th>" for h in spec["comparison_headers"])
    table_rows = "".join(
        f"<tr>{''.join(f'<td style=\"padding: 10px 14px; border: 1px solid var(--border-card); font-size: 0.85rem;\">{col}</td>' for col in row)}</tr>"
        for row in spec["comparison_rows"]
    )

    faqs_html = "".join(
        f"""
        <div style="margin-bottom: 16px; padding: 16px; background: var(--bg-card); border: 1px solid var(--border-card); border-radius: var(--radius-md);">
          <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">❓ {f['q']}</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">{f['a']}</p>
        </div>
        """
        for f in spec["faqs"]
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{spec['title']}</title>
  <meta name="description" content="{spec['meta_desc']}">
  <meta name="keywords" content="{spec['keywords']}">
  <link rel="canonical" href="{canonical_url}">

  <!-- OpenGraph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="{spec['title']}">
  <meta property="og:description" content="{spec['meta_desc']}">
  <meta property="og:url" content="{canonical_url}">
  <meta property="og:image" content="https://bharatbazaro.com/og-banner.png">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/style.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
  {json.dumps(schema_article, indent=2)}
  </script>
  <script type="application/ld+json">
  {json.dumps(schema_faq, indent=2)}
  </script>
  <script type="application/ld+json">
  {json.dumps(schema_breadcrumb, indent=2)}
  </script>
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="header-inner container">
      <a href="/" class="brand-logo" title="BharatBazaro — Home">
        <div class="brand-icon-wrap"><span class="brand-bolt">⚡</span></div>
        <div class="brand-text">
          <span class="brand-name">Bharat<span class="brand-accent">Bazaro</span></span>
          <span class="brand-badge">24/7 AI RADAR</span>
        </div>
      </a>
      <div class="header-actions">
        <a href="/" class="btn btn-secondary" style="font-size: 0.85rem; padding: 6px 14px; text-decoration: none; border-radius: var(--radius-full);">← Back to Live Deals</a>
        <a href="https://t.me/Flash_Deals_Flipkart_Amazon" target="_blank" rel="noopener noreferrer" class="btn btn-telegram"><span>Join Telegram</span></a>
      </div>
    </div>
  </header>

  <main class="container" style="max-width: 900px; margin: 30px auto; padding: 0 16px;">
    <!-- Breadcrumbs -->
    <nav aria-label="Breadcrumb" style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px;">
      <a href="/" style="color: #38bdf8; text-decoration: none;">Home</a> &gt; 
      <a href="/#buyingGuidesSection" style="color: #38bdf8; text-decoration: none;">Guides</a> &gt; 
      <span>{spec['h1']}</span>
    </nav>

    <article>
      <header style="margin-bottom: 24px;">
        <span style="font-size: 2.2rem;">{spec['icon']}</span>
        <h1 style="font-size: 1.85rem; font-weight: 800; line-height: 1.3; margin: 12px 0; color: var(--text-main);">{spec['h1']}</h1>
        <p style="font-size: 0.95rem; color: var(--text-secondary);">By <b>BharatBazaro Deal Intelligence Team</b> • Updated October 2026 • 24/7 Price Drop Radar</p>
      </header>

      <div style="background: var(--bg-card); border-left: 4px solid #10b981; padding: 16px 20px; border-radius: 4px; margin-bottom: 28px;">
        <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-main); margin: 0;">{spec['intro']}</p>
      </div>

      <!-- Live Verified Deals Carousel/Grid -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 16px; color: var(--text-main);">🔥 Verified Live Deals Handpicked for this Guide</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          {''.join(deal_cards_html)}
        </div>
      </section>

      <!-- Comparison Matrix -->
      <section style="margin-bottom: 36px;">
        <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 14px; color: var(--text-main);">📊 Quick Comparison & Savings Strategy Matrix</h2>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead><tr>{table_head}</tr></thead>
            <tbody>{table_rows}</tbody>
          </table>
        </div>
      </section>

      <!-- Frequently Asked Questions (FAQPage) -->
      <section style="margin-bottom: 40px;">
        <h2 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 18px; color: var(--text-main);">💡 Frequently Asked Questions & Deal Tricks</h2>
        {faqs_html}
      </section>

      <!-- Affiliate Disclaimer -->
      <div style="padding: 14px 18px; background: var(--bg-input); border: 1px solid var(--border-card); border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 30px;">
        <b>Affiliate Disclosure:</b> BharatBazaro participates in the Amazon Associates Programme. When you buy through links on our site, we may earn an affiliate commission at no extra cost to you. All prices, coupon checkmarks, and stock levels are verified autonomously by our 24/7 radar.
      </div>
    </article>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <span class="brand-logo-small">⚡ Bharat<span class="brand-accent">Bazaro</span></span>
          <p class="footer-tagline">24/7 AI-Powered Deal Radar & Amazon Price Error Discovery Engine.</p>
        </div>
        <div class="footer-links">
          <a href="/" class="footer-link">🏠 Home</a>
          <a href="/deals.html" class="footer-link">🔥 Deals</a>
          <a href="/coupons.html" class="footer-link">🎟️ Coupons</a>
          <a href="/under-99.html" class="footer-link">🪙 ₹99 Store</a>
          <a href="/under-499.html" class="footer-link">Under ₹499</a>
          <a href="https://t.me/Flash_Deals_Flipkart_Amazon" target="_blank" rel="noopener noreferrer" class="footer-link">📲 Telegram</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- ⚡ BazarAI — AI Discounts & Coupon Finder Widget -->
  <div id="bazaro-chat-launcher" class="bazaro-chat-launcher" role="button" tabindex="0" title="⚡ Ask BazarAI • Discounts Finder">
    <span class="radar-dot">🟢</span>
    <span class="launcher-icon">⚡</span>
    <span class="launcher-text">Ask BazarAI • Discounts Finder</span>
  </div>

  <div id="bazaro-chat-drawer" class="bazaro-chat-drawer" role="dialog" aria-modal="true" style="display: none;">
    <div class="bazaro-chat-header">
      <div class="bazaro-header-title">
        <span class="bazaro-avatar">⚡</span>
        <div>
          <div class="bazaro-title-text">⚡ BazarAI — AI Discounts & Coupon Finder</div>
          <div class="bazaro-status-text">🟢 Online 24/7 • Finds Lowest Prices, Hidden Coupons & Keepa Charts</div>
        </div>
      </div>
      <div class="bazaro-header-actions">
        <button id="bazaro-close-btn" class="bazaro-ctrl-btn" title="Close Chat">✕</button>
      </div>
    </div>
    <div id="bazaro-chat-messages" class="bazaro-chat-messages"></div>
    <div class="bazaro-chat-input-bar">
      <input type="text" id="bazaro-user-input" class="bazaro-input-field" placeholder="Ask for deals, coupons, or paste Amazon URL..." autocomplete="off">
      <button id="bazaro-send-btn" class="bazaro-send-btn" title="Send Message">➤</button>
    </div>
  </div>

  <script src="/bazaro_ai.js" defer></script>
</body>
</html>
"""
    return html_content


def generate_all_guides(deals: List[Dict[str, Any]], root_dir: Optional[Path] = None) -> List[Path]:
    """Generate all 5 evergreen SEO buying guides."""
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent

    guides_dir = root_dir / "guides"
    guides_dir.mkdir(parents=True, exist_ok=True)

    generated = []
    for spec in GUIDES_SPEC:
        html = render_guide_html(spec, deals, root_dir)
        dest = guides_dir / f"{spec['slug']}.html"
        dest.write_text(html, encoding="utf-8")
        logger.info(f"Generated SEO guide: {dest.name}")
        generated.append(dest)

    return generated

