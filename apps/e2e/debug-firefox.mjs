import { firefox } from "@playwright/test";

const browser = await firefox.launch({ headless: false });
const page = await browser.newPage();

page.on("console", (msg) => {
  const text = msg.text();
  if (
    text.includes("slot breakdown") ||
    text.includes("received") ||
    text.includes("playPreroll") ||
    text.includes("AdImpression") ||
    text.includes("dispatch")
  ) {
    console.log("[CONSOLE]", text);
  }
});

await page.goto("http://localhost:5173");
await page.waitForTimeout(3000);

const btn = page.locator("button").first();
await btn.click();
console.log("Clicked Play");

// Wait for session to complete (up to 90s)
try {
  await page.waitForFunction(
    () => {
      const rt = window.__AD_RUNTIME__;
      if (!rt) return false;
      return rt.endTimestamp != null || rt.timeline.some((e) => e.eventName === "Complete");
    },
    { timeout: 90_000 },
  );
  console.log("Session completed!");
} catch {
  console.log("Session did not complete within 90s, dumping current state...");
}

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
