import { chromium } from "playwright";

let browser;
let context;
let initializing = false;

export async function getBrowserContext() {
  if (context) return context;

  if (initializing) {
    while (!context) {
      await new Promise(r => setTimeout(r, 200));
    }
    return context;
  }

  initializing = true;

  browser = await chromium.launch({
    headless: true
  });

  context = await browser.newContext({
    ignoreHTTPSErrors: true
  });

  console.log("🌐 Playwright browser initialized");

  return context;
}
