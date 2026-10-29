"""
Image and Title Resolver and Cache Engine for BharatBazaro.com.
Detects Amazon 1x1 dummy pixels (43-byte transparent GIFs on m.media-amazon.com/images/P/{asin}.jpg)
and placeholder titles like 'Amazon Deal (B0...)', resolving genuine high-res product images (images/I/...)
and real product titles directly from Amazon India.
Persists all resolved images and titles in data/image_cache.json across 24/7 runs.
"""

import json
import logging
import re
import urllib.request
import html as html_lib
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


def load_image_cache(cache_path: Path) -> Dict[str, Dict[str, Any]]:
    """Load existing image cache from data/image_cache.json."""
    if cache_path.exists():
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.debug(f"Failed to load image cache: {e}")
    return {}


def save_image_cache(cache: Dict[str, Dict[str, Any]], cache_path: Path):
    """Save image cache to data/image_cache.json."""
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"Failed to save image cache: {e}")


def is_dummy_pixel(url: str, timeout: float = 3.5) -> bool:
    """Check if an image URL returns Amazon's 43-byte transparent dummy 1x1 pixel."""
    if not url or not url.startswith("http"):
        return True
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENTS[0]})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read(256)
            if len(data) <= 100:
                return True
            return False
    except Exception:
        return True


def fetch_real_amazon_image_and_title(asin: str, timeout: float = 6.0) -> Dict[str, Optional[str]]:
    """Fetch Amazon product page and extract real image (images/I/...) and title."""
    url = f"https://www.amazon.in/dp/{asin}"
    result = {"image_url": None, "title": None}
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": USER_AGENTS[0],
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

            # 1. Product title extraction
            t = re.search(r'<span id="productTitle"[^>]*>([^<]+)</span>', html)
            if t:
                raw_t = html_lib.unescape(t.group(1)).strip()
                clean_t = re.sub(r"^Amazon\.in:\s*Buy\s*", "", raw_t, flags=re.IGNORECASE)
                clean_t = re.sub(r"\s+at\s+Low\s+Prices\s+in\s+India.*$", "", clean_t, flags=re.IGNORECASE)
                clean_t = re.sub(r"\s*:\s*Amazon\.in.*$", "", clean_t, flags=re.IGNORECASE)
                clean_t = re.sub(r"\s*\|\s*Amazon\.in.*$", "", clean_t, flags=re.IGNORECASE)
                clean_t = re.sub(r"\s+", " ", clean_t).strip()
                if len(clean_t) >= 5 and "Robot Check" not in clean_t and "Page Not Found" not in clean_t:
                    result["title"] = clean_t
            if not result["title"]:
                t2 = re.search(r'<title>([^<]+)</title>', html)
                if t2:
                    raw_t = html_lib.unescape(t2.group(1)).strip()
                    clean_t = re.sub(r"^Amazon\.in:\s*Buy\s*", "", raw_t, flags=re.IGNORECASE)
                    clean_t = re.sub(r"\s+at\s+Low\s+Prices\s+in\s+India.*$", "", clean_t, flags=re.IGNORECASE)
                    clean_t = re.sub(r"\s*:\s*Amazon\.in.*$", "", clean_t, flags=re.IGNORECASE)
                    clean_t = re.sub(r"\s*\|\s*Amazon\.in.*$", "", clean_t, flags=re.IGNORECASE)
                    clean_t = re.sub(r"\s+", " ", clean_t).strip()
                    if len(clean_t) >= 5 and "Robot Check" not in clean_t and "Page Not Found" not in clean_t:
                        result["title"] = clean_t

            # 2. High-res image extraction
            m = re.search(r'data-old-hires="([^"]+)"', html)
            if m and m.group(1).startswith("http"):
                result["image_url"] = m.group(1)
            else:
                m2 = re.search(r'"large":"([^"]+)"', html)
                if m2 and m2.group(1).startswith("http"):
                    result["image_url"] = m2.group(1)
                else:
                    m3 = re.search(r'<meta property="og:image" content="([^"]+)"', html)
                    if m3 and m3.group(1).startswith("http") and "amazon.com" in m3.group(1):
                        result["image_url"] = m3.group(1)
                    else:
                        imgs = re.findall(r'https://m\.media-amazon\.com/images/I/[a-zA-Z0-9%_-]+\.jpg', html)
                        if imgs:
                            result["image_url"] = imgs[0]

    except Exception as e:
        logger.debug(f"Could not fetch real Amazon metadata for {asin}: {e}")

    return result


def resolve_deal_images(deals: List[Dict[str, Any]], root_dir: Optional[Path] = None) -> List[Dict[str, Any]]:
    """
    Ensure every deal in deals has a genuine, non-blank product image and a real product title.
    Uses data/image_cache.json for fast caching across cycles.
    """
    if root_dir is None:
        root_dir = Path(__file__).resolve().parent.parent

    cache_path = root_dir / "data" / "image_cache.json"
    cache = load_image_cache(cache_path)
    cache_dirty = False

    for d in deals:
        asin = d.get("asin")
        if not asin:
            continue

        current_img = d.get("image_url") or ""
        current_title = d.get("title") or ""
        is_generic_title = (
            not current_title
            or current_title.startswith("Amazon Deal (")
            or current_title.startswith("Amazon Deal")
            or len(current_title) < 15
        )

        cached_meta = cache.get(asin, {})
        cached_img = cached_meta.get("image_url")
        cached_title = cached_meta.get("title")

        has_cached_image = bool(cached_img and "/images/P/" not in cached_img)
        has_cached_title = bool(cached_title and not cached_title.startswith("Amazon Deal") and len(cached_title) >= 15)

        # Apply cache if available
        if has_cached_image:
            d["image_url"] = cached_img
        if is_generic_title and has_cached_title:
            d["title"] = cached_title
            current_title = d["title"]
            is_generic_title = False

        # Check if we need to fetch live from Amazon
        needs_img_fetch = not d.get("image_url") or "/images/P/" in (d.get("image_url") or "")
        if needs_img_fetch and d.get("image_url"):
            # Check if current P-url is dummy pixel
            if not is_dummy_pixel(d["image_url"]):
                needs_img_fetch = False

        if is_generic_title or needs_img_fetch:
            meta = fetch_real_amazon_image_and_title(asin)
            new_img = meta.get("image_url")
            new_title = meta.get("title")

            if new_img and "/images/P/" not in new_img:
                d["image_url"] = new_img
            elif not d.get("image_url"):
                d["image_url"] = f"https://m.media-amazon.com/images/P/{asin}.jpg"

            if new_title and (is_generic_title or not d.get("title") or d["title"].startswith("Amazon Deal")):
                d["title"] = new_title
                current_title = new_title

            cache[asin] = {
                "image_url": d.get("image_url") if (d.get("image_url") and "/images/P/" not in d.get("image_url")) else None,
                "title": d.get("title") if not (d.get("title") or "").startswith("Amazon Deal") else None,
            }
            cache_dirty = True
            logger.info(f"Resolved Amazon metadata for {asin}: title='{d.get('title')[:40]}...', img={d.get('image_url')}")

        # Re-run brand & category enrichment if brand is missing or default "Amazon"
        real_title = d.get("title") or ""
        if real_title and not real_title.startswith("Amazon Deal"):
            try:
                from dealbot.enricher import detect_brand, detect_category
                current_brand = d.get("brand") or ""
                if not current_brand or current_brand.lower() in ["amazon", "generic", ""]:
                    detected_b = detect_brand(real_title)
                    if detected_b and detected_b.lower() != "amazon":
                        d["brand"] = detected_b
                current_cat = (d.get("category") or "").lower()
                if not current_cat or current_cat in ["deals", "general", "other"]:
                    detected_cat = detect_category(real_title)
                    if detected_cat:
                        d["category"] = detected_cat
            except Exception:
                pass

    if cache_dirty:
        save_image_cache(cache, cache_path)

    # Sort deals so deals with verified images come first
    deals.sort(
        key=lambda x: (
            1 if x.get("image_url") and not is_dummy_pixel(x.get("image_url"), timeout=1.0) else 0,
            x.get("score") or x.get("trending_score") or 0,
        ),
        reverse=True
    )

    return deals
