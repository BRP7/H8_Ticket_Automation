// src/utils/errorClassifier.js

export function isRetryableError(err) {
  if (!err) return false;

  const msg = err.message?.toLowerCase() || "";

  // ⏱️ Timeouts / slow infra
  if (msg.includes("timeout")) return true;
  if (msg.includes("navigation")) return true;
  if (msg.includes("net::")) return true;

  // 🌐 ASP.NET / server issues
  if (msg.includes("access is denied")) return true;
  if (msg.includes("500")) return true;
  if (msg.includes("502")) return true;
  if (msg.includes("503")) return true;
  if (msg.includes("504")) return true;

  // 🚫 Explicit NON-retry cases
  if (msg.includes("option") && msg.includes("not found")) return false;
  if (msg.includes("validation")) return false;
  if (msg.includes("already")) return false;

  return false;
}
