import { chromium } from "playwright";
import { sanitizeForAspNet } from "./utils/sanitizeText.js";
import { extractLatestMessage } from "./utils/extractLatestMessage.js";

export async function createH8Ticket(data) {

  const {
    circuitId,
    caseReasonCategory,
    subCategory,
    subSubCategory,
    originalEmailBody,
    subject,
    from
  } = data;

  if (!circuitId) throw new Error("Missing circuitId");

  const cleanedBody = extractLatestMessage(originalEmailBody || "");

  const rawDescription = `
Subject: ${subject || "-"}
From: ${from || "-"}

------------------------------

${cleanedBody || "No content"}
`.trim();

  const finalDescription = sanitizeForAspNet(rawDescription).slice(0, 3500);

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  try {

    /* LOGIN */
    await page.goto("http://admin.optimaltele.net/Login.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.fill("#txtUserName", process.env.H8_USERNAME);
    await page.fill("#txtPassword", process.env.H8_PASSWORD);
    await page.click("#save");

    await page.waitForTimeout(5000);

    /* NEW CASE */
    await page.goto("http://admin.optimaltele.net/NewCase.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    /* LEASE ACCOUNT */
    await page.waitForSelector("select[id*='ddlAccountnam']", { timeout: 30000 });

    await page.evaluate(() => {
      const ddl = document.querySelector("select[id*='ddlAccountnam']");
      const option = [...ddl.options].find(
        o => o.textContent.trim() === "Lease Account"
      );
      ddl.value = option.value;
      ddl.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.waitForTimeout(4000);

    /* CIRCUIT */
    await page.waitForSelector("input[id*='txtLeasecircuit']", { timeout: 30000 });

    await page.evaluate((circuitId) => {
      const input = document.querySelector("input[id*='txtLeasecircuit']");
      input.value = circuitId;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, circuitId);

    await page.waitForTimeout(5000);

    /* DROPDOWNS */
    await selectAndWait(page, "#ContentPlaceHolder1_ddlCategory", caseReasonCategory);
    await selectAndWait(page, "#ContentPlaceHolder1_ddlsubCategory", subCategory);
    await selectAndWait(page, "#ContentPlaceHolder1_ddlSubSubCategory", subSubCategory);

    /* TITLE + DESC */
    await page.fill("#ContentPlaceHolder1_txttitle", "Automated Fault Ticket");
    await page.fill("#ContentPlaceHolder1_txtDesc", finalDescription);

    /* SAVE */
    await page.click("#ContentPlaceHolder1_btnsave");

    const duplicateBanner = page.locator("text=Case is already open");

    try {
      await Promise.race([
        page.waitForSelector(".sweet-alert", { timeout: 20000 }),
        duplicateBanner.waitFor({ timeout: 20000 })
      ]);
    } catch {
      throw new Error("UNKNOWN_SAVE_RESULT");
    }

    if (await duplicateBanner.isVisible()) {
      const err = new Error("DUPLICATE_CASE");
      err.code = "DUPLICATE_CASE";
      throw err;
    }

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
    await browser.close();
  }
}

async function selectAndWait(page, selector, text) {

  await page.waitForSelector(selector, { timeout: 30000 });

  await page.waitForFunction(
    sel => {
      const el = document.querySelector(sel);
      return el && el.options.length > 1;
    },
    selector
  );

  await page.evaluate(
    ({ selector, text }) => {
      const ddl = document.querySelector(selector);
      const opt = [...ddl.options].find(
        o => o.textContent.trim().toLowerCase() === text.toLowerCase()
      );
      ddl.value = opt.value;
      ddl.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selector, text }
  );

  await page.waitForTimeout(4000);
}
