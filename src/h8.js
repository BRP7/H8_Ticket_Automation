import { chromium } from "playwright";

export async function createH8Ticket(circuitId) {
  const browser = await chromium.launch({
    headless: false, // MUST be false for H8 (ASP.NET + JS heavy)
    slowMo: 50,      // helps stability
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  /* =========================
     1️⃣ LOGIN
  ========================== */
  await page.goto("http://admin.optimaltele.net/Login.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  await page.fill("#txtUserName", process.env.H8_USERNAME);
  await page.fill("#txtPassword", process.env.H8_PASSWORD);

  await page.click("#save");

  // IMPORTANT: ASP.NET postback → DO NOT use networkidle
  await page.waitForTimeout(6000);

  /* =========================
     2️⃣ GO TO NEW CASE
  ========================== */
  await page.goto("http://admin.optimaltele.net/NewCase.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  /* =========================
     3️⃣ SELECT "LEASE ACCOUNT"
     Correct ASP.NET selector
  ========================== */
  await page.waitForSelector("select[id*='ddlAccountnam']", {
    timeout: 20000,
  });

  await page.evaluate(() => {
    const ddl = document.querySelector("select[id*='ddlAccountnam']");
    if (!ddl) throw new Error("ddlAccountnam dropdown not found");

    const option = [...ddl.options].find(
      (o) => o.textContent.trim() === "Lease Account"
    );

    if (!option) throw new Error("Lease Account option not found");

    ddl.value = option.value;
    ddl.dispatchEvent(new Event("change", { bubbles: true }));
  });

  // ASP.NET partial postback delay
  await page.waitForTimeout(5000);

/* =========================
   4️⃣ WAIT + ENTER CIRCUIT ID
   (ASP.NET dynamic field)
========================= */

await page.waitForTimeout(6000); // allow postback to finish

/* =========================
   4️⃣ WAIT + ENTER CIRCUIT ID
========================= */

await page.waitForTimeout(6000); // let ASP.NET postback finish

await page.evaluate((circuitId) => {
  const input = document.querySelector(
    "input[id*='txtLeasecircuit']"
  );

  if (!input) {
    throw new Error("txtLeasecircuit input not found");
  }

  input.focus();
  input.value = circuitId;

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}, circuitId);

// allow backend lookup to auto-fill customer/location
await page.waitForTimeout(6000);


  /* =========================
     5️⃣ REQUIRED FIELDS
     (safe index-based)
  ========================== */
  await page.selectOption("select[id*='ddlCaseReason']", { index: 1 });
  await page.waitForTimeout(1500);

  await page.selectOption("select[id*='ddlSubCategory']", { index: 1 });
  await page.waitForTimeout(1500);

  await page.selectOption("select[id*='ddlPriority']", { label: "Medium" });
  await page.waitForTimeout(1500);

  /* =========================
     6️⃣ SAVE TICKET
     (commented for safety)
  ========================== */

  // await page.click("input[id*='btnSave']");
  // await page.waitForTimeout(6000);

  console.log(`🎫 H8 ticket flow completed for Circuit ID: ${circuitId}`);

  await browser.close();
}
