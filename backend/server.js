const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('../frontend')); // Serve frontend files

// Mock Database of Products
const products = {
    "p1": {
        id: "p1",
        name: "Vintage Smart Chronograph",
        basePrice: 5000,
        minPrice: 4200, // The absolute specific minimum price
        stock: 5
    }
};

// Bargaining Logic Endpoint
app.post('/api/negotiate', (req, res) => {
    const { productId, offerAmount } = req.body;

    const product = products[productId];

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }

    const offer = parseFloat(offerAmount);

    if (isNaN(offer)) {
        return res.status(400).json({ message: "Invalid offer amount" });
    }

    // Business Logic for Bargaining
    // 1. Instant Acceptance
    if (offer >= product.basePrice * 0.95) {
        return res.json({
            status: 'accepted',
            message: "Deal! Your offer has been accepted.",
            finalPrice: offer
        });
    }

    // 2. Reject if too low (below 70%)
    if (offer < product.basePrice * 0.7) {
        return res.json({
            status: 'rejected',
            message: "That's a bit too low for us. Can you improve your offer?",
            counterOffer: null
        });
    }

    // 3. Counter Offer logic
    // If between 70% and 95%, we counter.
    // Calculate a counter offer that is the average of their offer and our base/target.
    // Ideally, we want to gently bring them up.

    // Check if offer is acceptable (above minPrice)
    if (offer >= product.minPrice) {
        return res.json({
            status: 'accepted',
            message: "You drive a hard bargain! We accept your offer.",
            finalPrice: offer
        });
    }

    // Counter offer strategy: halfway between their offer and the base price, but not lower than minPrice + margin
    let proposedCounter = Math.floor((product.basePrice + offer) / 2);

    // Ensure counter is reasonable
    if (proposedCounter < product.minPrice) {
        proposedCounter = product.minPrice + 100; // Markup slightly
    }

    return res.json({
        status: 'counter',
        message: `We can't do ${offer}, but how about this?`,
        counterOffer: proposedCounter
    });
});

// Signup Endpoint
// Signup Endpoint
app.post('/api/signup', (req, res) => {
    const { firstName, lastName, email, password, gender, dob, nationality, isOver18, acceptedTerms } = req.body;

    // Validate Required Fields
    if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Missing required fields (First Name, Last Name, Email, Password)."
        });
    }

    if (!isOver18) {
        return res.status(400).json({
            success: false,
            message: "You must be 18+ to sign up."
        });
    }

    if (!acceptedTerms) {
        return res.status(400).json({
            success: false,
            message: "You must accept the Terms & Conditions."
        });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: "Please enter a valid email address."
        });
    }

    // Persistent Storage using JSON File
    const usersPath = path.join(__dirname, 'data', 'users.json');

    fs.readFile(usersPath, 'utf8', (err, data) => {
        let users = [];
        if (!err && data) {
            try {
                users = JSON.parse(data);
            } catch (e) {
                console.error("Error parsing users file:", e);
                users = [];
            }
        }

        // Check for existing user
        if (users.find(u => u.email === email)) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email."
            });
        }

        const newUser = {
            id: Date.now().toString(),
            firstName,
            lastName,
            email,
            password, // NOTE: In production, HASH this password!
            gender,
            dob,
            nationality,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);

        fs.writeFile(usersPath, JSON.stringify(users, null, 2), (writeErr) => {
            if (writeErr) {
                console.error("Error saving user:", writeErr);
                return res.status(500).json({
                    success: false,
                    message: "Failed to save user data."
                });
            }

            console.log("New User Signed Up:", email);

            return res.json({
                success: true,
                message: `Welcome to BharatBazaro, ${firstName}! Your account has been created successfully.`
            });
        });
    });
});

// Mock Deals Endpoint
app.get('/api/deals', (req, res) => {
    const { category } = req.query;
    const dealsPath = path.join(__dirname, 'data', 'deals.json');

    fs.readFile(dealsPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Error loading deals" });
        }

        try {
            let deals = JSON.parse(data);

            if (category && category !== 'all') {
                deals = deals.filter(d => d.category === category);
            }

            res.json({
                success: true,
                deals: deals
            });
        } catch (parseErr) {
            console.error(parseErr);
            res.status(500).json({ success: false, message: "Error parsing deals data" });
        }
    });
});

const { checkAndNotify } = require('./services/busMonitor');

// Manual Trigger for Bus Check (for testing/demo)
app.post('/api/bus-monitor/check', async (req, res) => {
    try {
        console.log("Manual bus check triggered via API");
        checkAndNotify(); // Run in background, don't wait for response
        res.json({ success: true, message: "Bus check initiated in background. Check server logs for details." });
    } catch (error) {
        console.error("Error triggering bus check:", error);
        res.status(500).json({ success: false, message: "Failed to start bus check." });
    }
});

// Schedule Bus Check (Simple interval: run every 2 hours)
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;
setInterval(() => {
    console.log("Running scheduled bus check...");
    checkAndNotify();
}, CHECK_INTERVAL_MS);

// Initial check on startup (optional, maybe delay it 10s)
setTimeout(() => {
    console.log("Running initial startup bus check...");
    checkAndNotify();
}, 10000);

// Endpoint to get updated bus info for Frontend
app.get('/api/bus-monitor/routes', (req, res) => {
    const routesPath = path.join(__dirname, 'data', 'bus_routes.json');
    const historyPath = path.join(__dirname, 'data', 'bus_history.json');

    try {
        const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : {};

        // Merge history into routes
        const data = routes.map(r => ({
            ...r,
            lastCheck: history[r.id] || []
        }));

        res.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching bus data:", error);
        res.status(500).json({ success: false, message: "Failed to fetch bus data" });
    }
});

// ... (existing GET routes)

// Add a new route
app.post('/api/bus-monitor/routes', (req, res) => {
    const { name, url } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: "Name and URL required" });

    const routesPath = path.join(__dirname, 'data', 'bus_routes.json');
    try {
        const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        const newRoute = {
            id: Date.now().toString(),
            name,
            url
        };
        routes.push(newRoute);
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
        res.json({ success: true, message: "Route added successfully" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to save route" });
    }
});

// Delete a route
app.delete('/api/bus-monitor/routes/:id', (req, res) => {
    const { id } = req.params;
    const routesPath = path.join(__dirname, 'data', 'bus_routes.json');
    try {
        let routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        routes = routes.filter(r => r.id !== id);
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
        res.json({ success: true, message: "Route deleted successfully" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to delete route" });
    }
});

// Get Config (Safe - exclude password)
app.get('/api/bus-monitor/config', (req, res) => {
    const configPath = path.join(__dirname, 'data', 'monitor_config.json');
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Don't send password back to UI
        res.json({
            success: true, config: {
                senderEmail: config.senderEmail,
                notificationEmail: config.notificationEmail
            }
        });
    } else {
        res.json({ success: true, config: {} });
    }
});

// Update Config
app.post('/api/bus-monitor/config', (req, res) => {
    const { senderEmail, senderPassword, notificationEmail } = req.body;
    const configPath = path.join(__dirname, 'data', 'monitor_config.json');

    try {
        let config = {};
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        if (senderEmail) config.senderEmail = senderEmail;
        if (senderPassword) config.senderPassword = senderPassword; // Only update if provided
        if (notificationEmail) config.notificationEmail = notificationEmail;

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        res.json({ success: true, message: "Configuration saved" });
    } catch (e) {
        res.status(500).json({ success: false, message: "Failed to save configuration" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});



