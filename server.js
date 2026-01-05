const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001; // Use Render's port if available

app.use(cors());
app.use(bodyParser.json());

// 🧪 CRITICAL: Move Static Middleware to BOTTOM later to ensure API routes are checked FIRST
// This prevents "Unexpected Token <" errors by ensuring /api routes aren't handled by the static server.

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
        if (!fs.existsSync(routesPath)) {
            if (!fs.existsSync(path.join(__dirname, 'data'))) {
                fs.mkdirSync(path.join(__dirname, 'data'));
            }
            fs.writeFileSync(routesPath, '[]');
        }
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

// Add a new route
app.post('/api/bus-monitor/routes', (req, res) => {
    console.log("Received new route request:", req.body);
    const { name, url, email } = req.body;

    if (!name || !url || !email) {
        console.warn("Missing required fields for new route");
        return res.status(400).json({ success: false, message: "Name, URL, and Email are all required" });
    }

    const routesPath = path.join(__dirname, 'data', 'bus_routes.json');
    try {
        let routes = [];
        if (fs.existsSync(routesPath)) {
            routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        }

        const newRoute = {
            id: Date.now().toString(),
            name: name,
            url: url,
            email: email,
            lastCheck: []
        };

        routes.push(newRoute);
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
        console.log("Success: Route saved to database.");
        res.json({ success: true, message: "Route added successfully" });
    } catch (e) {
        console.error("Failed to save route:", e);
        res.status(500).json({ success: false, message: "Internal Server Error: Failed to save route" });
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

// Health Check
app.get('/api/health', (req, res) => res.json({ status: "ok", message: "Bus Monitor API is online" }));

// Activity Logs
app.get('/api/bus-monitor/logs', (req, res) => {
    const logsPath = path.join(__dirname, 'data', 'bus_logs.json');
    if (fs.existsSync(logsPath)) {
        const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
        res.json({ success: true, logs });
    } else {
        res.json({ success: true, logs: [] });
    }
});

// Serving static files (Move to the end)
app.use(express.static(__dirname));

// Fallback for SPA-like behavior: Serve index.html for unknown routes (EXCEPT API)
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Explicit 404 for missing API routes (to prevent HTML leakage)
app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API Route ${req.url} Not Found` });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
