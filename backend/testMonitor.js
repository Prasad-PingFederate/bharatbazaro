const { checkAndNotify } = require('./services/busMonitor');

console.log("Starting manual bus monitor test...");
checkAndNotify()
    .then(() => console.log("Job execution finished. Check console for scraping logs."))
    .catch(err => console.error("Job failed:", err));
