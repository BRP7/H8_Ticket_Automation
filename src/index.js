import "dotenv/config";
import { pollInbox } from "./poller.js";
import { startWorker, getActiveWorkerCount } from "./worker.js";
import { startDailySummaryScheduler } from "./utils/summaryScheduler.js";
import { writeLog } from "./utils/logger.js";
import { closeBrowserPool } from "./browserManager.js";

/* =====================================================
   CONFIG FLAGS
===================================================== */

const APP_MODE = process.env.APP_MODE || "TEST";
const WORKER_ENABLED = process.env.WORKER_ENABLED === "true";
const POLLING_ENABLED = process.env.POLLING_ENABLED !== "false";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "20000");

/* =====================================================
   STARTUP LOG
===================================================== */

writeLog({
  level: "info",
  type: "SYSTEM_START",
  message: "H8 Automation Started",
  config: {
    APP_MODE,
    WORKER_ENABLED,
    POLLING_ENABLED,
    POLL_INTERVAL
  }
});

/* =====================================================
   WORKER
===================================================== */

if (WORKER_ENABLED) {
  startWorker();
  writeLog({
    level: "info",
    type: "WORKER_STARTED"
  });
} else {
  writeLog({
    level: "warn",
    type: "WORKER_DISABLED"
  });
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
      writeLog({
        level: "error",
        type: "POLLER_ERROR",
        message: err.message,
        stack: err.stack
      });
    }
  }, POLL_INTERVAL);

  writeLog({
    level: "info",
    type: "POLLER_STARTED",
    message: `Polling every ${POLL_INTERVAL / 1000}s`
  });

} else {
  writeLog({
    level: "warn",
    type: "POLLER_DISABLED"
  });
}

/* =====================================================
   DAILY SUMMARY (PROD ONLY)
===================================================== */

if (APP_MODE === "PROD") {
  startDailySummaryScheduler();

  writeLog({
    level: "info",
    type: "SUMMARY_SCHEDULER_STARTED"
  });
}

/* =====================================================
   GLOBAL CRASH HANDLERS (PM2 WILL RESTART)
===================================================== */

process.on("unhandledRejection", (reason) => {
  writeLog({
    level: "error",
    type: "UNHANDLED_REJECTION",
    message: reason?.message || "Unhandled promise rejection",
    stack: reason?.stack
  });

  process.exit(1);
});

process.on("uncaughtException", (err) => {
  writeLog({
    level: "error",
    type: "UNCAUGHT_EXCEPTION",
    message: err.message,
    stack: err.stack
  });

  process.exit(1);
});

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
  writeLog({
    level: "info",
    type: "SYSTEM_SHUTDOWN",
    message: "Graceful shutdown initiated"
  });

  if (pollerInterval) {
    clearInterval(pollerInterval);
  }

  // Wait for active workers to finish
  const MAX_WAIT = 30000; // 30 seconds
  const start = Date.now();

  while (getActiveWorkerCount() > 0) {
    if (Date.now() - start > MAX_WAIT) {
      writeLog({
        level: "warn",
        type: "FORCE_SHUTDOWN",
        message: "Worker timeout exceeded"
      });
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await closeBrowserPool();

  writeLog({
    level: "info",
    type: "SYSTEM_SHUTDOWN_COMPLETE"
  });

  process.exit(0);
}
