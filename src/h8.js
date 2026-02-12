// import { chromium } from "playwright";
// import { sanitizeForAspNet } from "./utils/sanitizeText.js";

// /**
//  * Create H8 ticket using Playwright (ASP.NET safe)
//  */
// export async function createH8Ticket(data) {
//   const {
//     circuitId,
//     caseReasonCategory,
//     subCategory,
//     subSubCategory,
//     originalEmailBody,
//     summary,
//   } = data;

//   /* =========================
//      DESCRIPTION BUILD
//   ========================== */
//   const rawDescription = `
// This ticket is created automatically by system.

// ------------------------------
// Original Email Content
// ------------------------------
// ${originalEmailBody || "No email body available"}

// ------------------------------
// System Summary
// ------------------------------
// ${summary || "-"}
// `.trim();

//   const MAX_LEN = 3500;
//   const finalDescription = sanitizeForAspNet(rawDescription).slice(
//     0,
//     MAX_LEN
//   );

//   /* =========================
//      LAUNCH BROWSER (HEADLESS)
//   ========================== */
//   const browser = await chromium.launch({
//     headless: true,
//   });

//   const context = await browser.newContext({
//     ignoreHTTPSErrors: true,
//   });

//   const page = await context.newPage();

//   try {
//     /* =========================
//        1️⃣ LOGIN
//     ========================== */
//     await page.goto("http://admin.optimaltele.net/Login.aspx", {
//       waitUntil: "domcontentloaded",
//       timeout: 60000,
//     });

//     await page.fill("#txtUserName", process.env.H8_USERNAME);
//     await page.fill("#txtPassword", process.env.H8_PASSWORD);
//     await page.click("#save");

//     await page.waitForTimeout(5000);

//     /* =========================
//        2️⃣ NEW CASE PAGE
//     ========================== */
//     await page.goto("http://admin.optimaltele.net/NewCase.aspx", {
//       waitUntil: "domcontentloaded",
//       timeout: 60000,
//     });

//     await page.waitForTimeout(5000);

//     /* =========================
//        3️⃣ SELECT LEASE ACCOUNT
//     ========================== */
//     await page.waitForSelector("select[id*='ddlAccountnam']", {
//       timeout: 30000,
//     });

//     await page.evaluate(() => {
//       const ddl = document.querySelector("select[id*='ddlAccountnam']");
//       const option = [...ddl.options].find(
//         (o) => o.textContent.trim() === "Lease Account"
//       );
//       if (!option) throw new Error("Lease Account option not found");

//       ddl.value = option.value;
//       ddl.dispatchEvent(new Event("change", { bubbles: true }));
//     });

//     await page.waitForTimeout(4000);

//     /* =========================
//        4️⃣ ENTER CIRCUIT ID
//     ========================== */
//     await page.waitForSelector("input[id*='txtLeasecircuit']", {
//       timeout: 30000,
//     });

//     await page.evaluate((circuitId) => {
//       const input = document.querySelector(
//         "input[id*='txtLeasecircuit']"
//       );
//       input.value = circuitId;
//       input.dispatchEvent(new Event("input", { bubbles: true }));
//       input.dispatchEvent(new Event("change", { bubbles: true }));
//     }, circuitId);

//     await page.waitForTimeout(5000);

//     /* =========================
//        5️⃣ DROPDOWNS
//     ========================== */
//     await selectAndWait(
//       page,
//       "#ContentPlaceHolder1_ddlCategory",
//       caseReasonCategory
//     );

//     await selectAndWait(
//       page,
//       "#ContentPlaceHolder1_ddlsubCategory",
//       subCategory
//     );

//     await selectAndWait(
//       page,
//       "#ContentPlaceHolder1_ddlSubSubCategory",
//       subSubCategory
//     );

//     /* =========================
//        6️⃣ TITLE & DESCRIPTION
//     ========================== */
//     await page.fill(
//       "#ContentPlaceHolder1_txttitle",
//       "Fault Ticket – Automated"
//     );

//     await page.fill(
//       "#ContentPlaceHolder1_txtDesc",
//       finalDescription
//     );

//     /* =========================
//        7️⃣ SAVE
//     ========================== */
//     await page.click("#ContentPlaceHolder1_btnsave");

//     /* =========================
//        8️⃣ WAIT FOR RESULT
//     ========================== */
//     const duplicateBanner = page.locator(
//       "text=Case is already open"
//     );

//     try {
//       await Promise.race([
//         page.waitForSelector(".sweet-alert", {
//           timeout: 20000,
//         }),
//         duplicateBanner.waitFor({ timeout: 20000 }),
//       ]);
//     } catch {
//       throw new Error("UNKNOWN_SAVE_RESULT");
//     }

//     /* =========================
//        9️⃣ DUPLICATE CHECK
//     ========================== */
//     if (await duplicateBanner.isVisible()) {
//       const err = new Error("DUPLICATE_CASE");
//       err.code = "DUPLICATE_CASE";
//       throw err;
//     }

//     /* =========================
//        🔟 READ TICKET ID
//     ========================== */
//     const ticketId = await page.evaluate(() => {
//       const tds = [...document.querySelectorAll(".sweet-alert td")];
//       const idx = tds.findIndex((td) =>
//         td.textContent.trim().startsWith("Ticket ID")
//       );
//       return idx !== -1
//         ? tds[idx + 1]?.innerText.trim()
//         : null;
//     });

//     if (!ticketId) {
//       throw new Error("Ticket ID not found");
//     }

//     await page.click(".sweet-alert button.confirm");

//     return ticketId;
//   } finally {
//     await browser.close();
//   }
// }

// /* =====================================================
//    SAFE DROPDOWN SELECT (ASP.NET STABLE)
// ===================================================== */
// async function selectAndWait(page, selector, text) {
//   await page.waitForSelector(selector, { timeout: 30000 });

//   await page.waitForFunction(
//     (sel) => {
//       const el = document.querySelector(sel);
//       return el && el.options.length > 1;
//     },
//     selector
//   );

//   await page.evaluate(
//     ({ selector, text }) => {
//       const ddl = document.querySelector(selector);
//       const opt = [...ddl.options].find(
//         (o) =>
//           o.textContent.trim().toLowerCase() ===
//           text.toLowerCase()
//       );
//       if (!opt)
//         throw new Error(`Option "${text}" not found`);

//       ddl.value = opt.value;
//       ddl.dispatchEvent(
//         new Event("change", { bubbles: true })
//       );
//     },
//     { selector, text }
//   );

//   await page.waitForTimeout(4000);
// }



import { sanitizeForAspNet } from "./utils/sanitizeText.js";
import { getBrowserContext } from "./browserManager.js";

export async function createH8Ticket(data) {
  const {
    circuitId,
    caseReasonCategory,
    subCategory,
    subSubCategory,
    originalEmailBody,
    summary,
  } = data;

  const rawDescription = `
This ticket is created via automation.

------------------------------
Original Email Content
------------------------------
${originalEmailBody || "No email body available"}

------------------------------
System Summary
------------------------------
${summary || "-"}
`.trim();

  const finalDescription = sanitizeForAspNet(rawDescription).slice(0, 3500);

  const context = await getBrowserContext();
  const page = await context.newPage();

  try {
    await page.goto("http://admin.optimaltele.net/Login.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.fill("#txtUserName", process.env.H8_USERNAME);
    await page.fill("#txtPassword", process.env.H8_PASSWORD);
    await page.click("#save");
    await page.waitForTimeout(4000);

    await page.goto("http://admin.optimaltele.net/NewCase.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(4000);

    // Select Lease Account
    await page.evaluate(() => {
      const ddl = document.querySelector("select[id*='ddlAccountnam']");
      const option = [...ddl.options].find(
        o => o.textContent.trim() === "Lease Account"
      );
      if (!option) throw new Error("Lease Account not found");
      ddl.value = option.value;
      ddl.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.waitForTimeout(3000);

    // Circuit ID
    await page.evaluate((circuitId) => {
      const input = document.querySelector("input[id*='txtLeasecircuit']");
      input.value = circuitId;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, circuitId);

    await page.waitForTimeout(3000);

    // Dropdowns
    await selectAndWait(page, "#ContentPlaceHolder1_ddlCategory", caseReasonCategory);
    await selectAndWait(page, "#ContentPlaceHolder1_ddlsubCategory", subCategory);
    await selectAndWait(page, "#ContentPlaceHolder1_ddlSubSubCategory", subSubCategory);

    // Title & Description
    await page.fill("#ContentPlaceHolder1_txttitle", "Automated Ticket");
    await page.fill("#ContentPlaceHolder1_txtDesc", finalDescription);

    await page.click("#ContentPlaceHolder1_btnsave");

    await page.waitForSelector(".sweet-alert", { timeout: 20000 });

    const ticketId = await page.evaluate(() => {
      const tds = [...document.querySelectorAll(".sweet-alert td")];
      const idx = tds.findIndex(td =>
        td.textContent.trim().startsWith("Ticket ID")
      );
      return idx !== -1 ? tds[idx + 1]?.innerText.trim() : null;
    });

    if (!ticketId) throw new Error("Ticket ID not found");

    await page.click(".sweet-alert button.confirm");

    return ticketId;

  } finally {
    await page.close();
  }
}

async function selectAndWait(page, selector, text) {
  await page.waitForSelector(selector);
  await page.evaluate(({ selector, text }) => {
    const ddl = document.querySelector(selector);
    const opt = [...ddl.options].find(
      o => o.textContent.trim().toLowerCase() === text.toLowerCase()
    );
    if (!opt) throw new Error(`Option "${text}" not found`);
    ddl.value = opt.value;
    ddl.dispatchEvent(new Event("change", { bubbles: true }));
  }, { selector, text });

  await page.waitForTimeout(2000);
}
