import { fetchComplaintEmails } from "./outlook.js";
import { extractCircuitId, htmlToText } from "./utils.js";

export async function processComplaintEmails() {
  const { messages } = await fetchComplaintEmails();

  for (const mail of messages) {
    const subject = mail.subject || "";
    const rawBody = mail.body?.content || "";

    // 🔹 Clean HTML body properly
    const cleanBody =
      mail.body?.contentType === "html"
        ? htmlToText(rawBody)
        : rawBody;

    const combinedText = `${subject} ${cleanBody}`;

    const circuitId = extractCircuitId(combinedText);

    if (!circuitId) {
      console.log(`❌ No Circuit ID | Mail ID: ${mail.id}`);
      continue;
    }

    console.log(`✅ Circuit ID found: ${circuitId}`);
    console.log(`From: ${mail.from?.emailAddress?.address}`);

    // NEXT STEPS (later):
    // createTicket(circuitId, mail)
    // moveToProcessed(mail.id)
  }
}
