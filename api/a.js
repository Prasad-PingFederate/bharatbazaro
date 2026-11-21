/**
 * api/a.js
 * Vercel Serverless Function: HTTP 302 Shortlink Redirect (/a/[asin])
 */

const AFFILIATE_TAG = 'dammaiprasad-21';
const ASIN_REGEX = /^[A-Z0-9]{10}$/i;

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'bharatbazaro.com'}`);
  let asin = (url.searchParams.get('asin') || '').trim().toUpperCase();

  if (!asin) {
    const m = url.pathname.match(/\/(?:a|go)\/([A-Za-z0-9]{10})/i);
    if (m) asin = m[1].toUpperCase();
  }

  if (!asin || !ASIN_REGEX.test(asin)) {
    return res.redirect(302, `https://www.amazon.in/?tag=${AFFILIATE_TAG}&ascsubtag=bb-invalid`);
  }

  const rawChannel = (url.searchParams.get('channel') || url.searchParams.get('utm_source') || 'web').toLowerCase();
  const rawSubtag = (url.searchParams.get('subtag') || url.searchParams.get('ascsubtag') || `bb-${rawChannel}`).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 50) || 'bb-short';

  // Server-side click log
  try {
    const referer = req.headers['referer'] || '';
    const userAgent = req.headers['user-agent'] || '';
    console.log(JSON.stringify({
      event: 'affiliate_shortlink_click',
      asin,
      subtag: rawSubtag,
      referer,
      userAgent,
      timestamp: new Date().toISOString()
    }));
  } catch (_) {}

  const destUrl = `https://www.amazon.in/dp/${asin}?tag=${AFFILIATE_TAG}&linkCode=ll1&ascsubtag=${encodeURIComponent(rawSubtag)}`;

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.redirect(302, destUrl);
}
