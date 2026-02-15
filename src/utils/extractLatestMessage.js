export function extractLatestMessage(rawBody = "") {
  if (!rawBody) return "";

  let body = rawBody;

  // Normalize line breaks
  body = body.replace(/\r\n/g, "\n");

  /* =========================
     THREAD SPLIT LOGIC
  ========================== */

  const splitPatterns = [
    /^On .* wrote:/m,
    /^From:\s.*$/m,
    /^Sent:\s.*$/m,
    /^-----Original Message-----/m,
    /^_{5,}$/m,
    /^From:.*\nSent:.*\nTo:.*\nSubject:.*$/m,
  ];

  let cutIndex = body.length;

  for (const pattern of splitPatterns) {
    const match = body.match(pattern);
    if (match && match.index < cutIndex) {
      cutIndex = match.index;
    }
  }

  body = body.substring(0, cutIndex).trim();

  /* =========================
     REMOVE ACK TEMPLATES
  ========================== */

  const noisePatterns = [
    /Thank you for contacting us[\s\S]*$/i,
    /We are glad to assist you[\s\S]*$/i,
    /Please do not print this mail[\s\S]*$/i,
    /Save Paper, Save Environment[\s\S]*$/i,
    /This electronic mail message[\s\S]*$/i,
    /WARNING:.*virus[\s\S]*$/i,
    /Computer viruses can be transmitted[\s\S]*$/i,
    /This message and any attachment[\s\S]*$/i,
    /This email is generated automatically[\s\S]*$/i,
  ];

  for (const pattern of noisePatterns) {
    body = body.replace(pattern, "").trim();
  }

  return body.trim();
}
