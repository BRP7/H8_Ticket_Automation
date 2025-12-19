import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { getAccessToken } from "./auth.js";

const folderCache = {};

/* =========================
   GRAPH CLIENT (SAFE)
========================= */
async function getGraphClient() {
  const token = await getAccessToken();

  return Client.init({
    authProvider: (done) => done(null, token),
  });
}

/* =========================
   FOLDER HELPERS
========================= */
export async function getFolderIdByName(name) {
  if (folderCache[name]) return folderCache[name];

  const client = await getGraphClient();

  const res = await client.api("/me/mailFolders").get();
  const folder = res.value.find(f => f.displayName === name);

  if (!folder) {
    throw new Error(`Folder not found: ${name}`);
  }

  folderCache[name] = folder.id;
  return folder.id;
}

/* =========================
   EMAIL ACTIONS
========================= */
export async function markAsRead(messageId) {
  const client = await getGraphClient();

  await client.api(`/me/messages/${messageId}`).patch({
    isRead: true,
  });
}

export async function moveToFolder(messageId, folderName) {
  const client = await getGraphClient();
  const folderId = await getFolderIdByName(folderName);

  await client.api(`/me/messages/${messageId}/move`).post({
    destinationId: folderId,
  });
}

/* =========================
   FETCH UNREAD EMAILS
========================= */
export async function fetchUnreadEmails() {
  const client = await getGraphClient();

  const res = await client
    .api("/me/mailFolders/Inbox/messages")
    .filter("isRead eq false")
    .top(5)
    .select("id,subject,from,body,receivedDateTime")
    .get();

  return res.value.map(m => ({
    id: m.id,
    subject: m.subject,
    from: m.from,
    bodyText: m.body?.content || "",
  }));
}
