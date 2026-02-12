import { chromium } from "playwright";

(async () => {
  try {
    const browser = await chromium.launch({
      headless: false,
    });

    const page = await browser.newPage();
    await page.goto("https://google.com");
    console.log("Browser opened OK");
  } catch (e) {
    console.error("Browser failed:", e);
  }
})();
