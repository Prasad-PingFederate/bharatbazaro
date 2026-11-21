/**
 * BharatBazaro URL & Shortlink Resolver API
 * Resolves shortened Amazon India URLs (amzn.in, amzn.to), mobile share strings, or direct ASINs
 * Inspects 301/302 Location headers without following all the way to amazon.in to avoid WAF/503 blocks.
 * Returns canonical affiliate URL with tag=dammaiprasad-21&linkCode=ll1&ascsubtag={subtag}
 */

const AFFILIATE_TAG = 'dammaiprasad-21';
const ASIN_REGEX = /(?:\/dp\/|\/gp\/product\/|\/gp\/aw\/d\/|\/asin\/|\/d\/)([A-Z0-9]{10})/i;
const URL_EXTRACT_REGEX = /(https?:\/\/[^\s]+)/i;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawInput = (req.query.input || req.query.url || '').trim();
  const subtag = (req.query.subtag || 'bb-analyzer').trim() || 'bb-analyzer';

  if (!rawInput) {
    return res.status(400).json({ error: 'Missing input or url parameter' });
  }

  // 1. Direct 10-char ASIN check
  if (/^[A-Z0-9]{10}$/i.test(rawInput)) {
    const asin = rawInput.toUpperCase();
    return res.status(200).json(payload(asin, subtag));
  }

  // 2. ASIN pattern match in raw string
  const directMatch = rawInput.match(ASIN_REGEX);
  if (directMatch) {
    const asin = directMatch[1].toUpperCase();
    return res.status(200).json(payload(asin, subtag));
  }

  // 3. Extract URL from pasted Amazon mobile app share text
  const urlMatch = rawInput.match(URL_EXTRACT_REGEX);
  if (!urlMatch) {
    return res.status(400).json({ error: 'No valid Amazon link or ASIN found' });
  }

  const targetUrl = urlMatch[1].trim();
  const lowerUrl = targetUrl.toLowerCase();
  if (!lowerUrl.includes('amazon.in') && !lowerUrl.includes('amzn.in') && !lowerUrl.includes('amzn.to') && !lowerUrl.includes('amzn.eu') && !lowerUrl.includes('amazon.com')) {
    return res.status(400).json({ error: 'Only Amazon links are supported' });
  }

  // 4. Follow short-link redirect server-side with Location inspection
  try {
    let currentUrl = targetUrl;
    let finalUrl = targetUrl;
    let extractedAsin = null;

    for (let hop = 0; hop < 5; hop++) {
      const resp = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const loc = resp.headers.get('location');
      if (loc) {
        const fullLoc = new URL(loc, currentUrl).href;
        finalUrl = fullLoc;
        const locMatch = fullLoc.match(ASIN_REGEX);
        if (locMatch) {
          extractedAsin = locMatch[1].toUpperCase();
          break; // ASIN extracted from 301/302 Location header; stop immediately to avoid WAF
        }
        currentUrl = fullLoc;
        continue;
      }

      finalUrl = resp.url || currentUrl;
      const finalMatch = finalUrl.match(ASIN_REGEX);
      if (finalMatch) {
        extractedAsin = finalMatch[1].toUpperCase();
      }
      break;
    }

    if (extractedAsin) {
      return res.status(200).json(payload(extractedAsin, subtag, finalUrl));
    }

    return res.status(422).json({
      error: 'Could not extract ASIN from redirected page',
      resolved_url: finalUrl
    });
  } catch (err) {
    return res.status(502).json({ error: `Redirect resolution failed: ${err.message || String(err)}` });
  }
}

function payload(asin, subtag, resolvedUrl = '') {
  const cleanUrl = `https://www.amazon.in/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ll1&ascsubtag=${encodeURIComponent(subtag)}`;
  const res = { asin, affiliate_url: cleanUrl };
  if (resolvedUrl) res.resolved_url = resolvedUrl;
  return res;
}
