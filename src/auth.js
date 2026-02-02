// import { PublicClientApplication } from "@azure/msal-node";
// import fs from "fs";
// import http from "http";
// import open from "open";
// import dotenv from "dotenv";

// dotenv.config();

// const msalConfig = {
//   auth: {
//     clientId: process.env.CLIENT_ID,
//     authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
//   },
//   cache: {
//     cachePlugin: {
//       beforeCacheAccess: async (ctx) => {
//         if (fs.existsSync("msal-cache.json")) {
//           ctx.tokenCache.deserialize(fs.readFileSync("msal-cache.json", "utf8"));
//         }
//       },
//       afterCacheAccess: async (ctx) => {
//         if (ctx.cacheHasChanged) {
//           fs.writeFileSync("msal-cache.json", ctx.tokenCache.serialize());
//         }
//       },
//     },
//   },
// };

// const SCOPES = [
//   "https://graph.microsoft.com/Mail.ReadWrite",
//   "https://graph.microsoft.com/User.Read",
//   "offline_access",
// ];

// const pca = new PublicClientApplication(msalConfig);

// export async function getAccessToken() {
//   const accounts = await pca.getTokenCache().getAllAccounts();

//   if (accounts.length) {
//     try {
//       const silent = await pca.acquireTokenSilent({
//         account: accounts[0],
//         scopes: SCOPES,
//       });
//       return silent.accessToken;
//     } catch {
//       // fallback to login
//     }
//   }

//   console.log("🔐 LOGIN REQUIRED");

//   const redirectUri = "http://localhost:3000";
//   const authUrl = await pca.getAuthCodeUrl({
//     scopes: SCOPES,
//     redirectUri,
//   });

//   await open(authUrl);

//   const code = await waitForAuthCode(redirectUri);

//   const token = await pca.acquireTokenByCode({
//     code,
//     scopes: SCOPES,
//     redirectUri,
//   });

//   return token.accessToken;
// }

// function waitForAuthCode(redirectUri) {
//   return new Promise((resolve) => {
//     const server = http.createServer((req, res) => {
//       const url = new URL(req.url, redirectUri);
//       const code = url.searchParams.get("code");
//       res.end("Login successful. You can close this window.");
//       server.close();
//       resolve(code);
//     });
//     server.listen(3000);
//   });
// }


import { ConfidentialClientApplication } from "@azure/msal-node";
import dotenv from "dotenv";

dotenv.config();

const msalConfig = {
  auth: {
    clientId: process.env.CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
    clientSecret: process.env.CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

export async function getAccessToken() {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  return result.accessToken;
}
