import "dotenv/config";
import { pollInbox } from "./poller.js";

let isRunning = false;

async function safePoll() {
  if (isRunning) return;
  isRunning = true;

  try {
    await pollInbox();
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
