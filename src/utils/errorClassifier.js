export function isRetryableError(err) {
  if (!err) return false;

  const msg = err.message?.toLowerCase() || "";

  // Timeouts
  if (msg.includes("timeout")) return true;
  if (msg.includes("waitforselector")) return true;
  if (msg.includes("page.goto")) return true;
  if (msg.includes("navigation")) return true;

  // Network
  if (msg.includes("fetch failed")) return true;
  if (msg.includes("net::")) return true;
  if (msg.includes("network")) return true;

  // Server issues
  if (msg.includes("500")) return true;
  if (msg.includes("502")) return true;
  if (msg.includes("503")) return true;
  if (msg.includes("504")) return true;

  // NON retryable
  if (msg.includes("duplicate_case")) return false;
  if (msg.includes("option") && msg.includes("not found")) return false;
  if (msg.includes("validation")) return false;

  return false;
}
