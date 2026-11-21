// api/sitemap.js
// Dynamic XML sitemap endpoint for BharatBazaro programmatic SEO.
const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const rootDir = path.resolve(__dirname, '..');
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  const today = new Date().toISOString().split('T')[0];

  if (fs.existsSync(sitemapPath)) {
    try {
      const xml = fs.readFileSync(sitemapPath, 'utf8');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('[Sitemap] Failed to read static sitemap:', err);
    }
  }

  // Fallback core sitemap XML
  const coreUrls = [
    'https://bharatbazaro.com/',
    'https://bharatbazaro.com/deals.html',
    'https://bharatbazaro.com/home.html',
    'https://bharatbazaro.com/electronics.html',
    'https://bharatbazaro.com/fashion.html',
    'https://bharatbazaro.com/grocery.html',
    'https://bharatbazaro.com/beauty.html',
    'https://bharatbazaro.com/under-99.html',
    'https://bharatbazaro.com/under-299.html',
    'https://bharatbazaro.com/under-499.html',
    'https://bharatbazaro.com/under-999.html',
    'https://bharatbazaro.com/coupons.html'
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const url of coreUrls) {
    xml += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  }
  xml += `</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
};
