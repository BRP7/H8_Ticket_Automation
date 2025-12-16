import { chromium } from "playwright";

export async function createH8Ticket(circuitId) {
  const browser = await chromium.launch({
    headless: false, // keep visible for demo
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("🌐 Opening H8...");

  await page.goto("http://admin.optimaltele.net/Login.aspx", {
    waitUntil: "networkidle",
  });


  // 2️⃣ Login
  await page.fill("#username", process.env.H8_USERNAME);
  await page.fill("#password", process.env.H8_PASSWORD);
  await page.click("#loginButton");

  // 3️⃣ Wait for dashboard
  await page.waitForSelector("#dashboard");

  // 4️⃣ Go to ticket creation
  await page.click("text=Tickets");
  await page.click("text=Create Ticket");

  // 5️⃣ Fill ticket form
  await page.waitForSelector("#circuitIdInput");
  await page.fill("#circuitIdInput", circuitId);

  // Example: select default issue
  await page.selectOption("#issueType", "DEFAULT");

  // 6️⃣ Submit
  await page.click("#submitTicket");

  // 7️⃣ Confirm success
  await page.waitForSelector(".success-message");

  console.log(`🎫 H8 Ticket created for ${circuitId}`);

  await browser.close();
}
