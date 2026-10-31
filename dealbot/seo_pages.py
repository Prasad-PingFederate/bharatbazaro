"""Brand hubs and the daily Amazon-deals URL. Called from the hourly SSG."""

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

BRAND_PAGES = (
    ("boat", "boAt", ("boat",), "boAt earbuds, headphones, smartwatches and soundbars on Amazon India today."),
    ("samsung", "Samsung", ("samsung",), "Samsung Galaxy phones, tablets, SSDs and TVs with a verified price drop."),
    ("havells", "Havells", ("havells",), "Havells fans, geysers, induction and home appliances at today's tracked price."),
    ("oneplus", "OnePlus", ("oneplus", "one plus"), "OnePlus and Nord phones plus buds, only when the discount is real."),
    ("sony", "Sony", ("sony",), "Sony headphones, speakers and cameras on Amazon India."),
    ("philips", "Philips", ("philips",), "Philips trimmers, air fryers and home appliances."),
    ("xiaomi", "Xiaomi", ("xiaomi", "redmi", "poco"), "Xiaomi, Redmi and Poco phones, power banks and TVs."),
    ("apple", "Apple", ("apple", "iphone", "ipad", "airpods", "macbook"), "Apple iPhone, iPad, MacBook and AirPods price checks."),
)

SITE = "https://bharatbazaro.com"


def _money(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return ""
    if number <= 0:
        return ""
    return f"₹{int(number):,}"


def _deal_discount(d: Dict[str, Any]) -> float:
    for key in ("effective_discount_pct", "discount_pct", "discount_percent", "discount"):
        raw = d.get(key)
        if raw in (None, ""):
            continue
        try:
            return float(raw)
        except (TypeError, ValueError):
            continue
    return 0.0


def _brand_hit(d: Dict[str, Any], tokens: tuple) -> bool:
    blob = f"{d.get('brand') or ''} {d.get('title') or ''}".lower()
    return any(re.search(rf"\b{re.escape(token)}\b", blob) for token in tokens)


def _seo_card(d: Dict[str, Any], idx: int) -> str:
    import html as html_lib

    title = html_lib.escape(str(d.get("title") or "Amazon India Deal"))
    asin = str(d.get("asin") or "").strip()
    price = _money(d.get("effective_price") or d.get("list_price") or d.get("price")) or "Check price"
    mrp = _money(d.get("mrp") or d.get("original_price"))
    disc = int(_deal_discount(d) or 0)
    aff = str(d.get("affiliate_url") or "")
    if not aff and asin:
        aff = f"https://www.amazon.in/dp/{asin}?tag=dammaiprasad-21&linkCode=ll1&ascsubtag=bb-seo"
    if not aff:
        aff = "https://www.amazon.in/?tag=dammaiprasad-21"
    aff = html_lib.escape(aff, quote=True)
    deal_href = f"/deal/{asin}.html" if asin else aff
    img = html_lib.escape(str(d.get("image_url") or d.get("image") or f"{SITE}/og-banner.png"), quote=True)
    prio = 'fetchpriority="high" decoding="async"' if idx < 3 else 'loading="lazy" decoding="async"'
    badge = (
        f'<span style="background:#ef4444;color:#fff;padding:3px 8px;border-radius:6px;font-weight:700;font-size:12px;">{disc}% OFF</span>'
        if disc
        else ""
    )
    mrp_html = f'<del style="color:#94a3b8;font-size:13px;margin-left:6px;">{mrp}</del>' if mrp else ""
    return (
        '<article class="deal-card" style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;display:flex;flex-direction:column;justify-content:space-between;">'
        f'<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">{badge}'
        '<span style="color:#38bdf8;font-size:12px;">Verified live</span></div>'
        f'<a href="{deal_href}" style="display:block;text-align:center;background:#fff;border-radius:8px;padding:12px;margin-bottom:12px;">'
        f'<img src="{img}" alt="{title}" width="200" height="200" {prio} style="object-fit:contain;max-height:180px;width:auto;margin:0 auto;" /></a>'
        f'<h2 style="font-size:15px;line-height:1.4;margin:0 0 10px;"><a href="{deal_href}" style="color:#f8fafc;text-decoration:none;">{title}</a></h2></div>'
        f'<div><div style="font-size:20px;font-weight:800;color:#22c55e;margin-bottom:12px;">{price} {mrp_html}</div>'
        f'<a href="{aff}" target="_blank" rel="nofollow sponsored noopener" style="display:block;text-align:center;background:#f97316;color:#fff;font-weight:700;padding:10px;border-radius:8px;text-decoration:none;">Grab deal on Amazon</a></div></article>'
    )


def _shell(title: str, h1: str, subtitle: str, canonical: str, cards_html: str, schema: str, today_slug: str, today_human: str) -> str:
    import html as html_lib
    from dealbot.ssg_engine import analytics_tags

    nav = (
        f'<a href="/deals/{today_slug}.html" style="color:#38bdf8;text-decoration:none;font-weight:700;">Amazon deals today</a>'
        '<a href="/under-499.html" style="color:#e2e8f0;text-decoration:none;">Under 499</a>'
        '<a href="/brand/boat.html" style="color:#e2e8f0;text-decoration:none;">boAt</a>'
        '<a href="/brand/samsung.html" style="color:#e2e8f0;text-decoration:none;">Samsung</a>'
        '<a href="/brand/havells.html" style="color:#e2e8f0;text-decoration:none;">Havells</a>'
        '<a href="/brand/oneplus.html" style="color:#e2e8f0;text-decoration:none;">OnePlus</a>'
    )
    return f"""<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{html_lib.escape(title)}</title>
  <meta name="description" content="{html_lib.escape(subtitle)}" />
  <link rel="canonical" href="{canonical}" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  {analytics_tags()}
  <meta property="og:title" content="{html_lib.escape(title)}" />
  <meta property="og:description" content="{html_lib.escape(subtitle)}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{SITE}/og-banner.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="/style.css" />
  <script type="application/ld+json">{schema}</script>
</head>
<body style="background:#0f172a;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;margin:0;">
  <header style="background:#1e293b;border-bottom:1px solid #334155;padding:16px 24px;display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;">
    <a href="/" style="color:#f97316;font-size:22px;font-weight:900;text-decoration:none;">BharatBazaro</a>
    <nav style="display:flex;flex-wrap:wrap;gap:14px;font-size:14px;">{nav}</nav>
  </header>
  <main style="max-width:1200px;margin:0 auto;padding:24px;">
    <h1 style="font-size:28px;margin-bottom:8px;">{html_lib.escape(h1)}</h1>
    <p style="color:#94a3b8;margin-bottom:24px;">{html_lib.escape(subtitle)} Updated {today_human} IST.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;">{cards_html}</div>
  </main>
  <footer style="text-align:center;padding:30px 16px;color:#64748b;font-size:13px;border-top:1px solid #1e293b;margin-top:40px;">
    <p>As an Amazon Associate, BharatBazaro earns from qualifying purchases. Prices can change.</p>
    <p><a href="/" style="color:#38bdf8;">Home</a> | <a href="/sitemap.xml" style="color:#38bdf8;">Sitemap</a></p>
  </footer>
</body>
</html>
"""


def generate_brand_and_daily_pages(deals: Optional[List[Dict[str, Any]]] = None, root_dir: Optional[Path] = None) -> List[str]:
    """Write /brand/*.html and /deals/YYYY-MM-DD.html. Returns canonical URLs for the sitemap."""
    from dealbot.ssg_engine import visitor_rank

    ist = timezone(timedelta(hours=5, minutes=30))
    now = datetime.now(ist)
    today_slug = now.strftime("%Y-%m-%d")
    today_human = now.strftime("%d %B %Y")
    yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent
    if not deals:
        live = root_dir / "data" / "live_deals.json"
        if live.exists():
            loaded = json.loads(live.read_text(encoding="utf-8"))
            deals = loaded if isinstance(loaded, list) else []
    deals = [d for d in (deals or []) if isinstance(d, dict)]
    ranked = sorted(deals, key=visitor_rank, reverse=True)
    urls: List[str] = []

    brand_dir = root_dir / "brand"
    brand_dir.mkdir(parents=True, exist_ok=True)
    for slug, name, tokens, desc in BRAND_PAGES:
        matched = [d for d in ranked if _brand_hit(d, tokens)][:24]
        if matched:
            cards = "\n".join(_seo_card(d, i) for i, d in enumerate(matched))
        else:
            cards = (
                f'<p style="grid-column:1/-1;color:#94a3b8;">No verified {name} deal is live this hour. '
                '<a href="/" style="color:#38bdf8;">Browse the full radar</a>.</p>'
            )
        canonical = f"{SITE}/brand/{slug}.html"
        schema = json.dumps(
            {
                "@context": "https://schema.org",
                "@type": "CollectionPage",
                "name": f"{name} Amazon India deals today",
                "description": desc,
                "url": canonical,
            },
            ensure_ascii=False,
        )
        (brand_dir / f"{slug}.html").write_text(
            _shell(
                f"{name} deals today on Amazon India | BharatBazaro",
                f"{name} deals on Amazon India",
                desc,
                canonical,
                cards,
                schema,
                today_slug,
                today_human,
            ),
            encoding="utf-8",
        )
        urls.append(canonical)

    daily_dir = root_dir / "deals"
    daily_dir.mkdir(parents=True, exist_ok=True)
    for old in daily_dir.glob("*.html"):
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", old.stem) and old.stem not in {today_slug, yesterday}:
            old.unlink()
    top = ranked[:24]
    cards = "\n".join(_seo_card(d, i) for i, d in enumerate(top)) or "<p>No live deals in this cycle.</p>"
    daily_url = f"{SITE}/deals/{today_slug}.html"
    schema = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": f"Amazon deals today ({today_human}): verified price drops in India",
            "datePublished": f"{today_slug}T06:00:00+05:30",
            "dateModified": now.isoformat(),
            "image": [f"{SITE}/og-banner.png"],
            "author": {"@type": "Organization", "name": "BharatBazaro"},
            "publisher": {"@type": "Organization", "name": "BharatBazaro", "url": SITE},
        },
        ensure_ascii=False,
    )
    (daily_dir / f"{today_slug}.html").write_text(
        _shell(
            f"Amazon deals today ({today_human}) | BharatBazaro",
            f"Amazon deals today ({today_human})",
            f"Verified Amazon India price drops and coupons for {today_human}.",
            daily_url,
            cards,
            schema,
            today_slug,
            today_human,
        ),
        encoding="utf-8",
    )
    urls.append(daily_url)
    if (daily_dir / f"{yesterday}.html").exists():
        urls.append(f"{SITE}/deals/{yesterday}.html")
    logger.info("Wrote %s brand pages and %s", len(BRAND_PAGES), daily_url)
    return urls


def generate_grok_brand_and_daily_pages(deals_list=None, root_dir=None):
    """Alias for the earlier script name. Always writes inside the repo, not the process cwd."""
    return generate_brand_and_daily_pages(deals_list, root_dir or Path(__file__).resolve().parent.parent)
