// import "dotenv/config";
// import { pollInbox } from "./poller.js";
// import { startWorker } from "./worker.js";

// console.log("🚀 H8 Automation started");

// startWorker();

// setInterval(async () => {
//   console.log("📩 Running poll...");
//   await pollInbox();
// }, 60000);



// Phase 1

// import { pollInbox } from "./poller.js";

// // 🔴 DO NOT START WORKER DURING DEBUG
// // import { startWorker } from "./worker.js";

// console.log("🚀 DEBUG MODE STARTED");

// await pollInbox();

// // 🔴 Force stop
// process.exit(0);


//Phase 2

import "dotenv/config";
import { pollInbox } from "./poller.js";
import { startWorker } from "./worker.js";
import { startDailySummaryScheduler } from "./utils/summaryScheduler.js";

console.log("🚀 H8 Automation started (PHASE 2.7)");

startWorker();

// Poll inbox every 60 seconds
setInterval(async () => {
  console.log("📩 Running poll...");
  await pollInbox();
}, 60000);

// Daily summary only in PROD
if (process.env.APP_MODE === "PROD") {
  startDailySummaryScheduler();
}
