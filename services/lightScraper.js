const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Lightweight HTTP-based scraper for RedBus (no browser needed!)
 * Uses only 10-20MB RAM vs Chromium's 300MB+
 */
async function scrapeRedBusLight(url) {
    const results = [];

    try {
        console.log(`[Light Scraper] Fetching: ${url}`);

        // Fetch the page HTML
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        // Try to extract bus data from the HTML
        // RedBus uses server-side rendering for initial data
        const busItems = $('li[class*="bus-item"], div[class*="bus-item"], .bus-items li').toArray();

        console.log(`[Light Scraper] Found ${busItems.length} potential bus elements`);

        for (const item of busItems) {
            try {
                const $item = $(item);

                // Extract bus name
                const name = $item.find('[class*="travels"], [class*="operator-name"], .travels-name').first().text().trim();

                // Extract price
                const priceText = $item.find('[class*="fare"], [class*="price"], .fare, .price').first().text().trim();
                const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;

                // Extract seats
                const seatsText = $item.find('[class*="seat"], .seats-available').first().text().trim();

                if (name && price > 0) {
                    results.push({
                        name: name,
                        price: price,
                        seats: seatsText || 'Unknown'
                    });
                }
            } catch (err) {
                continue;
            }
        }

        // If no results, try alternative selectors
        if (results.length === 0) {
            console.log('[Light Scraper] No results with standard selectors, trying alternatives...');

            // Look for JSON data embedded in the page
            const scripts = $('script').toArray();
            for (const script of scripts) {
                const content = $(script).html();
                if (content && content.includes('busData') || content.includes('buses')) {
                    // Try to extract JSON
                    const jsonMatch = content.match(/\{[\s\S]*"buses"[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const data = JSON.parse(jsonMatch[0]);
                            // Process JSON data if found
                            console.log('[Light Scraper] Found embedded JSON data');
                        } catch (e) {
                            // JSON parsing failed, continue
                        }
                    }
                }
            }
        }

        console.log(`[Light Scraper] Extracted ${results.length} buses`);

    } catch (error) {
        console.error(`[Light Scraper] Error: ${error.message}`);
    }

    return results;
}

module.exports = { scrapeRedBusLight };
