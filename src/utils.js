export function extractCircuitId(text) {
  if (!text) return null;

  // Only 3 letters + hyphen + 5+ digits (realistic)
  const match = text.match(/\b[a-z]{3}-\d{5,}\b/i);
  return match ? match[0].toUpperCase() : null;
}

export function htmlToText(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
