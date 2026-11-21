# api/go.py
"""
High-Performance Universal Click-Telemetry Redirector (/go/[asin])
Preserves Amazon Associate Tag (tag=dammaiprasad-21)
Captures channel attribution (whatsapp, telegram, reddit, x, website, bot)
Logs telemetry asynchronously to data/state.sqlite3 and returns an instant HTTP 302 redirect.
"""

from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import hashlib
import os
import re
import sqlite3
import time

AFFILIATE_TAG = "dammaiprasad-21"
ASIN_REGEX = re.compile(r"^[A-Z0-9]{10}$", re.I)

# Channel normalization mapping
CHANNEL_MAP = {
    "wa": "whatsapp",
    "whatsapp": "whatsapp",
    "tg": "telegram",
    "telegram": "telegram",
    "rd": "reddit",
    "reddit": "reddit",
    "x": "x",
    "twitter": "x",
    "fb": "facebook",
    "facebook": "facebook",
    "ig": "instagram",
    "instagram": "instagram",
    "bot": "bazarai_bot",
    "bazarai": "bazarai_bot",
    "web": "website",
    "site": "website",
    "grid": "website_grid",
    "sticky": "deal_page_sticky",
    "deal_page": "deal_page",
}


def _get_db_connection():
    # Resolve data/state.sqlite3 relative to project root
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "data", "state.sqlite3")
    try:
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = sqlite3.connect(db_path, timeout=5.0)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS click_telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                asin TEXT NOT NULL,
                channel TEXT DEFAULT 'web',
                utm_source TEXT DEFAULT '',
                utm_campaign TEXT DEFAULT '',
                subtag TEXT DEFAULT 'bb-go',
                device TEXT DEFAULT 'unknown',
                referrer TEXT DEFAULT '',
                ip_hash TEXT DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_clicks_asin ON click_telemetry(asin)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_clicks_channel ON click_telemetry(channel)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_clicks_created ON click_telemetry(created_at)")
        return conn
    except Exception:
        return None


def _log_click(asin, channel, utm_source, utm_campaign, subtag, device, referrer, ip_hash):
    conn = _get_db_connection()
    if conn is None:
        return
    try:
        with conn:
            conn.execute(
                """
                INSERT INTO click_telemetry 
                (asin, channel, utm_source, utm_campaign, subtag, device, referrer, ip_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (asin, channel, utm_source, utm_campaign, subtag, device, referrer, ip_hash),
            )
    except Exception:
        pass
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _detect_device(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if any(m in ua for m in ("iphone", "ipod", "android", "mobile", "blackberry", "windows phone")):
        return "mobile"
    if "ipad" in ua or "tablet" in ua:
        return "tablet"
    return "desktop"


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        # 1. Extract ASIN from query param or path
        asin = (query.get("asin", [""])[0]).strip().upper()
        if not asin:
            m = re.search(r"/(?:go|a)/([A-Za-z0-9]{10})", parsed.path, re.I)
            if m:
                asin = m.group(1).upper()

        if not asin or not ASIN_REGEX.match(asin):
            # Fallback redirect to homepage
            self.send_response(302)
            self.send_header("Location", f"https://www.amazon.in/?tag={AFFILIATE_TAG}&ascsubtag=bb-invalid")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            return

        # 2. Channel & Attribution Extraction
        raw_channel = (query.get("channel", [""])[0]).strip().lower()
        utm_source = (query.get("utm_source", [""])[0]).strip().lower()
        utm_campaign = (query.get("utm_campaign", [""])[0]).strip()
        raw_subtag = (query.get("subtag", [""])[0]).strip()

        channel = CHANNEL_MAP.get(raw_channel) or CHANNEL_MAP.get(utm_source) or "website"
        subtag = raw_subtag or f"bb-{channel}"
        subtag = re.sub(r"[^a-zA-Z0-9_\-]", "", subtag)[:50] or "bb-go"

        # 3. Device & Referrer Telemetry
        user_agent = self.headers.get("User-Agent", "")
        device = _detect_device(user_agent)
        referrer = self.headers.get("Referer", "")

        client_ip = self.headers.get("x-forwarded-for", self.client_address[0] if self.client_address else "")
        ip_hash = hashlib.sha256(client_ip.split(",")[0].strip().encode("utf-8")).hexdigest()[:12] if client_ip else ""

        # 4. Asynchronously log telemetry
        try:
            _log_click(asin, channel, utm_source, utm_campaign, subtag, device, referrer, ip_hash)
        except Exception:
            pass

        # 5. Build Canonical Amazon App & Web Affiliate URL
        dest_url = f"https://www.amazon.in/dp/{asin}?tag={AFFILIATE_TAG}&linkCode=ll1&ascsubtag={subtag}"

        self.send_response(302)
        self.send_header("Location", dest_url)
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
