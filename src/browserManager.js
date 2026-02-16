import { chromium } from "playwright";
import { writeLog } from "./utils/logger.js";

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || "3");
const CONTEXT_WAIT_TIMEOUT = 60000; // 60 seconds max wait

let browser = null;
let pool = [];
let initializing = false;

/* =====================================================
   INIT BROWSER POOL
===================================================== */

async function initBrowserPool() {
  if (browser) return;

  writeLog({
    level: "info",
    type: "BROWSER_POOL_INIT",
    message: `Initializing browser pool (size=${POOL_SIZE})`
  });

  // browser = await chromium.launch({
  //   headless: true
  // });

  browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu"
  ]
});

  browser.on("disconnected", async () => {
    writeLog({
      level: "error",
      type: "BROWSER_CRASH",
      message: "Browser disconnected — reinitializing"
    });

    browser = null;
    pool = [];
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

    writeLog({
      level: "info",
      type: "BROWSER_CONTEXT_READY",
      message: `Context ${i + 1} ready`
    });
  }

  writeLog({
    level: "info",
    type: "BROWSER_POOL_READY",
    message: "Browser pool initialized"
  });
}

/* =====================================================
   LOGIN PER CONTEXT
===================================================== */

async function loginContext(context) {
  const page = await context.newPage();

  try {
    await page.goto("http://admin.optimaltele.net/Login.aspx", {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    await page.fill("#txtUserName", process.env.H8_USERNAME);
    await page.fill("#txtPassword", process.env.H8_PASSWORD);
    await page.click("#save");

    await page.waitForTimeout(4000);

  } finally {
    await page.close();
  }
}

/* =====================================================
   ACQUIRE CONTEXT
===================================================== */

export async function acquireContext() {
  if (!browser) {
    if (initializing) {
      while (!browser) {
        await delay(200);
      }
    } else {
      initializing = true;
      await initBrowserPool();
      initializing = false;
    }
  }

  const start = Date.now();

  while (true) {
    const free = pool.find(p => !p.busy);

    if (free) {
      free.busy = true;
      return free.context;
    }

    if (Date.now() - start > CONTEXT_WAIT_TIMEOUT) {
      throw new Error("BROWSER_POOL_TIMEOUT");
    }

    await delay(200);
  }
}

/* =====================================================
   RELEASE CONTEXT
===================================================== */

export function releaseContext(context) {
  const item = pool.find(p => p.context === context);
  if (item) {
    item.busy = false;
  }
}

/* =====================================================
   CLEAN SHUTDOWN
===================================================== */

export async function closeBrowserPool() {
  if (browser) {
    writeLog({
      level: "info",
      type: "BROWSER_POOL_SHUTDOWN",
      message: "Closing browser pool"
    });

    await browser.close();
    browser = null;
    pool = [];
  }
}

/* =====================================================
   UTILS
===================================================== */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
