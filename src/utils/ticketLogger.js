import fs from "fs";
import path from "path";

const HISTORY_FILE = path.resolve("data/h8-ticket-history.json");

export function logTicket({
  circuitId,
  ticketId,
  emailId,
  from,
  status,
}) {
  const now = new Date();

  const entry = {
    circuitId: circuitId || null,
    ticketId: ticketId || null,
    emailId,
    from: from || "-",
    status,

    // machine-safe (for filters)
    createdAtISO: now.toISOString(),

    // human-readable IST
    createdAtIST: now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    }),
  };

  let history = [];

  if (fs.existsSync(HISTORY_FILE)) {
    try {
      const content = fs.readFileSync(HISTORY_FILE, "utf-8").trim();

      // ✅ Handle empty file safely
      if (content) {
        history = JSON.parse(content);
      }
    } catch (err) {
      console.warn("⚠️ History file corrupted. Recreating fresh file.");
      history = [];
    }
  }

  history.push(entry);

  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}
