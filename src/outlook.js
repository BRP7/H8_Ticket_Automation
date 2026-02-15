// import { Client } from "@microsoft/microsoft-graph-client";
// import "isomorphic-fetch";
// import { getAccessToken } from "./auth.js";
// import fs from "fs";
// import { sanitizeForAspNet } from "./utils/sanitizeText.js";
// import { networkLimit } from "./utils/networkLimiter.js";
// import { extractLatestMessage } from "./utils/extractLatestMessage.js";


// /* =========================
//    CONFIG
// ========================= */
// const MAILBOX = process.env.MAILBOX;


// /* =========================
//    GRAPH CLIENT
// ========================= */
// async function getGraphClient() {
//   const token = await getAccessToken();

//   return Client.init({
//     authProvider: (done) => done(null, token),
//   });
// }

// function get24HoursAgoUTC() {
//   const now = new Date();
//   const past = new Date(now.getTime() - (24 * 60 * 60 * 1000));
//   return past.toISOString();
// }
// const since = get24HoursAgoUTC();

// // function getToday2PMIST() {
// //   const now = new Date();

// //   const istOffset = 5.5 * 60 * 60 * 1000;
// //   const istNow = new Date(now.getTime() + istOffset);

// //   const year = istNow.getUTCFullYear();
// //   const month = istNow.getUTCMonth();
// //   const day = istNow.getUTCDate();

// //   const twoPMIST = new Date(Date.UTC(year, month, day, 8, 30, 0)); 
// //   // 2 PM IST = 08:30 UTC

// //   return twoPMIST.toISOString();
// // }

// // const since = getToday2PMIST();


// export async function fetchInboxEmails() {
//   const client = await networkLimit(() => getGraphClient());

//   const res = await networkLimit(() =>
//     client
//       .api(`/users/${MAILBOX}/mailFolders/Inbox/messages`)
//       .filter(`
//         receivedDateTime ge ${since}
//         and not(categories/any(c:c eq 'H8-QUEUED'))
//         and not(categories/any(c:c eq 'H8-PROCESSED'))
//         and not(categories/any(c:c eq 'H8-FAILED'))
//         and not(categories/any(c:c eq 'H8-OTHER'))
//         and not(categories/any(c:c eq 'H8-MANUAL'))
//       `)
//       .orderby("receivedDateTime desc")
//       .top(50)
//       .select("id,conversationId,subject,from,receivedDateTime,categories,body,bodyPreview")
//       .get()
//   );

//   return res.value.map(m => {
//     const rawBody = m.body?.content || m.bodyPreview || "";

//     return {
//       id: m.id,
//       conversationId: m.conversationId,
//       subject: m.subject,
//       from: m.from,
//       receivedDateTime: m.receivedDateTime,
//       categories: m.categories || [],
//       bodyText: sanitizeForAspNet(
//         extractLatestMessage(rawBody)
//       )
//     };
//   });
// }

// /* =========================
//    TAG MESSAGE (SAFE RETRY)
// ========================= */
// export async function tagMessage(messageId, tag) {
//   const client = await getGraphClient();

//   const MAX_RETRIES = 2;

//   for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//     try {

//       // Always fetch latest categories before patching
//       const message = await networkLimit(() =>
//         client
//           .api(`/users/${MAILBOX}/messages/${messageId}`)
//           .select("categories")
//           .get()
//       );

//       const currentCategories = message.categories || [];

//       if (currentCategories.includes(tag)) {
//         return; // already tagged
//       }

//       const updatedCategories = [...currentCategories, tag];

//       await networkLimit(() =>
//         client
//           .api(`/users/${MAILBOX}/messages/${messageId}`)
//           .patch({ categories: updatedCategories })
//       );

//       return; // success

//     } catch (err) {

//       // Retry ONLY for change key mismatch
//       if (
//         err.message?.includes("change key") &&
//         attempt < MAX_RETRIES
//       ) {
//         console.log(`⚠ changeKey mismatch. Retrying tag (${attempt})...`);
//         continue;
//       }

//       throw err;
//     }
//   }
// }

// /* =========================
//    REPLY SAME THREAD
// ========================= */
// export async function replyToMessage(messageId, htmlBody) {
//   const client = await getGraphClient();

//   await networkLimit(() =>
//   client
//     .api(`/users/${MAILBOX}/messages/${messageId}/reply`)
//     .post({
//       message: {
//         body: {
//           contentType: "HTML",
//           content: htmlBody,
//         },
//       },
//     })
// );
// }

// /* =========================
//    SEND NEW MAIL
// ========================= */
// export async function sendNewMail({ to, subject, html }) {
//   try {
//     const client = await getGraphClient();

//     const recipients = to.split(",").map(e => e.trim());

//     if (!recipients.length) {
//       console.warn("⚠ No valid recipients provided");
//       return;
//     }

//     console.log("📤 Sending mail to:", recipients);

//    await networkLimit(() =>
//   client
//     .api(`/users/${MAILBOX}/sendMail`)
//     .post({
//       message: {
//         subject,
//         body: {
//           contentType: "HTML",
//           content: html
//         },
//         toRecipients: recipients.map(email => ({
//           emailAddress: { address: email }
//         }))
//       }
//     })
// );

//   } catch (err) {
//     console.error("❌ sendNewMail FAILED:", err.message);
//     throw err;
//   }
// }

// /* =========================
//    CREATE DRAFT
// ========================= */
// export async function createDraftReply(messageId, htmlBody) {
//   const client = await getGraphClient();

//   await networkLimit(() =>
//     client
//       .api(`/users/${MAILBOX}/messages/${messageId}/createReply`)
//       .post()
//   ).then(async draft => {

//     await networkLimit(() =>
//       client
//         .api(`/users/${MAILBOX}/messages/${draft.id}`)
//         .patch({
//           body: {
//             contentType: "HTML",
//             content: htmlBody
//           }
//         })
//     );
//   });
// }




import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { getAccessToken } from "./auth.js";
import { sanitizeForAspNet } from "./utils/sanitizeText.js";
import { networkLimit } from "./utils/networkLimiter.js";
import { extractLatestMessage } from "./utils/extractLatestMessage.js";
import { writeLog } from "./utils/logger.js";

/* =========================
   CONFIG
========================= */

const MAILBOX = process.env.MAILBOX;

/* =========================
   GRAPH CLIENT
========================= */

async function getGraphClient() {
  const token = await getAccessToken();

  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

/* =========================
   TIME FILTER
========================= */

function get24HoursAgoUTC() {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return past.toISOString();
}

/* =========================
   FETCH INBOX
========================= */

export async function fetchInboxEmails() {
  const client = await networkLimit(() => getGraphClient());
  const since = get24HoursAgoUTC();

  const filterQuery = `
    receivedDateTime ge ${since}
    and not(categories/any(c:c eq 'H8-QUEUED'))
    and not(categories/any(c:c eq 'H8-PROCESSED'))
    and not(categories/any(c:c eq 'H8-FAILED'))
    and not(categories/any(c:c eq 'H8-OTHER'))
    and not(categories/any(c:c eq 'H8-MANUAL'))
  `;

  const res = await networkLimit(() =>
    client
      .api(`/users/${MAILBOX}/mailFolders/Inbox/messages`)
      .filter(filterQuery)
      .orderby("receivedDateTime desc")
      .top(50)
      .select(
        "id,conversationId,subject,from,receivedDateTime,categories,body,bodyPreview"
      )
      .get()
  );

  return res.value.map((m) => {
    const rawBody = m.body?.content || m.bodyPreview || "";

    return {
      id: m.id,
      conversationId: m.conversationId,
      subject: m.subject,
      from: m.from,
      receivedDateTime: m.receivedDateTime,
      categories: m.categories || [],
      bodyText: sanitizeForAspNet(
        extractLatestMessage(rawBody)
      )
    };
  });
}

/* =========================
   TAG MESSAGE (SAFE RETRY)
========================= */

export async function tagMessage(messageId, tag) {
  const client = await getGraphClient();
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const message = await networkLimit(() =>
        client
          .api(`/users/${MAILBOX}/messages/${messageId}`)
          .select("categories")
          .get()
      );

      const currentCategories = message.categories || [];

      if (currentCategories.includes(tag)) return;

      const updatedCategories = [...currentCategories, tag];

      await networkLimit(() =>
        client
          .api(`/users/${MAILBOX}/messages/${messageId}`)
          .patch({ categories: updatedCategories })
      );

      return;
    } catch (err) {
      if (
        err.message?.includes("change key") &&
        attempt < MAX_RETRIES
      ) {
        continue;
      }

      writeLog({
        level: "error",
        type: "TAG_FAILED",
        messageId,
        error: err.message
      });

      throw err;
    }
  }
}

/* =========================
   REPLY SAME THREAD
========================= */

export async function replyToMessage(messageId, htmlBody) {
  const client = await getGraphClient();

  await networkLimit(() =>
    client
      .api(`/users/${MAILBOX}/messages/${messageId}/reply`)
      .post({
        message: {
          body: {
            contentType: "HTML",
            content: htmlBody,
          },
        },
      })
  );

  writeLog({
    level: "info",
    type: "REPLY_SENT",
    messageId
  });
}

/* =========================
   SEND NEW MAIL
========================= */

export async function sendNewMail({ to, subject, html }) {
  const client = await getGraphClient();

  const recipients = to
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!recipients.length) {
    writeLog({
      level: "warn",
      type: "NO_RECIPIENTS"
    });
    return;
  }

  await networkLimit(() =>
    client
      .api(`/users/${MAILBOX}/sendMail`)
      .post({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: recipients.map((email) => ({
            emailAddress: { address: email },
          })),
        },
      })
  );

  writeLog({
    level: "info",
    type: "NEW_MAIL_SENT",
    to: recipients
  });
}

/* =========================
   CREATE DRAFT REPLY
========================= */

export async function createDraftReply(messageId, htmlBody) {
  const client = await getGraphClient();

  const draft = await networkLimit(() =>
    client
      .api(`/users/${MAILBOX}/messages/${messageId}/createReply`)
      .post()
  );

  await networkLimit(() =>
    client
      .api(`/users/${MAILBOX}/messages/${draft.id}`)
      .patch({
        body: {
          contentType: "HTML",
          content: htmlBody,
        },
      })
  );

  writeLog({
    level: "info",
    type: "DRAFT_CREATED",
    messageId
  });
}
