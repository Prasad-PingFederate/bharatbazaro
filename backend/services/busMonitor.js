const { chromium } = require('playwright');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, '../data/bus_history.json');
const ROUTES_FILE = path.join(__dirname, '../data/bus_routes.json');
const CONFIG_FILE = path.join(__dirname, '../data/monitor_config.json');

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
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
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();
    const results = [];

    try {
        console.log(`Checking URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // Wait for bus items to appear using the new class structure or classic one
        // RedBus classes change often, so we try a generic approach or specific known classes
        // Common selector for bus item: .bus-item or .clearfix.bus-item
        try {
            await page.waitForSelector('.bus-item, .bus-item-details', { timeout: 15000 });
        } catch (e) {
            console.log("Timeout waiting for bus items. Might be no buses or different UI.");
        }

        const buses = await page.$$('.bus-item, .bus-item-details'); // Try to catch multiple variations

        for (const bus of buses) {
            try {
                // Selectors might need adjustment based on specific RedBus regional versions
                const travelNameEl = await bus.$('.travels');
                const priceEl = await bus.$('.fare span, .f-19');
                const seatsEl = await bus.$('.seat-left, .column- eight p');

                if (travelNameEl && priceEl) {
                    const name = await travelNameEl.innerText();
                    const priceText = await priceEl.innerText();
                    const seats = seatsEl ? await seatsEl.innerText() : 'Unknown';

                    const price = parseInt(priceText.replace(/[^0-9]/g, ''));

                    results.push({
                        name: name.trim(),
                        price: price,
                        seats: seats.trim()
                    });
                }
            } catch (err) {
                // Skip malformed bus items
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
        const currentBuses = await scrapeRedBus(route.url);
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
                // Check New Seats (simple logic: if it was sold out or 0 and now has seats)
                if ((!oldBus.seats || oldBus.seats.includes('0') || oldBus.seats.toLowerCase().includes('sold')) &&
                    (bus.seats && !bus.seats.includes('0') && !bus.seats.toLowerCase().includes('sold'))) {
                    notifications.push(`SEATS AVAILABLE: ${bus.name} on route ${route.name} now has ${bus.seats}`);
                }
            } else {
                // New Bus found
                notifications.push(`NEW BUS: ${bus.name} found on route ${route.name} for ₹${bus.price}`);
            }
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
    } else {
        console.log("No significant changes found.");
    }
}

module.exports = { checkAndNotify };
