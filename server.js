const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// 📝 REQUEST LOGGER
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Load Scraper
let checkAndNotify;
try {
    const monitor = require('./services/busMonitor');
    checkAndNotify = monitor.checkAndNotify;
} catch (e) {
    console.error("Critical: Could not load busMonitor service", e);
}

// 📂 UNIVERSAL PATH HANDLER
const getDataPath = (file) => path.join(__dirname, 'data', file);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// 🟢 HEALTH CHECK
app.get('/api/health', (req, res) => res.json({ success: true, status: "online" }));

// 🚌 ROUTES API
app.get('/api/bus-monitor/routes', (req, res) => {
    try {
        const routesPath = getDataPath('bus_routes.json');
        if (!fs.existsSync(routesPath)) fs.writeFileSync(routesPath, '[]');

        const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        const historyPath = getDataPath('bus_history.json');
        const history = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, 'utf8')) : {};

        const data = routes.map(r => ({
            ...r,
            lastCheck: history[r.id] || []
        }));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/bus-monitor/routes', (req, res) => {
    const { name, url, email } = req.body;
    if (!name || !url || !email) return res.status(400).json({ success: false, message: "Missing fields" });

    try {
        const routesPath = getDataPath('bus_routes.json');
        const routes = fs.existsSync(routesPath) ? JSON.parse(fs.readFileSync(routesPath, 'utf8')) : [];
        const newRoute = { id: Date.now().toString(), name, url, email, lastCheck: [] };
        routes.push(newRoute);
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/bus-monitor/routes/:id', (req, res) => {
    try {
        const routesPath = getDataPath('bus_routes.json');
        let routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
        routes = routes.filter(r => r.id !== req.params.id);
        fs.writeFileSync(routesPath, JSON.stringify(routes, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.post('/api/bus-monitor/check', async (req, res) => {
    if (checkAndNotify) {
        // Trigger in background but catch errors to prevent crash
        checkAndNotify().catch(err => {
            console.error("Background Scraper Error:", err);
            // Optionally log to file here too
        });
        res.json({ success: true, message: "Scraper started in background" });
    } else {
        res.status(500).json({ success: false, message: "Scraper service missing" });
    }
});

app.get('/api/bus-monitor/config', (req, res) => {
    try {
        const configPath = getDataPath('monitor_config.json');
        const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/bus-monitor/config', (req, res) => {
    try {
        const configPath = getDataPath('monitor_config.json');
        fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/bus-monitor/logs', (req, res) => {
    try {
        const logsPath = getDataPath('bus_logs.json');
        const logs = fs.existsSync(logsPath) ? JSON.parse(fs.readFileSync(logsPath, 'utf8')) : [];
        res.json({ success: true, logs });
    } catch (error) {
        res.json({ success: true, logs: [] });
    }
});

// STATIC FILES
app.use(express.static(__dirname));

// FALLBACK
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ success: false, message: "Invalid API Endpoint" });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
