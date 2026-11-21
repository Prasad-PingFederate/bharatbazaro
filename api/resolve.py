# api/resolve.py
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, urljoin
import urllib.request
import urllib.error
import json
import re

AFFILIATE_TAG = "dammaiprasad-21"
ASIN_REGEX = re.compile(r"(?:/dp/|/gp/product/|/gp/aw/d/|/asin/|/d/)([A-Z0-9]{10})", re.I)
URL_EXTRACT_REGEX = re.compile(r"(https?://[^\s]+)", re.I)


class AsinExtractingRedirectHandler(urllib.request.HTTPRedirectHandler):
    """
    Intercepts 301/302 redirects from short-link domains (amzn.in, amzn.to)
    and extracts the 10-char ASIN directly from the Location header.
    Halts redirect following (by returning None) so Amazon WAF/503 blocks on amazon.in
    are completely bypassed.
    """
    def __init__(self):
        super().__init__()
        self.extracted_asin = None
        self.location_url = None

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        loc = headers.get("Location") or newurl
        if loc:
            self.location_url = loc
            m = ASIN_REGEX.search(loc)
            if m:
                self.extracted_asin = m.group(1).upper()
                # Stop following redirects: returning None halts redirection
                return None
        return super().redirect_request(req, fp, code, msg, headers, newurl)


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

        # 1. Check if raw input already has a direct genuine 10-char ASIN (e.g. B0... or ISBN-10)
        direct_asin = re.fullmatch(r"(?:B0[A-Z0-9]{8}|[0-9]{9}[0-9X]|B[A-Z0-9]{9})", raw_input, re.I)
        if direct_asin and re.search(r"\d", raw_input):
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

        # 3. Follow short-link redirect with Location header inspection
        redirect_handler = AsinExtractingRedirectHandler()
        opener = urllib.request.build_opener(redirect_handler)

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
                with opener.open(req, timeout=6) as resp:
                    final_url = resp.geturl()
                    m_final = ASIN_REGEX.search(final_url)
                    if m_final:
                        return self._respond(200, self._payload(m_final.group(1).upper(), subtag, final_url))
                    return self._respond(422, {"error": "Could not extract ASIN from redirected page", "resolved_url": final_url})
            except urllib.error.HTTPError as e:
                loc_hdr = e.headers.get("Location") if e.headers else None
                status_code = e.code
                try:
                    e.close()
                except Exception:
                    pass

                # 1. Did the custom redirect handler extract the ASIN from 301/302 Location header?
                if redirect_handler.extracted_asin:
                    return self._respond(200, self._payload(redirect_handler.extracted_asin, subtag, redirect_handler.location_url or ""))

                # 2. Inspect Location header of the HTTPError directly
                if loc_hdr:
                    m_loc = ASIN_REGEX.search(loc_hdr)
                    if m_loc:
                        return self._respond(200, self._payload(m_loc.group(1).upper(), subtag, loc_hdr))

                if redirect_handler.location_url:
                    m_loc = ASIN_REGEX.search(redirect_handler.location_url)
                    if m_loc:
                        return self._respond(200, self._payload(m_loc.group(1).upper(), subtag, redirect_handler.location_url))

                return self._respond(502, {"error": f"Redirect resolution HTTP error: {status_code}"})
        except Exception as e:
            if redirect_handler.extracted_asin:
                return self._respond(200, self._payload(redirect_handler.extracted_asin, subtag, redirect_handler.location_url or ""))
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
