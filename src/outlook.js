import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { getAccessToken } from "./auth.js";

export async function fetchComplaintEmails() {
  const token = await getAccessToken();

  const client = Client.init({
    authProvider: (done) => done(null, token),
  });

  const folders = await client
    .api("/me/mailFolders")
    .filter("displayName eq 'H8_COMPLAINT_INBOX'")
    .get();

  if (!folders.value.length) {
    throw new Error("H8_COMPLAINT_INBOX folder not found");
  }

  const folderId = folders.value[0].id;

  const messages = await client
    .api(`/me/mailFolders/${folderId}/messages`)
    .select("id,subject,from,receivedDateTime,body")
    .orderby("receivedDateTime DESC")
    .top(10)
    .get();

  return messages.value; // 🔑 RETURN ARRAY ONLY
}

