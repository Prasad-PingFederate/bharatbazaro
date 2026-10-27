const axios = require('axios');

/**
 * Ultra-lightweight RedBus API scraper
 * Uses RedBus's internal API instead of scraping HTML
 */
async function scrapeRedBusAPI(url) {
    const results = [];

    try {
        // Extract route info from URL
        const urlParams = new URL(url);
        const pathParts = urlParams.pathname.split('/');
        const routeSlug = pathParts[pathParts.length - 1]; // e.g., "bangalore-to-naidupeta"

        // Get date from URL params
        const onwardDate = urlParams.searchParams.get('onward') || new Date().toISOString().split('T')[0];

        console.log(`[API Scraper] Route: ${routeSlug}, Date: ${onwardDate}`);

        // Try RedBus's search API (this is what their website uses)
        const apiUrl = `https://www.redbus.in/search/getBusesFromSearchResults`;

        const response = await axios.post(apiUrl, {
            source: routeSlug.split('-to-')[0],
            destination: routeSlug.split('-to-')[1],
            onwardDate: onwardDate
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        if (response.data && response.data.buses) {
            const buses = response.data.buses;
            console.log(`[API Scraper] Found ${buses.length} buses via API`);

            for (const bus of buses.slice(0, 20)) { // Limit to first 20
                results.push({
                    name: bus.travels || bus.operatorName || 'Unknown',
                    price: parseInt(bus.fare || bus.minFare || 0),
                    seats: bus.availableSeats || bus.seatsAvailable || 'Unknown'
                });
            }
        }

    } catch (error) {
        console.error(`[API Scraper] Error: ${error.message}`);
    }

    return results;
}

module.exports = { scrapeRedBusAPI };
