import fs from "fs";
import path from "path";
import { sendNewMail } from "../outlook.js";

const LOG_DIR = path.resolve("logs");

const APP_MODE = process.env.APP_MODE || "TEST";

let lastSummarySentDate = null;

/* ==========================================
   IST HELPER
========================================== */

function getISTDateString(date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata"
  });
}

function getRelevantLogFiles() {
  const now = new Date();

  const todayIST = getISTDateString(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIST = getISTDateString(yesterday);

  const files = [];

  const todayFile = path.join(LOG_DIR, `${todayIST}.log`);
  const yesterdayFile = path.join(LOG_DIR, `${yesterdayIST}.log`);

  if (fs.existsSync(todayFile)) {
    files.push(todayFile);
  }

  if (fs.existsSync(yesterdayFile)) {
    files.push(yesterdayFile);
  }

  return files;
}

function readLogsInWindow(start, end) {
  if (!fs.existsSync(LOG_DIR)) return [];

  const files = getRelevantLogFiles();

  let entries = [];

  for (const filePath of files) {

    const lines = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        if (!parsed.timestamp) continue;

        const entryTime = new Date(parsed.timestamp);

        if (entryTime >= start && entryTime < end) {
          entries.push(parsed);
        }

      } catch {
        continue;
      }
    }
  }

  return entries;
}


/* ==========================================
   GENERATE SUMMARY
========================================== */

function generateSummary() {
  const { start, end } = getWindow();
  const logs = readLogsInWindow(start, end);

  if (!logs.length) return null;

  const summary = {
    windowStart: start.toISOString(),
    windowEnd: end.toISOString(),
    success: 0,
    duplicate: 0,
    failed: 0,
    ignored: 0
  };

  for (const log of logs) {
    switch (log.type) {
      case "TICKET_CREATED":
        summary.success++;
        break;

      case "DUPLICATE_CASE":
        summary.duplicate++;
        break;

      case "JOB_FAILED":
        summary.failed++;
        break;

      case "IGNORED_NO_CIRCUIT":
      case "NOT_ISSUE":
        summary.ignored++;
        break;
    }
  }

  return summary;
}

/* ==========================================
   BUILD HTML
========================================== */

function buildSummaryHTML(summary) {
  return `
    <h2>H8 Automation Summary</h2>

    <p><b>Window:</b></p>
    <p>${summary.windowStart} → ${summary.windowEnd}</p>

    <hr/>

    <p><b>Tickets Created:</b> ${summary.success}</p>
    <p><b>Duplicates:</b> ${summary.duplicate}</p>
    <p><b>Failures:</b> ${summary.failed}</p>
    <p><b>Ignored:</b> ${summary.ignored}</p>
  `;
}

/* ==========================================
   SCHEDULER
========================================== */

export function startDailySummaryScheduler() {


  if (APP_MODE === "TEST") {

    // 🔥 TEST MODE → every 2 minutes
    setInterval(async () => {

      const summary = generateSummary();
      if (!summary) return;

      await sendNewMail({
        to: process.env.DAILY_SUMMARY,
        subject: "TEST MODE - H8 Summary (Last 24h)",
        html: buildSummaryHTML(summary)
      });

    }, 2 * 60 * 1000); // 2 minutes

    return;
  }

  // PROD MODE → 6PM IST
  setInterval(async () => {

    const now = new Date();

    const istTime = now.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false
    });

    const todayIST = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata"
    });

    if (istTime === "18:00:00" && lastSummarySentDate !== todayIST) {

      const summary = generateSummary();

      if (!summary) {
        lastSummarySentDate = todayIST;
        return;
      }

      await sendNewMail({
        to: process.env.DAILY_SUMMARY,
        subject: "H8 Daily Automation Summary",
        html: buildSummaryHTML(summary)
      });

      lastSummarySentDate = todayIST;
    }

  }, 60000);
}
``