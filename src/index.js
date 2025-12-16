import { fetchComplaintEmails } from "./outlook.js";
import { extractCircuitId } from "./utils.js";
import { createH8Ticket } from "./h8.js";

(async () => {
  const emails = await fetchComplaintEmails();

  for (const mail of emails) {
    const text = `${mail.subject} ${mail.body?.content || ""}`;
    const circuitId = extractCircuitId(text);

    if (!circuitId) continue;

    await createH8Ticket({ circuitId });

    // later:
    // move email to H8-Processed
  }
})();
