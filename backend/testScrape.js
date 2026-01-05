const { chromium } = require('playwright');

async function testScrape(url) {
    console.log(`Testing scraper for URL: ${url}`);

    // Launch with HTTP/2 disabled to avoid protocol errors
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-http2']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }
    });

    const page = await context.newPage();
    const results = [];

    try {
        console.log("Navigating (HTTP/2 Disabled)...");
        // Using 'domcontentloaded' can sometimes be faster and more reliable for scraping
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log("Waiting for rendering...");
        await page.waitForTimeout(7000); // Give it plenty of time

        // Take a screenshot for debugging if it fails
        await page.screenshot({ path: 'debug_redbus.png' });

        const busSelector = 'li[class*="tupleWrapper"]';
        const exists = await page.$(busSelector);

        if (!exists) {
            console.log("No bus listings found with the current selector. Checking page title...");
            console.log("Title:", await page.title());
            await browser.close();
            return [];
        }

        const buses = await page.$$(busSelector);
        console.log(`Found ${buses.length} buses.`);

        for (const bus of buses.slice(0, 5)) {
            const travelNameEl = await bus.$('div[class*="travelsName"]');
            const priceEl = await bus.$('div[class*="fareWrapper"] span, div[class*="fareWrapper"]');
            const seatsEl = await bus.$('div[class*="seatsWrap"]');

            if (travelNameEl && priceEl) {
                const name = await travelNameEl.innerText();
                const priceText = await priceEl.innerText();
                const seats = seatsEl ? await seatsEl.innerText() : 'Unknown';
                const price = parseInt(priceText.replace(/[^0-9]/g, ''));

                console.log(`- ${name.trim()}: ₹${price} (${seats.trim()})`);
                results.push({ name: name.trim(), price, seats: seats.trim() });
            }
        }

    } catch (error) {
        console.error("Scraping error details:", error);
    } finally {
        await browser.close();
    }
    return results;
}

// Using a fresh URL
const testUrl = "https://www.redbus.in/bus-tickets/bangalore-to-naidupeta?fromCityName=Bangalore&fromCityId=122&onward=10-Jan-2026";
testScrape(testUrl).then(res => {
    console.log(`Test complete. Scraping logic ${res.length > 0 ? 'SUCCESSFUL' : 'FAILED'}.`);
});
