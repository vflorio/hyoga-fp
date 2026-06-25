import { chromium } from "@playwright/test";

// Launch with anti-automation-detection flags
const browser = await chromium.launch({
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
});

const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
});
const page = await context.newPage();

// Remove navigator.webdriver
await page.addInitScript(() => {
  Object.defineProperty(navigator, "webdriver", { get: () => false });
});

page.on("console", (msg) => {
  const text = msg.text();
  if (
    text.includes("slot breakdown") ||
    text.includes("received") ||
    text.includes("playPreroll") ||
    text.includes("Preroll") ||
    text.includes("AdImpression") ||
    text.includes("SlotImpression") ||
    text.includes("dispatch")
  ) {
    console.log("[CONSOLE]", text);
  }
});

await page.goto("http://localhost:5175");
await page.waitForTimeout(3000);

// Click Play
const btn = page.locator("button").first();
await btn.click();
console.log("Clicked Play");

// Wait for ad response
await page.waitForTimeout(15000);

// Check runtime state
const runtime = await page.evaluate(() => window.__AD_RUNTIME__);
if (runtime) {
  const slots = Object.values(runtime.slots);
  console.log("Slots:", slots.length);
  for (const s of slots) {
    console.log(`  ${s.customId}: tpc=${s.timePositionClass} adCount=${s.adCount} started=${s.started}`);
  }
  console.log("Timeline entries:", runtime.timeline.length);
  const impressions = runtime.timeline.filter((e) => e.eventName === "AdImpression");
  console.log("AdImpressions:", impressions.length);
  const phases = runtime.timeline.filter((e) => e.eventName === "StateChange").map((e) => e.phase);
  console.log("Phase flow:", phases.join(" → "));
} else {
  console.log("No __AD_RUNTIME__ found");
}

await browser.close();
