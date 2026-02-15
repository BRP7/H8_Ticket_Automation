// // import "dotenv/config";
// // import { pollInbox } from "./poller.js";
// // import { startWorker } from "./worker.js";

// // console.log("🚀 H8 Automation started");

// // startWorker();

// // setInterval(async () => {
// //   console.log("📩 Running poll...");
// //   await pollInbox();
// // }, 60000);



// // Phase 1

// // import { pollInbox } from "./poller.js";

// // // 🔴 DO NOT START WORKER DURING DEBUG
// // // import { startWorker } from "./worker.js";

// // console.log("🚀 DEBUG MODE STARTED");

// // await pollInbox();

// // // 🔴 Force stop
// // process.exit(0);


// //Phase 2

// import "dotenv/config";
// import { pollInbox } from "./poller.js";
// import { startWorker } from "./worker.js";
// import { startDailySummaryScheduler } from "./utils/summaryScheduler.js";

// console.log("🚀 H8 Automation started (PHASE 2.7)");
// // pollInbox();

// startWorker();

// // Poll inbox every 60 seconds
// setInterval(async () => {
//   // await pollInbox();
// }, 20000);

// // Daily summary only in PROD
// if (process.env.APP_MODE === "PROD") {
//   startDailySummaryScheduler();
// }


import "dotenv/config";
import { pollInbox } from "./poller.js";
import { startWorker } from "./worker.js";
import { startDailySummaryScheduler } from "./utils/summaryScheduler.js";

/* =====================================================
   CONFIG FLAGS
===================================================== */

const APP_MODE = process.env.APP_MODE || "TEST";
const WORKER_ENABLED = process.env.WORKER_ENABLED === "true";
const POLLING_ENABLED = process.env.POLLING_ENABLED !== "false"; // default true
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "20000");

/* =====================================================
   STARTUP
===================================================== */

console.log("=================================================");
console.log(`🚀 H8 Automation Started`);
console.log(`📌 Mode: ${APP_MODE}`);
console.log(`🧵 Worker Enabled: ${WORKER_ENABLED}`);
console.log(`📩 Polling Enabled: ${POLLING_ENABLED}`);
console.log("=================================================");

/* =====================================================
   WORKER
===================================================== */

if (WORKER_ENABLED) {
  startWorker();
} else {
  console.log("⚠ Worker is disabled.");
}

/* =====================================================
   POLLER
===================================================== */

let pollerInterval = null;

if (POLLING_ENABLED) {
  pollerInterval = setInterval(async () => {
    try {
      await pollInbox();
    } catch (err) {
      console.error("❌ Poller Error:", err.message);
    }
  }, POLL_INTERVAL);

  console.log(`📩 Polling every ${POLL_INTERVAL / 1000}s`);
} else {
  console.log("⚠ Polling disabled.");
}

/* =====================================================
   DAILY SUMMARY (PROD ONLY)
===================================================== */

if (APP_MODE === "PROD") {
  startDailySummaryScheduler();
}

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("\n🛑 Gracefully shutting down...");

  if (pollerInterval) clearInterval(pollerInterval);

  console.log("✅ Shutdown complete.");
  process.exit(0);
}
