/**
 * Vercel Serverless Function: POST /api/track-click
 * Telemetry endpoint for affiliate click and conversion tracking via navigator.sendBeacon or fetch.
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // raw body fallback
      }
    }
    const asin = String(body?.asin || body?.canonical_id || 'unknown').trim();
    const price = Number(body?.price) || 0;
    const subtag = String(body?.subtag || 'bb-general').trim();
    const channel = String(body?.channel || 'web').trim();
    const action = String(body?.action || 'click_deal').trim();
    const source = String(body?.source || 'direct').trim();
    const couponCode = String(body?.code || '').trim();
    const timestamp = body?.timestamp || new Date().toISOString();
    const referrer = req.headers['referer'] || body?.ref || '';
    const userAgent = req.headers['user-agent'] || '';

    console.log(`[AffiliateClick] asin=${asin} price=${price} subtag=${subtag} channel=${channel} action=${action} source=${source} code=${couponCode} ts=${timestamp}`);

    return res.status(200).json({
      status: 'ok',
      tracked: true,
      asin,
      subtag,
      channel,
      price,
      action,
      timestamp
    });
  } catch (err) {
    return res.status(200).json({ status: 'ok', tracked: false, error: err?.message });
  }
}
