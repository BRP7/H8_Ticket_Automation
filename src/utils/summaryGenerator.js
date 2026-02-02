import fs from "fs";
import path from "path";

const HISTORY_FILE = path.resolve("data/h8-ticket-history.json");

/**
 * Returns today's date in IST (YYYY-MM-DD)
 */
function getTodayISTDate() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Generates summary for TODAY (IST based)
 */
export function generateTodaySummary() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return null;
  }

  const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));

  const todayIST = getTodayISTDate();

  // Filter entries created TODAY in IST
  const todayEntries = raw.filter(entry => {
    if (!entry.createdAtISO) return false;

    const entryDateIST = new Date(entry.createdAtISO)
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    return entryDateIST === todayIST;
  });

  if (todayEntries.length === 0) {
    return null;
  }

  const summary = {
    date: todayIST,
    total: todayEntries.length,
    success: 0,
    duplicate: 0,
    failed: 0,
    ignored: 0,
    systemIgnored: 0,
    details: [],
  };

  for (const e of todayEntries) {
    switch (e.status) {
      case "SUCCESS":
        summary.success++;
        break;

      case "DUPLICATE_CASE":
        summary.duplicate++;
        break;

      case "FAILED":
      case "FAILED_RETRY_EXHAUSTED":
        summary.failed++;
        break;

      case "IGNORED":
        summary.ignored++;
        break;

      case "SYSTEM_IGNORED":
        summary.systemIgnored++;
        break;
    }

    summary.details.push({
      circuitId: e.circuitId || "-",
      status: e.status,
      ticketId: e.ticketId || "-",
      from: e.from || "-",
    });
  }

  return summary;
}
