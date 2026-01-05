const { chromium } = require('playwright');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/bus_history.json');
const ROUTES_FILE = path.join(__dirname, '../data/bus_routes.json');
const CONFIG_FILE = path.join(__dirname, '../data/monitor_config.json');

function loadConfig() {
    // Priority: Environment Variables (Production) > Config File (Local)
    const config = {
        senderEmail: process.env.SENDER_EMAIL,
        senderPassword: process.env.SENDER_PASSWORD,
        notificationEmail: process.env.NOTIFICATION_EMAIL,
        emailService: process.env.EMAIL_SERVICE || 'gmail'
    };

    // If environment variables aren't set, try the config file
    if (!config.senderEmail && fs.existsSync(CONFIG_FILE)) {
        const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...config, ...fileConfig };
    }

    return config;
}

async function sendEmail(to, subject, text) {
    const config = loadConfig();
    if (!config || !config.senderEmail || !config.senderPassword) {
        console.log("Email configuration missing. Skipping notification.");
        return;
    }

    const transporter = nodemailer.createTransport({
        service: config.emailService || 'gmail',
        auth: {
            user: config.senderEmail,
            pass: config.senderPassword
        }
    });

    // Use configured notification email if 'to' is not specified or same as sender
    const recipient = to || config.notificationEmail || config.senderEmail;

    try {
        await transporter.sendMail({
            from: config.senderEmail,
            to: recipient,
            subject: subject,
            text: text
        });
        console.log(`Email sent to ${recipient}`);
    } catch (error) {
        console.error("Failed to send email:", error);
    }
}

async function scrapeRedBus(url) {
    const { devices } = require('playwright');
    const iPhone = devices['iPhone 13 Pro Max'];

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    // Emulate mobile device for a lighter page version
    const context = await browser.newContext({
        ...iPhone,
        locale: 'en-IN',
        geolocation: { longitude: 77.5946, latitude: 12.9716 }, // Bangalore
        permissions: ['geolocation']
    });

    const page = await context.newPage();

    // Intercept network activity to block heavy resources (Images, Media, Ads)
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        const rUrl = route.request().url();

        // Block images, fonts, media, and common trackers
        if (['image', 'font', 'media'].includes(type) ||
            rUrl.includes('google-analytics') ||
            rUrl.includes('facebook') ||
            rUrl.includes('doubleclick')) {
            return route.abort();
        }
        return route.continue();
    });

    const results = [];

    try {
        console.log(`Checking URL (Advanced Playwright): ${url}`);

        // Navigate with a generous timeout, but using domcontentloaded for speed
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

        console.log("Initial load complete. Waiting for bus listings...");

        // Auto-wait for the main results container
        try {
            await page.waitForSelector('li[class*="tupleWrapper"]', { timeout: 40000 });
        } catch (e) {
            console.log("Timeout waiting for bus listings. Attempting a small scroll...");
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(5000);

            const exists = await page.$('li[class*="tupleWrapper"]');
            if (!exists) {
                console.log("No buses found even after scroll. Title:", await page.title());
                return [];
            }
        }

        // Scroll a bit to trigger lazy loading if necessary
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(2000);

        const buses = await page.$$('li[class*="tupleWrapper"]');
        console.log(`Found ${buses.length} buses on page.`);

        for (const bus of buses) {
            try {
                // Multi-platform selectors for travels name, price, and seats
                const travelNameEl = await bus.$('div[class*="travelsName"], div[class*="travels"], .travels');
                const priceEl = await bus.$('div[class*="fareWrapper"] span, div[class*="fareWrapper"], p[class*="price"], .fare');
                const seatsEl = await bus.$('div[class*="seatsWrap"], .seat-left, .column-eight p, div[class*="seats"]');

                if (travelNameEl && priceEl) {
                    const name = await travelNameEl.innerText();
                    const priceText = await priceEl.innerText();
                    const seats = seatsEl ? await seatsEl.innerText() : 'Unknown';

                    // Extract digits from price (handles symbols like ₹)
                    const price = parseInt(priceText.replace(/[^0-9]/g, ''));

                    results.push({
                        name: name.trim(),
                        price: price,
                        seats: seats.trim()
                    });
                }
            } catch (err) {
                // Skip individual items if they fail to parse
                continue;
            }
        }

    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
    } finally {
        await browser.close();
    }
    return results;
}

async function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
}

async function saveHistory(data) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

async function checkAndNotify() {
    console.log("Starting Bus Check Job...");

    if (!fs.existsSync(ROUTES_FILE)) {
        console.log("No routes file found.");
        return;
    }

    const routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));
    const history = await loadHistory();
    const updates = {};
    let notifications = [];

    for (const route of routes) {
        try {
            console.log(`Processing route: ${route.name}`);
            const currentBuses = await scrapeRedBus(route.url);

            if (!currentBuses || currentBuses.length === 0) {
                console.log(`No data found for route ${route.name}. Skipping comparison.`);
                continue;
            }

            const lastRunBuses = history[route.id] || [];
            updates[route.id] = currentBuses;

            // Compare logic
            for (const bus of currentBuses) {
                const oldBus = lastRunBuses.find(b => b.name === bus.name);

                if (oldBus) {
                    // Check Price Drop
                    if (bus.price < oldBus.price) {
                        notifications.push(`PRICE DROP: ${bus.name} on route ${route.name} is now ₹${bus.price} (was ₹${oldBus.price})`);
                    }
                    // Check New Seats
                    if ((!oldBus.seats || oldBus.seats.includes('0') || oldBus.seats.toLowerCase().includes('sold')) &&
                        (bus.seats && !bus.seats.includes('0') && !bus.seats.toLowerCase().includes('sold'))) {
                        notifications.push(`SEATS AVAILABLE: ${bus.name} on route ${route.name} now has ${bus.seats}`);
                    }
                } else {
                    // New Bus found
                    notifications.push(`NEW BUS: ${bus.name} found on route ${route.name} for ₹${bus.price}`);
                }
            }
        } catch (routeError) {
            console.error(`Failed to process route ${route.id}:`, routeError.message);
        }
    }

    await saveHistory(updates);

    if (notifications.length > 0) {
        console.log("Sending notifications:", notifications);
        await sendEmail(
            null, // Let sendEmail use the configured notification email
            "Bus Fare/Seat Alert!",
            notifications.join('\n')
        );

        // Save to logs for Frontend
        const logsPath = path.join(__dirname, '../data/bus_logs.json');
        let logs = [];
        if (fs.existsSync(logsPath)) {
            logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        }

        const newEntries = notifications.map(text => ({
            timestamp: new Date().toISOString(),
            message: text,
            type: text.includes('PRICE DROP') ? 'price' : (text.includes('SEATS') ? 'seats' : 'new')
        }));

        logs = [...newEntries, ...logs].slice(0, 50); // Keep last 50
        fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2));
    } else {
        console.log("No significant changes found.");
    }
}

module.exports = { checkAndNotify };
