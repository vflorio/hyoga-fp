import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

page.on("console", async (msg) => {
  const text = msg.text();
  if (text.includes("[DEBUG-SLOTS]") || text.includes("slot breakdown") || text.includes("received")) {
    console.log("[CONSOLE]", text);
  }
});

// Inject BEFORE page loads so patch is in place when SDK initializes
await page.addInitScript(() => {
  let patched = false;
  const observer = new MutationObserver(() => {
    if (patched) return;
    const SDK = window.tv?.freewheel?.SDK;
    if (!SDK) return;
    patched = true;
    observer.disconnect();

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
            try {
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
              console.log(
                "[DEBUG-SLOTS]   PREROLL=" +
                  JSON.stringify(SDK.TIME_POSITION_CLASS_PREROLL) +
                  " match=" +
                  (tpc === SDK.TIME_POSITION_CLASS_PREROLL),
              );
              console.log(
                "[DEBUG-SLOTS]   MIDROLL=" +
                  JSON.stringify(SDK.TIME_POSITION_CLASS_MIDROLL) +
                  " match=" +
                  (tpc === SDK.TIME_POSITION_CLASS_MIDROLL),
              );
              console.log(
                "[DEBUG-SLOTS]   OVERLAY=" +
                  JSON.stringify(SDK.TIME_POSITION_CLASS_OVERLAY) +
                  " match=" +
                  (tpc === SDK.TIME_POSITION_CLASS_OVERLAY),
              );
              console.log(
                "[DEBUG-SLOTS]   POSTROLL=" +
                  JSON.stringify(SDK.TIME_POSITION_CLASS_POSTROLL) +
                  " match=" +
                  (tpc === SDK.TIME_POSITION_CLASS_POSTROLL),
              );
            } catch (e) {
              console.log("[DEBUG-SLOTS] slot[" + i + "] ERROR: " + e.message);
            }
          }
          return slots;
        };
        return ctx;
      };
      return mgr;
    };
    console.log("[DEBUG-SLOTS] AdManager patched");
  });
  observer.observe(document, { childList: true, subtree: true });
});

await page.goto("http://localhost:5174");
await page.waitForTimeout(3000);

// Click Play
const btn = page.locator("button").first();
await btn.click();
console.log("Clicked Play");

await page.waitForTimeout(12000);
await browser.close();
