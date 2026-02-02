// // import { Client } from "@microsoft/microsoft-graph-client";
// // import "isomorphic-fetch";
// // import { getAccessToken } from "./auth.js";
// // import { Client } from "@microsoft/microsoft-graph-client";
// // import "isomorphic-fetch";

// // const folderCache = {};

// // /* =========================
// //    GRAPH CLIENT (SAFE)
// // ========================= */
// // async function getGraphClient() {
// //   const token = await getAccessToken();

// //   return Client.init({
// //     authProvider: (done) => done(null, token),
// //   });
// // }

// // /* =========================
// //    FOLDER HELPERS
// // ========================= */
// // export async function getFolderIdByName(name) {
// //   if (folderCache[name]) return folderCache[name];

// //   const client = await getGraphClient();

// //   const res = await client.api("/me/mailFolders").get();
// //   const folder = res.value.find(f => f.displayName === name);

// //   if (!folder) {
// //     throw new Error(`Folder not found: ${name}`);
// //   }

// //   folderCache[name] = folder.id;
// //   return folder.id;
// // }

// // /* =========================
// //    EMAIL ACTIONS
// // ========================= */
// // export async function markAsRead(messageId) {
// //   const client = await getGraphClient();

// //   await client.api(`/me/messages/${messageId}`).patch({
// //     isRead: true,
// //   });
// // }

// // export async function moveToFolder(messageId, folderName) {
// //   const client = await getGraphClient();
// //   const folderId = await getFolderIdByName(folderName);

// //   await client.api(`/me/messages/${messageId}/move`).post({
// //     destinationId: folderId,
// //   });
// // }

// // /* =========================
// //    FETCH UNREAD EMAILS
// // ========================= */
// // export async function fetchUnreadEmails() {
// //   const client = await getGraphClient();

// //   const res = await client
// //     .api("/me/mailFolders/Inbox/messages")
// //     .filter("isRead eq false")
// //     .top(5)
// //     .select("id,subject,from,body,receivedDateTime")
// //     .get();

// //   return res.value.map(m => ({
// //     id: m.id,
// //     subject: m.subject,
// //     from: m.from,
// //     bodyText: m.body?.content || "",
// //   }));
// // }

// // // reply in same thread
// // // export async function replyToMessage(messageId, htmlBody) {
// // //   const client = getGraphClient(); // same client you use elsewhere

// // //   await client
// // //     .api(`/users/${process.env.MAILBOX}/messages/${messageId}/reply`)
// // //     .post({
// // //       message: {
// // //         body: {
// // //           contentType: "HTML",
// // //           content: htmlBody,
// // //         },
// // //       },
// // //     });
// // // }

// // export async function replyToMessage(messageId, htmlBody, accessToken) {
// //   const client = getGraphClient(accessToken);

// //   await client
// //     .api(`/me/messages/${messageId}/reply`)
// //     .post({
// //       message: {
// //         body: {
// //           contentType: "HTML",
// //           content: htmlBody,
// //         },
// //       },
// //       comment: "",
// //     });
// // }


// // let graphClient = null;

// // export function getGraphClient(accessToken) {
// //   if (graphClient) return graphClient;

// //   graphClient = Client.init({
// //     authProvider: done => {
// //       done(null, accessToken);
// //     },
// //   });

// //   return graphClient;
// // }


// import { Client } from "@microsoft/microsoft-graph-client";
// import "isomorphic-fetch";
// import { getAccessToken } from "./auth.js";

// const folderCache = {};
// let graphClient = null;

// /* =========================
//    GRAPH CLIENT (SINGLE SOURCE)
// ========================= */
// async function getGraphClient() {
//   if (graphClient) return graphClient;

//   const token = await getAccessToken();

//   graphClient = Client.init({
//     authProvider: done => done(null, token),
//   });

//   return graphClient;
// }

// /* =========================
//    FOLDER HELPERS
// ========================= */
// export async function getFolderIdByName(name) {
//   if (folderCache[name]) return folderCache[name];

//   const client = await getGraphClient();
//   const res = await client.api("/me/mailFolders").get();

//   const folder = res.value.find(f => f.displayName === name);
//   if (!folder) throw new Error(`Folder not found: ${name}`);

//   folderCache[name] = folder.id;
//   return folder.id;
// }

// /* =========================
//    EMAIL ACTIONS
// ========================= */
// export async function markAsRead(messageId) {
//   const client = await getGraphClient();
//   await client.api(`/me/messages/${messageId}`).patch({ isRead: true });
// }

// export async function moveToFolder(messageId, folderName) {
//   const client = await getGraphClient();
//   const folderId = await getFolderIdByName(folderName);

//   await client.api(`/me/messages/${messageId}/move`).post({
//     destinationId: folderId,
//   });
// }

// /* =========================
//    FETCH UNREAD EMAILS
// ========================= */
// export async function fetchUnreadEmails() {
//   const client = await getGraphClient();

//   const res = await client
//     .api("/me/mailFolders/Inbox/messages")
//     .filter("isRead eq false")
//     .top(5)
//     .select("id,subject,from,body,receivedDateTime")
//     .get();

//   return res.value.map(m => ({
//     id: m.id,
//     subject: m.subject,
//     from: m.from,
//     bodyText: m.body?.content || "",
//   }));
// }

// /* =========================
//    REPLY IN SAME THREAD ✅
// ========================= */
// export async function replyToMessage(messageId, htmlBody) {
//   const client = await getGraphClient();

//   await client.api(`/me/messages/${messageId}/reply`).post({
//     message: {
//       body: {
//         contentType: "HTML",
//         content: htmlBody,
//       },
//     },
//     comment: "",
//   });
// }


import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";
import { getAccessToken } from "./auth.js";

let graphClient = null;

/* =========================
   GRAPH CLIENT (SINGLETON)
========================= */
async function getGraphClient() {
  if (graphClient) return graphClient;

  const token = await getAccessToken();
  graphClient = Client.init({
    authProvider: done => done(null, token),
  });

  return graphClient;
}

/* =========================
   FETCH EMAILS (NO READ FILTER)
========================= */
export async function fetchInboxEmails() {
  const client = await getGraphClient();

  const res = await client
    .api("/users/bhoomip@convoria.onmicrosoft.com//mailFolders/Inbox/messages")
    .top(10)
    .select("id,subject,from,body,categories")
    .orderby("receivedDateTime desc")
    .get();

  return res.value.map(m => ({
    id: m.id,
    subject: m.subject,
    from: m.from,
    bodyText: m.body?.content || "",
    categories: m.categories || [],
  }));
}

/* =========================
   APPLY CATEGORY (TAG)
========================= */
export async function tagMessage(messageId, tag) {
  const client = await getGraphClient();

  // await client.api(`/me/messages/${messageId}`).patch({
  await client.api(`/users/bhoomip@convoria.onmicrosoft.com//messages/${messageId}`).patch({
    categories: [tag],
  });
}

/* =========================
   REPLY IN SAME THREAD
========================= */
export async function replyToMessage(messageId, htmlBody) {
  const client = await getGraphClient();

  // await client.api(`/me/messages/${messageId}/reply`).post({
  await client.api(`/users/bhoomip@convoria.onmicrosoft.com/messages/${messageId}/reply`).post({
    message: {
      body: {
        contentType: "HTML",
        content: htmlBody,
      },
    },
  });
}

