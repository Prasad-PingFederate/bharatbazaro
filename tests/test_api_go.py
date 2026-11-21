"""
Tests for api/go.py click-telemetry redirector.
"""

import io
import unittest
from api.go import handler, _detect_device, _log_click, _get_db_connection


def simulate_go_request(path, user_agent="Mozilla/5.0", referrer=""):
    h = handler.__new__(handler)
    h.path = path
    h.headers = {"User-Agent": user_agent, "Referer": referrer}
    h.client_address = ("127.0.0.1", 54321)
    status = []
    headers = {}
    h.send_response = lambda s: status.append(s)
    h.send_header = lambda k, v: headers.update({k: v})
    h.end_headers = lambda: None

    h.do_GET()
    return status[0] if status else None, headers


class TestApiGo(unittest.TestCase):
    def test_device_detection(self):
        self.assertEqual(_detect_device("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"), "mobile")
        self.assertEqual(_detect_device("Mozilla/5.0 (Linux; Android 14; Pixel 7)"), "mobile")
        self.assertEqual(_detect_device("Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)"), "tablet")
        self.assertEqual(_detect_device("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "desktop")

    def test_log_click_db(self):
        conn = _get_db_connection()
        self.assertIsNotNone(conn)
        _log_click(
            asin="B0TEST1234",
            channel="whatsapp",
            utm_source="wa_broadcast",
            utm_campaign="diwali_deals",
            subtag="bb-wa",
            device="mobile",
            referrer="https://web.whatsapp.com",
            ip_hash="testhash123",
        )
        with conn:
            row = conn.execute("SELECT * FROM click_telemetry WHERE asin='B0TEST1234' ORDER BY id DESC LIMIT 1").fetchone()
            self.assertIsNotNone(row)
            self.assertEqual(row[1], "B0TEST1234")
            self.assertEqual(row[2], "whatsapp")
            self.assertEqual(row[3], "wa_broadcast")
            self.assertEqual(row[4], "diwali_deals")
            self.assertEqual(row[5], "bb-wa")

    def test_handler_redirect_valid_asin(self):
        status, headers = simulate_go_request("/go/B09V7S1V27?channel=whatsapp&utm_source=wa_share")
        self.assertEqual(status, 302)
        self.assertIn("Location", headers)
        self.assertEqual(
            headers["Location"],
            "https://www.amazon.in/dp/B09V7S1V27?tag=dammaiprasad-21&linkCode=ll1&ascsubtag=bb-whatsapp",
        )

    def test_handler_redirect_query_param_asin(self):
        status, headers = simulate_go_request("/api/go?asin=B07W5691F6&channel=telegram")
        self.assertEqual(status, 302)
        self.assertIn("Location", headers)
        self.assertEqual(
            headers["Location"],
            "https://www.amazon.in/dp/B07W5691F6?tag=dammaiprasad-21&linkCode=ll1&ascsubtag=bb-telegram",
        )

    def test_handler_invalid_asin(self):
        status, headers = simulate_go_request("/go/INVALID")
        self.assertEqual(status, 302)
        self.assertIn("Location", headers)
        self.assertIn("tag=dammaiprasad-21", headers["Location"])


if __name__ == "__main__":
    unittest.main()
