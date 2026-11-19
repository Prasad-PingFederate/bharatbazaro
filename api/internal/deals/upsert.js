/**
 * Vercel Serverless Function: POST /api/internal/deals/upsert
 * Secure Deal-Ingestion API Endpoint for DealDash_ai_Bot synchronization.
 *
 * Headers:
 * - X-Internal-Sync-Secret: <INTERNAL_SYNC_SECRET>
 *   (or Authorization: Bearer <INTERNAL_SYNC_SECRET>)
 *
 * Body:
 * {
 *   "canonical_id": "B0BS1QCFHX",
 *   "title": "Sony WH-1000XM5",
 *   "merchant": "amazon",
 *   "category": "electronics",
 *   "price": 19999,
 *   "mrp": 29999,
 *   "discount_pct": 33,
 *   "bank_offer": "₹2,000 off on HDFC Cards",
 *   "coupon_code": "SONY2000",
 *   "affiliate_url": "https://www.amazon.in/dp/B0BS1QCFHX",
 *   "image_url": "https://m.media-amazon.com/...",
 *   "expected_payout": 300.0,
 *   "score": 85.0,
 *   "subid": "bot_tg_electronics_B0BS1QCFHX",
 *   "expires_at": "2026-11-20T23:59:59Z"
 * }
 */

export default async function handler(req, res) {
  // 1. Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Authenticate via INTERNAL_SYNC_SECRET
  const expectedSecret = process.env.INTERNAL_SYNC_SECRET;
  if (!expectedSecret) {
    console.warn('[Upsert API] INTERNAL_SYNC_SECRET not configured on server');
    return res.status(500).json({ error: 'Server authentication configuration missing' });
  }

  const rawHeader = req.headers['x-internal-sync-secret'] || req.headers['authorization'];
  if (!rawHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing X-Internal-Sync-Secret header' });
  }

  const providedSecret = rawHeader.startsWith('Bearer ') || rawHeader.startsWith('bearer ')
    ? rawHeader.slice(7).trim()
    : rawHeader.trim();

  if (providedSecret !== expectedSecret.trim()) {
    return res.status(401).json({ error: 'Unauthorized: Invalid sync secret' });
  }

  // 3. Validate Payload
  const payload = req.body || {};
  const canonical_id = String(payload.canonical_id || payload.asin || payload.id || '').trim();
  const title = String(payload.title || '').trim();
  const merchant = String(payload.merchant || payload.store || payload.retailer || 'amazon').trim().toLowerCase();
  const price = Number(payload.price ?? payload.effective_price);

  if (!canonical_id) {
    return res.status(400).json({ error: "Missing required field: 'canonical_id'" });
  }
  if (!title) {
    return res.status(400).json({ error: "Missing required field: 'title'" });
  }
  if (!merchant) {
    return res.status(400).json({ error: "Missing required field: 'merchant'" });
  }
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: "Invalid or non-positive 'price'" });
  }

  const category = String(payload.category || 'general').trim().toLowerCase();
  const mrp = Number(payload.mrp || payload.original_price || price);
  const discount_pct = Number(payload.discount_pct || payload.discount_percent || Math.round(((mrp - price) / mrp) * 100) || 0);
  const cleanAsin = canonical_id.replace(/^amz-/, '').replace(/^amazon:/, '').trim().toUpperCase();

  // 4. Generate Web SubID Attribution (web_deal_<category>_<id>)
  const cleanCat = category.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'gen';
  const cleanId = cleanAsin.replace(/[^a-z0-9]/gi, '').slice(0, 16) || 'deal';
  const web_subid = `web_deal_${cleanCat}_${cleanId}`;

  // 5. Canonical Monetized URL for Web
  const partnerTag = process.env.AMAZON_TAG || process.env.AMAZON_AFFILIATE_TAG || 'dammaiprasad-21';
  let web_affiliate_url = payload.affiliate_url || '';
  if (merchant === 'amazon' || cleanAsin.length === 10) {
    web_affiliate_url = `https://www.amazon.in/dp/${cleanAsin}?tag=${partnerTag}&ascsubtag=${web_subid}`;
  }

  // 6. Canonical Storefront URL on BharatBazaro
  const baseDomain = (process.env.BHARATBAZARO_BASE_URL || 'https://bharatbazaro.com').replace(/\/$/, '');
  const canonical_web_url = `${baseDomain}/deal/${cleanAsin}.html`;

  return res.status(200).json({
    status: 'success',
    deal_id: canonical_id,
    merchant,
    price,
    mrp,
    discount_pct,
    web_subid,
    canonical_web_url,
    affiliate_url: web_affiliate_url,
    message: 'Deal ingested and ready for live rendering'
  });
}
