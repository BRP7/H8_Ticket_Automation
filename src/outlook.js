import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { getAccessToken } from "./auth.js";
import fs from "fs";
import { sanitizeForAspNet } from "./utils/sanitizeText.js";

/* =========================
   CONFIG
========================= */
const MAILBOX = process.env.MAILBOX;
const STATE_FILE = "data/mail-state.json";

let graphClient = null;

/* =========================
   STATE MANAGEMENT
========================= */
function getLastProcessedAt() {
  if (!fs.existsSync(STATE_FILE)) {
    return "1970-01-01T00:00:00.000Z";
  }

  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    return data.lastProcessedAt || "1970-01-01T00:00:00.000Z";
  } catch {
    return "1970-01-01T00:00:00.000Z";
  }
}

export function saveLastProcessedAt(isoDate) {
  if (!isoDate) return;

  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify({ lastProcessedAt: isoDate }, null, 2)
  );
}

/* =========================
   GRAPH CLIENT (SINGLETON)
========================= */
async function getGraphClient() {
  if (graphClient) return graphClient;

  const token = await getAccessToken();

  graphClient = Client.init({
    authProvider: (done) => done(null, token),
  });

  return graphClient;
}

/* =========================
   FETCH NEW EMAILS (RESUME SAFE)
========================= */
export async function fetchInboxEmails() {
  const client = await getGraphClient();

  const res = await client
    .api(`/users/${MAILBOX}/mailFolders/Inbox/messages`)
    .orderby("receivedDateTime desc")
    .top(50)
    .select("id,subject,from,receivedDateTime,categories,body,bodyPreview")
    .get();

  return res.value.map(m => ({
    id: m.id,
    subject: m.subject,
    from: m.from,
    receivedDateTime: m.receivedDateTime,
    categories: m.categories || [],
    bodyText: sanitizeForAspNet(
      m.body?.content || m.bodyPreview || ""
    )
  }));
}


/* =========================
   APPLY CATEGORY (TAG)
========================= */
export async function tagMessage(messageId, tag) {
  const client = await getGraphClient();

  await client
    .api(`/users/${MAILBOX}/messages/${messageId}`)
    .patch({
      categories: [tag],
    });
}

/* =========================
   REPLY IN SAME THREAD
========================= */
export async function replyToMessage(messageId, htmlBody) {
  const client = await getGraphClient();

  await client
    .api(`/users/${MAILBOX}/messages/${messageId}/reply`)
    .post({
      message: {
        body: {
          contentType: "HTML",
          content: htmlBody,
        },
      },
    });
}


export async function sendNewMail({ to, subject, html }) {
  const client = await getGraphClient();

  await client
    .api(`/users/${MAILBOX}/sendMail`)
    .post({
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: html
        },
        toRecipients: [
          {
            emailAddress: {
              address: to
            }
          }
        ]
      }
    });
}


