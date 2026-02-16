import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");
const RETENTION_DAYS = 30;
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

/* =====================================================
   ENSURE LOG DIRECTORY EXISTS
===================================================== */

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/* =====================================================
   LOG FILE NAME
===================================================== */

function getLogFileName() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${today}.log`);
}

/* =====================================================
   WRITE LOG
===================================================== */

export async function writeLog(data) {
  try {
    ensureLogDir();

    const level = (data.level || "info").toLowerCase();

    const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;
    const logLevel = LEVELS[level];

    if (logLevel === undefined || logLevel < currentLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data
    };

    const formatted = JSON.stringify(logEntry) + "\n";

    await fs.promises.appendFile(getLogFileName(), formatted);

  } catch (err) {
    console.error("Logging failed:", err.message);
  }
}

/* =====================================================
   CLEANUP OLD LOGS
===================================================== */

function cleanupOldLogs() {
  try {
    ensureLogDir();

    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();

    files.forEach(file => {
      const filePath = path.join(LOG_DIR, file);
      const stats = fs.statSync(filePath);

      const ageInDays =
        (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageInDays > RETENTION_DAYS) {
        fs.unlinkSync(filePath);
      }
    });

  } catch (err) {
    console.error("Log cleanup failed:", err.message);
  }
}

export function initLogCleanup() {
  cleanupOldLogs();
}
