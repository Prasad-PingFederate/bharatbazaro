# finish_seo_upgrade.py — Run inside the `bharatbazaro` repository root
import os
import re
import json
import glob
from datetime import datetime, timedelta

SITE_URL = "https://bharatbazaro.com"
TODAY = datetime.utcnow().strftime("%Y-%m-%d")
VALID_UNTIL = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")

# 1. Locate deals JSON file automatically
deals = []
for candidate in ["deals.json", "data/deals.json", "public/deals.json", "assets/deals.json"]:
    if os.path.exists(candidate):
        try:
            with open(candidate, "r", encoding="utf-8") as f:
                data = json.load(f)
                deals = data if isinstance(data, list) else data.get("deals", data.get("items", []))
            print(f"[✓] Loaded {len(deals)} deals from {candidate}")
            break
        except Exception as e:
            print(f"[!] Could not parse {candidate}: {e}")

# 2. Build Schema.org JSON-LD (INR) + Noscript Pre-render Block for Googlebot India
schema_items = []
noscript_cards = []

for idx, d in enumerate(deals[:30]):
    title = d.get("title") or d.get("name") or "Amazon India Deal"
    price = str(d.get("price") or d.get("deal_price") or d.get("current_price") or "499").replace("₹", "").replace(",", "").strip()
    url = d.get("url") or d.get("link") or SITE_URL
    img = d.get("image") or d.get("img") or f"{SITE_URL}/favicon.ico"
    
    schema_items.append({
        "@type": "ListItem",
        "position": idx + 1,
        "item": {
            "@type": "Product",
            "name": title,
            "image": img,
            "offers": {
                "@type": "Offer",
                "priceCurrency": "INR",
                "price": price if price.replace(".", "").isdigit() else "499",
                "priceValidUntil": VALID_UNTIL,
                "availability": "https://schema.org/InStock",
                "url": url
            }
        }
    })
    noscript_cards.append(f'<li><a href="{url}"><strong>{title}</strong> — Deal Price: ₹{price}</a></li>')

json_ld_block = f"""<!-- SEO-AUTO-START -->
<meta name="geo.region" content="IN" />
<meta name="geo.country" content="IN" />
<link rel="alternate" hreflang="en-in" href="{SITE_URL}/" />
<script type="application/ld+json">
{json.dumps({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "BharatBazaro Live Amazon India Loot Deals & Price Drops",
    "itemListElement": schema_items
}, indent=2)}
</script>
<!-- SEO-AUTO-END -->"""

noscript_block = f"""<!-- PRERENDER-AUTO-START -->
<noscript>
  <section style="padding:20px;">
    <h2>Live Amazon India Loot Deals & Price Drops Today ({TODAY})</h2>
    <ul>{"".join(noscript_cards)}</ul>
  </section>
</noscript>
<div style="text-align:center;font-size:12px;opacity:0.8;padding:10px;">
  As an Amazon Associate I earn from qualifying purchases. Prices & availability are accurate as of {TODAY} IST and are subject to change.
</div>
<!-- PRERENDER-AUTO-END -->"""

# 3. Inject WhatsApp Viral Share helper + Patch all HTML files
whatsapp_js = """<!-- WA-SHARE-START -->
<script>
document.addEventListener("click", function(e) {
  const btn = e.target.closest("[data-wa-share]");
  if (!btn) return;
  const text = btn.getAttribute("data-wa-share");
  window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(text), "_blank");
});
</script>
<!-- WA-SHARE-END -->"""

html_files = glob.glob("*.html")
sitemap_urls = []

for html_file in html_files:
    with open(html_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Update 2025 -> 2026 in Titles and Meta Descriptions
    content = re.sub(r"(<title>.*?)2025(.*?</title>)", r"\g<1>2026\g<2>", content, flags=re.IGNORECASE | re.DOTALL)
    content = re.sub(r'(<meta[^>]*name=["\']description["\'][^>]*content=["\'][^"\']*)2025', r"\g<1>2026", content, flags=re.IGNORECASE)
    content = content.replace("iPhone 15, Samsung S24, OnePlus 12", "iPhone 16, Samsung S25, OnePlus 13 & Top 5G Loot Deals")

    # Strip old auto blocks if re-running
    content = re.sub(r"<!-- SEO-AUTO-START -->.*?<!-- SEO-AUTO-END -->", "", content, flags=re.DOTALL)
    content = re.sub(r"<!-- PRERENDER-AUTO-START -->.*?<!-- PRERENDER-AUTO-END -->", "", content, flags=re.DOTALL)
    content = re.sub(r"<!-- WA-SHARE-START -->.*?<!-- WA-SHARE-END -->", "", content, flags=re.DOTALL)

    if "</head>" in content:
        content = content.replace("</head>", f"{json_ld_block}\n</head>", 1)
    if "</body>" in content:
        content = content.replace("</body>", f"{noscript_block}\n{whatsapp_js}\n</body>", 1)

    with open(html_file, "w", encoding="utf-8") as f:
        f.write(content)

    page_slug = "" if html_file == "index.html" else html_file
    sitemap_urls.append(f"{SITE_URL}/{page_slug}")
    print(f"[✓] Upgraded SEO, Schema & 2026 Metadata in {html_file}")

# 4. Generate sitemap.xml
sitemap_xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for u in sitemap_urls:
    sitemap_xml.append(f"  <url><loc>{u}</loc><lastmod>{TODAY}</lastmod><changefreq>hourly</changefreq><priority>0.9</priority></url>")
sitemap_xml.append("</urlset>")

with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write("\n".join(sitemap_xml))
print("[✓] Generated fresh sitemap.xml")
