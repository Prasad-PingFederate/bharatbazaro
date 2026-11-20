/**
 * BharatBazaro URL Resolver API
 * Resolves shortened Amazon India URLs (amzn.in, amzn.to) to extract canonical ASIN
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const rawUrl = decodeURIComponent(url).trim();
    if (!rawUrl.includes('amazon') && !rawUrl.includes('amzn')) {
      return res.status(400).json({ error: 'Only Amazon URLs are supported' });
    }

    // Direct check if ASIN already present in URL
    const directMatch = rawUrl.match(/(?:dp|gp\/product|\/d\/)\/([A-Z0-9]{10})/i);
    if (directMatch) {
      const asin = directMatch[1].toUpperCase();
      return res.status(200).json({
        resolved_url: rawUrl,
        asin: asin,
        affiliate_url: `https://www.amazon.in/dp/${asin}?tag=dammaiprasad-21&linkCode=ll1&ascsubtag=link_analyzer`
      });
    }

    // Follow redirect for shortened links (amzn.in / amzn.to)
    const resp = await fetch(rawUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const finalUrl = resp.url || rawUrl;
    const match = finalUrl.match(/(?:dp|gp\/product|\/d\/)\/([A-Z0-9]{10})/i);
    const asin = match ? match[1].toUpperCase() : null;

    return res.status(200).json({
      original_url: rawUrl,
      resolved_url: finalUrl,
      asin: asin,
      affiliate_url: asin ? `https://www.amazon.in/dp/${asin}?tag=dammaiprasad-21&linkCode=ll1&ascsubtag=link_analyzer` : null
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to resolve URL' });
  }
}
