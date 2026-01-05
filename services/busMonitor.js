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
        try {
            const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            return { ...config, ...fileConfig };
        } catch (e) {
            console.error("Error reading config file:", e);
        }
    }

    return config;
}

async function logActivity(message, type = 'new') {
    const logsPath = path.join(__dirname, '../data/bus_logs.json');
    let logs = [];
    try {
        if (fs.existsSync(logsPath)) {
            logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        }
        logs.unshift({
            timestamp: new Date().toISOString(),
            message,
            type
        });
        fs.writeFileSync(logsPath, JSON.stringify(logs.slice(0, 100), null, 2));
    } catch (e) {
        console.error("Failed to write to activity logs:", e);
    }
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
    let browser;
    const results = [];

    try {
        console.log("Launching Chromium...");
        browser = await chromium.launch({
            headless: true,
            args: ['--disable-http2', '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
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

        console.log(`Checking URL: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });

        // Auto-wait for the main results container
        try {
            await page.waitForSelector('li[class*="tupleWrapper"]', { timeout: 40000 });
        } catch (e) {
            console.log("Timeout waiting for bus listings. Attempting scroll...");
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(5000);
            const exists = await page.$('li[class*="tupleWrapper"]');
            if (!exists) {
                console.log("No buses found. Title:", await page.title());
                return [];
            }
        }

        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(2000);

        const buses = await page.$$('li[class*="tupleWrapper"]');
        console.log(`Found ${buses.length} buses.`);

        for (const bus of buses) {
            try {
                const travelNameEl = await bus.$('div[class*="travelsName"], div[class*="travels"], .travels');
                const priceEl = await bus.$('div[class*="fareWrapper"] span, div[class*="fareWrapper"], p[class*="price"], .fare');
                const seatsEl = await bus.$('div[class*="seatsWrap"], .seat-left, .column-eight p, div[class*="seats"]');

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
                continue;
            }
        }
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        await logActivity(`Scrape failed for ${url}: ${error.message}`, 'error');
    } finally {
        if (browser) await browser.close();
    }
    return results;
}

async function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    } catch (e) {
        return {};
    }
}

async function saveHistory(data) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to save history:", e);
    }
}

async function checkAndNotify() {
    console.log("Starting Bus Check Job...");

    if (!fs.existsSync(ROUTES_FILE)) {
        console.log("No routes file found.");
        return;
    }

    let routes = [];
    try {
        routes = JSON.parse(fs.readFileSync(ROUTES_FILE, 'utf8'));
    } catch (e) {
        console.error("Failed to read routes file:", e);
        return;
    }

    const history = await loadHistory();
    const updates = {};
    let notifications = [];

    for (const route of routes) {
        try {
            console.log(`Processing: ${route.name}`);
            const currentBuses = await scrapeRedBus(route.url);

            if (!currentBuses || currentBuses.length === 0) {
                console.log(`No data for ${route.name}.`);
                continue;
            }

            const lastRunBuses = history[route.id] || [];
            updates[route.id] = currentBuses;

            const routeNotifications = [];
            for (const bus of currentBuses) {
                const oldBus = lastRunBuses.find(b => b.name === bus.name);
                if (oldBus) {
                    if (bus.price < oldBus.price) {
                        routeNotifications.push(`PRICE DROP: ${bus.name} on ${route.name} is now ₹${bus.price} (was ₹${oldBus.price})`);
                    }
                    if ((!oldBus.seats || oldBus.seats.includes('0') || oldBus.seats.toLowerCase().includes('sold')) &&
                        (bus.seats && !bus.seats.includes('0') && !bus.seats.toLowerCase().includes('sold'))) {
                        routeNotifications.push(`SEATS AVAILABLE: ${bus.name} on ${route.name} now has ${bus.seats}`);
                    }
                } else {
                    routeNotifications.push(`NEW BUS: ${bus.name} found on ${route.name} for ₹${bus.price}`);
                }
            }

            if (routeNotifications.length > 0) {
                if (route.email) {
                    await sendEmail(route.email, `Bus Alert: ${route.name}`, routeNotifications.join('\n'));
                }
                notifications = [...notifications, ...routeNotifications];
            }
        } catch (routeError) {
            console.error(`Failed route ${route.id}:`, routeError.message);
        }
    }

    await saveHistory(updates);

    if (notifications.length > 0) {
        await sendEmail(null, "Bus Fare/Seat Alert!", notifications.join('\n'));
        for (const text of notifications) {
            await logActivity(text, text.includes('PRICE DROP') ? 'price' : (text.includes('SEATS') ? 'seats' : 'new'));
        }
    } else {
        console.log("No changes found.");
        await logActivity("Scan completed: No significant changes found.", "new");
    }
}

module.exports = { checkAndNotify };
