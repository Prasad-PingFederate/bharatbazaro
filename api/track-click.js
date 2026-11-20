/**
 * Vercel Serverless Function: POST /api/track-click
 * Lightweight telemetry endpoint for mobile and web click tracking via navigator.sendBeacon.
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
        // raw body or text
      }
    }
    const asin = body?.asin || body?.canonical_id || 'unknown';
    const price = body?.price || 0;
    const timestamp = new Date().toISOString();
    console.log(`[ClickTelemetry] asin=${asin} price=${price} ts=${timestamp}`);
    return res.status(200).json({ status: 'ok', tracked: true, asin, price });
  } catch (err) {
    return res.status(200).json({ status: 'ok', tracked: false });
  }
}
