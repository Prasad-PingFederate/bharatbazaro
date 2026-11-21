# api/resolve.py
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import urllib.error
import json
import re

AFFILIATE_TAG = "dammaiprasad-21"
ASIN_REGEX = re.compile(r"(?:/dp/|/gp/product/|/gp/aw/d/|/asin/|/d/)([A-Z0-9]{10})", re.I)
URL_EXTRACT_REGEX = re.compile(r"(https?://[^\s]+)", re.I)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        # Support both 'input' and 'url' query parameters
        raw_input = (query.get("input", [""])[0] or query.get("url", [""])[0]).strip()
        subtag = (query.get("subtag", ["bb-analyzer"])[0]).strip() or "bb-analyzer"

        if not raw_input:
            return self._respond(400, {"error": "Missing input or url parameter"})

        # 1. Check if raw input already has a direct 10-char ASIN
        direct_asin = re.fullmatch(r"[A-Z0-9]{10}", raw_input, re.I)
        if direct_asin:
            return self._respond(200, self._payload(direct_asin.group(0).upper(), subtag))

        # Check if ASIN pattern exists in raw input string
        m_asin = ASIN_REGEX.search(raw_input)
        if m_asin:
            return self._respond(200, self._payload(m_asin.group(1).upper(), subtag))

        # 2. Extract URL from pasted Amazon mobile app share text
        m_url = URL_EXTRACT_REGEX.search(raw_input)
        if not m_url:
            return self._respond(400, {"error": "No valid Amazon link or ASIN found"})

        target_url = m_url.group(1).strip()
        parsed_host = urlparse(target_url).netloc.lower()
        if not any(d in parsed_host for d in ("amazon.in", "amzn.in", "amzn.to", "amzn.eu", "amazon.com")):
            return self._respond(400, {"error": "Only Amazon links are supported"})

        # 3. Follow short-link redirect server-side to extract real ASIN
        try:
            req = urllib.request.Request(
                target_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            )
            try:
                with urllib.request.urlopen(req, timeout=6) as resp:
                    final_url = resp.geturl()
                    m_final = ASIN_REGEX.search(final_url)
                    if m_final:
                        return self._respond(200, self._payload(m_final.group(1).upper(), subtag, final_url))
                    return self._respond(422, {"error": "Could not extract ASIN from redirected page", "resolved_url": final_url})
            except urllib.error.HTTPError as e:
                # If redirected with 301/302, inspect Location header
                loc = e.headers.get("Location") if e.headers else None
                if loc:
                    m_loc = ASIN_REGEX.search(loc)
                    if m_loc:
                        return self._respond(200, self._payload(m_loc.group(1).upper(), subtag, loc))
                return self._respond(502, {"error": f"Redirect resolution HTTP error: {e.code}"})
        except Exception as e:
            return self._respond(502, {"error": f"Redirect resolution failed: {str(e)}"})

    def _payload(self, asin: str, subtag: str, resolved_url: str = ""):
        clean_url = f"https://www.amazon.in/dp/{asin}?tag={AFFILIATE_TAG}&linkCode=ll1&ascsubtag={subtag}"
        res = {"asin": asin, "affiliate_url": clean_url}
        if resolved_url:
            res["resolved_url"] = resolved_url
        return res

    def _respond(self, status: int, data: dict):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))
