import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __playwrightStates: Record<string, boolean>;
  }
}

const videoDuration = 60_000;
const prerollDuration = 30_000;
const midrollDuration = 30_000;
const postrollDuration = 40_000;

const completeDuration = prerollDuration + midrollDuration + postrollDuration + videoDuration;

// TODO: Gestire le overlays

test("AD Pod Plays", async ({ page }) => {
  test.setTimeout(completeDuration);

  page.on("console", console.log);

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => false,
    });
  });

  // Gli eventi e2e.state vengono emessi dal useFreeWheelPlayer sottoforma di fetch per notificare playwright che lo stato è cambiato

  await page.goto("http://localhost:5173");

  //  const onInit = await page.waitForRequest("**/e2e.state.Init");
  //  await expect(await onInit).toBeDefined();

  const adsData = await test.step("Request FreeWheel ADs Pod", async () => {
    // Mandiamo in parallelo
    const [fwRequest] = await Promise.all([
      // https://{id}.v.fwmrm.net/ad/g/1?prof
      page.waitForRequest("**/ad/g/1?prof=**"),
      // La richiesta ad avviene al click sul play (che chiama .requestAds())
      page.getByRole("button", { name: "Play" }).click(),
    ]);

    await expect(fwRequest).toBeDefined();

    // e2e.adsData
    const adsDataRequest = await page.waitForRequest("**/e2e.adsData");
    const adsPostData = adsDataRequest.postData()!;

    const data: {
      prerolls: { timePosition: number; timePositionEnd: number; totalDuration: number }[];
      midrolls: { timePosition: number; timePositionEnd: number; totalDuration: number }[];
      overlays: { timePosition: number; timePositionEnd: number; totalDuration: number }[];
      postrolls: { timePosition: number; timePositionEnd: number; totalDuration: number }[];
      pauseMidrolls: { timePosition: number; timePositionEnd: number; totalDuration: number }[];
    } = JSON.parse(adsPostData);

    return data;
  });

  // Lo stato cambia una sola volta per tipo, quindi dobbiamo cumulare l'attesa di ogni slots

  // TODO: gestire evento Init

  // Preroll

  if (adsData.prerolls.length > 0) {
    await test.step(`Enter Phase -> Preroll (${adsData.prerolls.length})`, async () => {
      const onPreroll = await page.waitForRequest("**/e2e.state.Preroll");
      await expect(onPreroll).toBeDefined();

      // FIXME TODO
      // await page.waitForTimeout((adsData.preroll.reduce((a, b) => a + b, 0) || 1) * 1000);
    });

    await test.step("Resume Phase -> Content (after Preroll)", async () => {
      const onContentAfterPreroll = await page.waitForRequest("**/e2e.state.Content");
      await expect(onContentAfterPreroll).toBeDefined();
    });
  }

  // Midrolls

  if (adsData.midrolls.length > 0) {
    await test.step(`Enter Phase -> Midroll (${adsData.midrolls.length})`, async () => {
      const onMidroll = await page.waitForRequest("**/e2e.state.Midroll");
      await expect(onMidroll).toBeDefined();

      // FIXME TODO
      // await page.waitForTimeout((adsData.midroll.reduce((a, b) => a + b, 0) || 1) * 1000);
    });

    await test.step("Resume Phase -> Content (after Midroll)", async () => {
      const onContentAfterMidroll = await page.waitForRequest("**/e2e.state.Content");
      await expect(onContentAfterMidroll).toBeDefined();
    });
  }

  // Pause Midrolls

  for (const pauseMidroll of adsData.pauseMidrolls) {
    await test.step(`Enter Phase -> PauseMidroll (static=${pauseMidroll.timePosition === 0})`, async () => {
      const [pausedRequest] = await Promise.all([
        page.waitForRequest("**/e2e.state.PauseMidroll"),
        page.getByRole("button", { name: "Pause" }).click(),
      ]);

      // Midroll duration = 0 means that when we pause the use sees a overlay and not a Slot
      await page.waitForTimeout((pauseMidroll.timePosition || 1) * 1000);

      await page.getByRole("button", { name: "Resume" }).click();

      await expect(pausedRequest).toBeDefined();
    });

    await test.step("Resume Phase -> Content (after PauseMidroll)", async () => {
      const onContentAfterPauseMidroll = await page.waitForRequest("**/e2e.state.Content");
      await expect(onContentAfterPauseMidroll).toBeDefined();
    });
  }

  // Postroll

  if (adsData.postrolls.length > 0) {
    await test.step(`Enter Phase -> Postroll (${adsData.postrolls.length})`, async () => {
      const onPostroll = await page.waitForRequest("**/e2e.state.Postroll");
      await expect(onPostroll).toBeDefined();

      // FIXME TODO
      // await page.waitForTimeout((adsData.postroll.reduce((a, b) => a + b, 0) || 1) * 1000);
    });
  }

  // Done
  // TODO FIXME: Questo va spostato in uno scenario di test del dispose (client-side routing, dialog close, app reloads, etc)
  // await test.step("Done", async () => {
  //   const onDone = await page.waitForRequest("**/e2e.state.Done");
  //   await expect(onDone).toBeDefined();
  // });
});
