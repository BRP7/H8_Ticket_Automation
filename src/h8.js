import { chromium } from "playwright";

/**
 * Create H8 ticket using Playwright (ASP.NET safe)
 */
export async function createH8Ticket(data) {
  const {
    circuitId,
    caseReasonCategory,
    subCategory,
    subSubCategory,
    priority,
    summary,
  } = data;

  // ✅ Fixed title & description (testing phase)
  const finalDescription =
    `This ticket is created for testing purposes only. No action is required.\n\n` +
    `--- Original Email Content ---\n` +
    (summary || "No email body available");

  const browser = await chromium.launch({
    headless: false, // MUST be false for ASP.NET stability
    slowMo: 50,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  try {
    /* =========================
       1️⃣ LOGIN
    ========================== */
    await page.goto("http://admin.optimaltele.net/Login.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.fill("#txtUserName", process.env.H8_USERNAME);
    await page.fill("#txtPassword", process.env.H8_PASSWORD);
    await page.click("#save");

    // ASP.NET postback
    await page.waitForTimeout(6000);

    /* =========================
       2️⃣ NEW CASE PAGE
    ========================== */
    await page.goto("http://admin.optimaltele.net/NewCase.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(5000);

    /* =========================
       3️⃣ SELECT LEASE ACCOUNT
    ========================== */
    await page.waitForSelector("select[id*='ddlAccountnam']", {
      timeout: 30000,
    });

    await page.evaluate(() => {
      const ddl = document.querySelector("select[id*='ddlAccountnam']");
      const option = [...ddl.options].find(
        o => o.textContent.trim() === "Lease Account"
      );
      if (!option) throw new Error("Lease Account option not found");

      ddl.value = option.value;
      ddl.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Allow ASP.NET UpdatePanel
    await page.waitForTimeout(5000);

    /* =========================
       4️⃣ ENTER CIRCUIT ID
    ========================== */
    await page.waitForSelector("input[id*='txtLeasecircuit']", {
      timeout: 30000,
    });

    await page.evaluate((circuitId) => {
      const input = document.querySelector("input[id*='txtLeasecircuit']");
      input.focus();
      input.value = circuitId;

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, circuitId);

    // Backend lookup
    await page.waitForTimeout(6000);

    /* =========================
       5️⃣ DROPDOWNS (ORDER IS CRITICAL)
    ========================== */

    // Case Reason / Category
    await selectAndWait(
      page,
      "#ContentPlaceHolder1_ddlCategory",
      caseReasonCategory
    );

    // Sub Category (depends on Category)
    await selectAndWait(
      page,
      "#ContentPlaceHolder1_ddlsubCategory",
      subCategory
    );

    // Sub Sub Category (depends on Sub Category)
    await selectAndWait(
      page,
      "#ContentPlaceHolder1_ddlSubSubCategory",
      subSubCategory
    );

    // Priority
    await selectAndWait(
      page,
      "#ContentPlaceHolder1_ddlPriority",
      priority
    );

    // Status
//   await selectAndWait(
//   page,
//   "#ContentPlaceHolder1_ddlstatus",
//   "Not Started"
// );


    /* =========================
       6️⃣ TITLE & DESCRIPTION
    ========================== */
    await page.fill(
      "#ContentPlaceHolder1_txttitle",
      "TEST – Fault Ticket Creation"
    );

    await page.fill(
      "#ContentPlaceHolder1_txtDesc",
      finalDescription
    );

    /* =========================
       7️⃣ SAVE & READ TICKET ID
    ========================== */
    // await page.click("input[id*='btnSave']");
    await page.click("#ContentPlaceHolder1_btnsave");


    await page.waitForSelector(".sweet-alert", { timeout: 20000 });

    const ticketId = await page.evaluate(() => {
      const tds = [...document.querySelectorAll(".sweet-alert td")];
      const idx = tds.findIndex(td =>
        td.textContent.trim().startsWith("Ticket ID")
      );
      return idx !== -1 ? tds[idx + 1]?.innerText.trim() : null;
    });

    await page.click(".sweet-alert button.confirm");

    if (!ticketId) {
      throw new Error("Ticket ID not found after save");
    }

    console.log("🎫 Ticket created:", ticketId);
    return ticketId;

  } finally {
    // Close later if you want debugging
    await browser.close();
  }
}

/* =====================================================
   ASP.NET SAFE DROPDOWN SELECT (DO NOT MODIFY)
===================================================== */
async function selectAndWait(page, selector, text) {
  // Wait until dropdown exists
  await page.waitForSelector(selector, { timeout: 30000 });

  // Wait until ASP.NET populated options
  await page.waitForFunction(
    sel => {
      const el = document.querySelector(sel);
      return el && el.options.length > 1;
    },
    selector,
    { timeout: 30000 }
  );

  // Select by visible text
  await page.evaluate(({ selector, text }) => {
    const ddl = document.querySelector(selector);
    const opt = [...ddl.options].find(
      o => o.textContent.trim().toLowerCase() === text.toLowerCase()
    );

    if (!opt) {
      throw new Error(`Option "${text}" not found in ${selector}`);
    }

    ddl.value = opt.value;

    // REQUIRED for ASP.NET UpdatePanel
    ddl.dispatchEvent(new Event("change", { bubbles: true }));
  }, { selector, text });

  // ⛔ NOT OPTIONAL
  await page.waitForTimeout(5000);
}
