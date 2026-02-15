// import fs from "fs";
// import path from "path";

// const LOG_DIR = path.resolve("logs");
// const RETENTION_DAYS = 30;
// const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// const LEVELS = {
//   debug: 0,
//   info: 1,
//   error: 2
// };

// // Ensure logs directory exists
// function ensureLogDir() {
//   if (!fs.existsSync(LOG_DIR)) {
//     fs.mkdirSync(LOG_DIR, { recursive: true });
//   }
// }

// // Get standard log file
// function getLogFileName() {
//   const today = new Date().toISOString().slice(0, 10);
//   return path.join(LOG_DIR, `${today}.log`);
// }

// // Get debug log file
// function getDebugLogFileName() {
//   const today = new Date().toISOString().slice(0, 10);
//   return path.join(LOG_DIR, `debug-${today}.log`);
// }

// // Write structured log
// export function writeLog(data) {
//   try {
//     ensureLogDir();

//     const level = data.level || "info";

//     const currentLevel = LEVELS[LOG_LEVEL];
//     const logLevel = LEVELS[level];

//     // Skip logs lower than configured level
//     if (logLevel < currentLevel) return;

//     const logEntry = {
//       timestamp: new Date().toISOString(),
//       ...data,
//     };

//     const logFile =
//       level === "debug"
//         ? getDebugLogFileName()
//         : getLogFileName();

//     fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");

//   } catch (err) {
//     console.error("❌ Logging failed:", err.message);
//   }
// }

// // Delete logs older than retention period
// function cleanupOldLogs() {
//   try {
//     ensureLogDir();

//     const files = fs.readdirSync(LOG_DIR);
//     const now = Date.now();

//     files.forEach(file => {
//       const filePath = path.join(LOG_DIR, file);
//       const stats = fs.statSync(filePath);

//       const ageInDays =
//         (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

//       if (ageInDays > RETENTION_DAYS) {
//         fs.unlinkSync(filePath);
//       }
//     });

//   } catch (err) {
//     console.error("❌ Log cleanup failed:", err.message);
//   }
// }

// // Run cleanup on startup
// export function initLogCleanup() {
//   cleanupOldLogs();
// }



import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("logs");
const RETENTION_DAYS = 30;
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase();

const LEVELS = {
  debug: 0,
  info: 1,
  error: 2
};

// Ensure logs directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get standard log file
function getLogFileName() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `${today}.log`);
}

// Get debug log file
function getDebugLogFileName() {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `debug-${today}.log`);
}

// Write structured log
export async function writeLog(data) {
  try {
    ensureLogDir();

    const level = (data.level || "info").toLowerCase();

    const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;
    const logLevel = LEVELS[level];

    // Skip logs lower than configured level
    if (logLevel === undefined || logLevel < currentLevel) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...data,
    };

    // 🔥 Prevent massive log files from large email bodies
    if (logEntry.body && logEntry.body.length > 5000) {
      logEntry.body =
        logEntry.body.slice(0, 5000) + "\n...[truncated]";
    }

    const logFile =
      level === "debug"
        ? getDebugLogFileName()
        : getLogFileName();

    let formatted;

    // Pretty format for debug logs (human readable)
    if (level === "debug") {
      formatted = `
==================================================
Time      : ${logEntry.timestamp}
Level     : ${logEntry.level || ""}
Type      : ${logEntry.type || ""}
MessageId : ${logEntry.messageId || ""}
--------------------------------------------------
${logEntry.subject ? `Subject   : ${logEntry.subject}\n` : ""}
${logEntry.body ? `Body      :\n${logEntry.body}\n` : ""}
${
  logEntry.result
    ? `Result    :\n${JSON.stringify(logEntry.result, null, 2)}\n`
    : ""
}
==================================================

`;
    } else {
      // Compact JSON for info/error logs (machine readable)
      formatted = JSON.stringify(logEntry) + "\n";
    }

    await fs.promises.appendFile(logFile, formatted);

  } catch (err) {
    console.error("❌ Logging failed:", err.message);
  }
}

// Delete logs older than retention period
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
    console.error("❌ Log cleanup failed:", err.message);
  }
}

// Run cleanup on startup
export function initLogCleanup() {
  cleanupOldLogs();
}
