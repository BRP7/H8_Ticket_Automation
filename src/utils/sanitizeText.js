export function sanitizeForAspNet(input = "") {
  return input
    .replace(/<[^>]*>/g, "")       // remove HTML tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}
