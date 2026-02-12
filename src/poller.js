// import { fetchInboxEmails, tagMessage } from "./outlook.js";
// import { enqueue } from "./utils/queue.js";

// export async function pollInbox() {
//   const emails = await fetchInboxEmails();

//   const skipTags = [
//     "H8-QUEUED",
//     "H8-PROCESSED",
//     "H8-FAILED",
//     "H8-OTHER",
//     "H8-MANUAL"
//   ];

//   for (const mail of emails) {
//     if (mail.categories?.some(tag => skipTags.includes(tag))) continue;

//     enqueue(mail);
//     await tagMessage(mail.id, "H8-QUEUED");
//   }

//   console.log(`📨 Enqueued ${emails.length} emails`);
// }



import { fetchInboxEmails, tagMessage } from "./outlook.js";
import { enqueue } from "./utils/queue.js";

export async function pollInbox() {
  const emails = await fetchInboxEmails();

  const skipTags = [
    "H8-QUEUED",
    "H8-PROCESSED",
    "H8-FAILED",
    "H8-OTHER",
    "H8-MANUAL"
  ];

  let enqueuedCount = 0;

  for (const mail of emails) {
    if (mail.categories?.some(tag => skipTags.includes(tag))) continue;

    enqueue(mail);
    await tagMessage(mail.id, "H8-QUEUED");
    enqueuedCount++;
  }

  console.log(`📨 Enqueued ${enqueuedCount} new emails`);
}



// import { fetchInboxEmails } from "./outlook.js";
// import { classifyEmailWithGPT } from "./gpt/classify.js";
// import { sanitizeForAspNet } from "./utils/sanitizeText.js";

// export async function pollInbox() {
//   const emails = await fetchInboxEmails();

//   console.log(`📥 Total emails fetched: ${emails.length}`);

//   const firstFive = emails.slice(0, 50);

//   for (const mail of firstFive) {

//     const cleanBody = sanitizeForAspNet(mail.bodyText);

//     console.log("\n==================================================");
//     console.log("📧 SUBJECT:");
//     console.log(mail.subject);

//     console.log("\n📝 BODY (SANITIZED TEXT SENT TO GPT):");
//     console.log(cleanBody);

//     console.log("\n🤖 Calling GPT...\n");

//     const gpt = await classifyEmailWithGPT({
//       subject: mail.subject,
//       body: cleanBody
//     });

//     console.log("🧠 GPT OUTPUT:");
//     console.log(JSON.stringify(gpt, null, 2));
//   }

//   console.log("\n🛑 DEBUG TEST COMPLETE");
//   process.exit(0);
// }
