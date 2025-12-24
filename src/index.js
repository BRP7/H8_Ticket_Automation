import "dotenv/config";
import { pollInbox } from "./poller.js";
import { sendDailySummary } from "./jobs/dailySummary.js";

let isRunning = false;

async function safePoll() {
  if (isRunning) return;
  isRunning = true;

  try {
    await pollInbox();

    if (process.env.MANUAL_SUMMARY === "true") {
      await sendDailySummary();
    }
  } catch (err) {
    console.error("❌ Poll error:", err);
  } finally {
    isRunning = false;
  }
}

// 🔹 RUN IMMEDIATELY
console.log("🚀 H8 Automation started");
safePoll();

// 🔹 THEN RUN EVERY MINUTE
setInterval(safePoll, 60 * 1000);
