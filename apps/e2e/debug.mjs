import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

page.on("console", (msg) => console.log("[CONSOLE]", msg.type(), msg.text()));
page.on("pageerror", (err) => console.log("[PAGE-ERROR]", err.message));

await page.goto("http://localhost:5175");
await page.waitForTimeout(2000);

// Check SDK
const sdkLoaded = await page.evaluate(() => !!window.tv?.freewheel?.SDK);
console.log("SDK loaded:", sdkLoaded);

// Find and click the button
const buttons = await page.locator("button").all();
console.log("Buttons found:", buttons.length);
for (const btn of buttons) {
  console.log("  Button:", await btn.textContent());
}

// Click first button
if (buttons.length > 0) {
  await buttons[0].click();
  console.log("Clicked first button");
}

// Wait and check runtime
await page.waitForTimeout(10000);
const runtime = await page.evaluate(() => window.__AD_RUNTIME__);
console.log("Timeline entries:", runtime?.timeline?.length);
console.log("Timeline:", JSON.stringify(runtime?.timeline?.slice(0, 5), null, 2));

await browser.close();
