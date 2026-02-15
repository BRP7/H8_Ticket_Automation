// import { chromium } from "playwright";

// let browser;
// let context;
// let initializing = false;

// export async function getBrowserContext() {
//   if (context) return context;

//   if (initializing) {
//     while (!context) {
//       await new Promise(r => setTimeout(r, 200));
//     }
//     return context;
//   }

//   initializing = true;

//   browser = await chromium.launch({
//     headless: true
//   });

//   context = await browser.newContext({
//     ignoreHTTPSErrors: true
//   });

//   console.log("🌐 Playwright browser initialized");

//   return context;
// }



import { chromium } from "playwright";

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || "3");

let browser;
let pool = [];
let initializing = false;

/**
 * Initialize browser and context pool
 */
async function initBrowserPool() {
  if (browser) return;

  console.log("🌐 Initializing browser pool...");

  browser = await chromium.launch({
    headless: true
  });

  for (let i = 0; i < POOL_SIZE; i++) {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true
    });

    await loginContext(context);

    pool.push({
      context,
      busy: false
    });

    console.log(`✅ Context ${i + 1} ready`);
  }

  console.log(`🚀 Browser pool initialized with ${POOL_SIZE} contexts`);
}

/**
 * Login once per context
 */
async function loginContext(context) {
  const page = await context.newPage();

  await page.goto("http://admin.optimaltele.net/Login.aspx", {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await page.fill("#txtUserName", process.env.H8_USERNAME);
  await page.fill("#txtPassword", process.env.H8_PASSWORD);
  await page.click("#save");

  await page.waitForTimeout(4000);
  await page.close();
}

/**
 * Get free context from pool
 */
export async function acquireContext() {
  if (!browser) {
    if (initializing) {
      while (!browser) {
        await new Promise(r => setTimeout(r, 200));
      }
    } else {
      initializing = true;
      await initBrowserPool();
      initializing = false;
    }
  }

  while (true) {
    const free = pool.find(p => !p.busy);
    if (free) {
      free.busy = true;
      return free.context;
    }

    await new Promise(r => setTimeout(r, 200));
  }
}

/**
 * Release context back to pool
 */
export function releaseContext(context) {
  const item = pool.find(p => p.context === context);
  if (item) {
    item.busy = false;
  }
}
