import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

page.on("console", async (msg) => {
  const text = msg.text();
  if (text.includes("[DEBUG-SLOTS]") || text.includes("slot breakdown") || text.includes("received")) {
    // For objects, try to get the JSON
    const args = msg.args();
    const vals = await Promise.all(args.map((a) => a.jsonValue().catch(() => a.toString())));
    console.log("[CONSOLE]", ...vals);
  }
});

await page.goto("http://localhost:5173");
await page.waitForTimeout(2000);

// Monkey-patch AdManager prototype to intercept getTemporalSlots on any context
await page.evaluate(() => {
  const SDK = window.tv?.freewheel?.SDK;
  if (!SDK) {
    console.log("[DEBUG-SLOTS] SDK not found");
    return;
  }
  // Intercept AdManager constructor
  const OrigAdManager = SDK.AdManager;
  SDK.AdManager = () => {
    const mgr = new OrigAdManager();
    const origNewCtx = mgr.newContext.bind(mgr);
    mgr.newContext = () => {
      const ctx = origNewCtx();
      const origGetTS = ctx.getTemporalSlots.bind(ctx);
      ctx.getTemporalSlots = () => {
        const slots = origGetTS();
        console.log("[DEBUG-SLOTS] getTemporalSlots returned " + slots.length + " slots");
        for (let i = 0; i < slots.length; i++) {
          const s = slots[i];
          const tpc = s.getTimePositionClass();
          const tp = s.getTimePosition();
          const customId = s.getCustomId();
          const adCount = s.getAdCount();
          console.log(
            "[DEBUG-SLOTS] slot[" +
              i +
              "]: customId=" +
              customId +
              " tpc=" +
              JSON.stringify(tpc) +
              " (type=" +
              typeof tpc +
              ") tp=" +
              tp +
              " adCount=" +
              adCount,
          );
          // Check all constants
          const consts = {
            PREROLL: SDK.TIME_POSITION_CLASS_PREROLL,
            MIDROLL: SDK.TIME_POSITION_CLASS_MIDROLL,
            OVERLAY: SDK.TIME_POSITION_CLASS_OVERLAY,
            POSTROLL: SDK.TIME_POSITION_CLASS_POSTROLL,
            PAUSE_MIDROLL: SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL,
          };
          for (const [name, val] of Object.entries(consts)) {
            if (tpc === val) {
              console.log("[DEBUG-SLOTS]   -> MATCHES " + name);
            }
          }
          console.log("[DEBUG-SLOTS]   consts: " + JSON.stringify(consts));
        }
        return slots;
      };
      return ctx;
    };
    return mgr;
  };
  console.log("[DEBUG-SLOTS] AdManager patched");
});

// Click Play
const btn = page.locator("button").first();
await btn.click();
console.log("Clicked Play");

await page.waitForTimeout(12000);
await browser.close();
