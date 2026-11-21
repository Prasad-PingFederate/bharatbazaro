import io
import json
from unittest.mock import patch, MagicMock
from api.resolve import handler


def simulate_request(path, method="GET"):
    h = handler.__new__(handler)
    h.path = path
    h.wfile = io.BytesIO()
    status = []
    headers = {}
    h.send_response = lambda s: status.append(s)
    h.send_header = lambda k, v: headers.update({k: v})
    h.end_headers = lambda: None

    if method == "OPTIONS":
        h.do_OPTIONS()
        return status[0] if status else 200, {}, headers

    h.do_GET()
    h.wfile.seek(0)
    raw = h.wfile.read()
    data = json.loads(raw.decode("utf-8")) if raw else {}
    return status[0] if status else None, data, headers


def test_resolve_direct_asin():
    status, data, headers = simulate_request("/api/resolve?input=B08WRBG3XW")
    assert status == 200
    assert data["asin"] == "B08WRBG3XW"
    assert "tag=dammaiprasad-21" in data["affiliate_url"]
    assert "ascsubtag=bb-analyzer" in data["affiliate_url"]
    assert headers["Access-Control-Allow-Origin"] == "*"


def test_resolve_with_custom_subtag():
    status, data, headers = simulate_request("/api/resolve?input=B08WRBG3XW&subtag=my-custom-tag")
    assert status == 200
    assert data["asin"] == "B08WRBG3XW"
    assert "ascsubtag=my-custom-tag" in data["affiliate_url"]


def test_resolve_with_url_parameter_fallback():
    status, data, headers = simulate_request("/api/resolve?url=B08WRBG3XW")
    assert status == 200
    assert data["asin"] == "B08WRBG3XW"


def test_resolve_embedded_url_in_input():
    url = "https://www.amazon.in/dp/B08WRBG3XW/ref=olp-opf-redir"
    status, data, _ = simulate_request(f"/api/resolve?input={url}")
    assert status == 200
    assert data["asin"] == "B08WRBG3XW"


def test_resolve_app_share_text():
    text = "Limited-time deal: boAt Rockerz 450 Bluetooth Headphones https://www.amazon.in/dp/B08WRBG3XW check it out!"
    status, data, _ = simulate_request(f"/api/resolve?input={text}")
    assert status == 200
    assert data["asin"] == "B08WRBG3XW"


def test_resolve_missing_input():
    status, data, _ = simulate_request("/api/resolve")
    assert status == 400
    assert "Missing input" in data["error"]


def test_resolve_non_amazon_link():
    status, data, _ = simulate_request("/api/resolve?input=https://www.flipkart.com/item/123")
    assert status == 400
    assert "Only Amazon links are supported" in data["error"]


def test_resolve_shortlink_redirect_success():
    mock_resp = MagicMock()
    mock_resp.geturl.return_value = "https://www.amazon.in/boAt-Rockerz-450-Bluetooth-Headphones/dp/B08WRBG3XW/ref=sr_1_1"
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        status, data, _ = simulate_request("/api/resolve?input=https://amzn.in/d/xyz123")
        assert status == 200
        assert data["asin"] == "B08WRBG3XW"
        assert "tag=dammaiprasad-21" in data["affiliate_url"]
        assert data["resolved_url"] == mock_resp.geturl.return_value


def test_resolve_shortlink_redirect_no_asin():
    mock_resp = MagicMock()
    mock_resp.geturl.return_value = "https://www.amazon.in/not-a-product-page"
    mock_resp.__enter__.return_value = mock_resp

    with patch("urllib.request.urlopen", return_value=mock_resp):
        status, data, _ = simulate_request("/api/resolve?input=https://amzn.in/d/invalid")
        assert status == 422
        assert "Could not extract ASIN" in data["error"]


def test_resolve_shortlink_network_failure():
    with patch("urllib.request.urlopen", side_effect=Exception("Connection timed out")):
        status, data, _ = simulate_request("/api/resolve?input=https://amzn.in/d/timeout")
        assert status == 502
        assert "Redirect resolution failed" in data["error"]


def test_resolve_options_preflight():
    status, _, headers = simulate_request("/api/resolve", method="OPTIONS")
    assert status == 200
    assert headers["Access-Control-Allow-Origin"] == "*"
    assert "GET" in headers["Access-Control-Allow-Methods"]
