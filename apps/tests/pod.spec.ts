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

  // Gli eventi playwright.state vengono emessi dal useFreeWheelPlayer sottoforma di fetch per notificare playwright che lo stato è cambiato

  await page.goto("http://localhost:5173");

  //  const onInit = await page.waitForRequest("**/playwright.state.Init");
  //  await expect(await onInit).toBeDefined();

  // Mandiamo in parallelo
  const [fwRequest] = await Promise.all([
    // https://{id}.v.fwmrm.net/ad/g/1?prof
    page.waitForRequest("**/ad/g/1?prof=**"),
    // La richiesta ad avviene al click sul play (che chiama .requestAds())
    page.getByRole("button", { name: "Play" }).click(),
  ]);

  await expect(fwRequest).toBeDefined();

  // playwright.adsData
  const adsDataRequest = await page.waitForRequest("**/playwright.adsData");
  const adsPostData = adsDataRequest.postData()!;

  const adsData: {
    preroll: number[];
    midroll: number[];
    overlay: number[];
    postroll: number[];
    pauseMidroll: number[];
  } = JSON.parse(adsPostData);

  // Lo stato cambia una sola volta per tipo, quindi dobbiamo cumulare l'attesa di ogni slots

  // TODO: gestire evento Init

  // Preroll

  if (adsData.preroll.length > 0) {
    const onPreroll = await page.waitForRequest("**/playwright.state.Preroll");
    await expect(onPreroll).toBeDefined();

    await page.waitForTimeout((adsData.preroll.reduce((a, b) => a + b, 0) || 1) * 1000);

    // Resume Content

    const onContentAfterPreroll = await page.waitForRequest("**/playwright.state.Content");
    await expect(onContentAfterPreroll).toBeDefined();
  }

  // Midrolls

  if (adsData.midroll.length > 0) {
    const onMidroll = await page.waitForRequest("**/playwright.state.Midroll");
    await expect(onMidroll).toBeDefined();

    await page.waitForTimeout((adsData.midroll.reduce((a, b) => a + b, 0) || 1) * 1000);

    // Resume Content after Midroll

    const onContentAfterMidroll = await page.waitForRequest("**/playwright.state.Content");
    await expect(onContentAfterMidroll).toBeDefined();
  }

  // Pause Midrolls

  for (const pauseMidroll of adsData.pauseMidroll) {
    const [pausedRequest] = await Promise.all([
      // https://{id}.v.fwmrm.net/ad/g/1?prof
      page.waitForRequest("**/playwright.state.PauseMidroll"),
      // La richiesta ad avviene al click sul play (che chiama .requestAds())
      page.getByRole("button", { name: "Pause" }).click(),
    ]);

    // Midroll duration = 0 means that when we pause the use sees a overlay and not a Slot
    await page.waitForTimeout((pauseMidroll || 1) * 1000);

    await page.getByRole("button", { name: "Resume" }).click();

    await expect(pausedRequest).toBeDefined();
  }

  // Postroll

  if (adsData.postroll.length > 0) {
    const onPostroll = await page.waitForRequest("**/playwright.state.Postroll");
    await expect(onPostroll).toBeDefined();

    // FIXME TODO
    //await page.waitForTimeout((adsData.postroll.reduce((a, b) => a + b, 0) || 1) * 1000);

    // Resume Content after Postroll

    const onContentAfterPostroll = await page.waitForRequest("**/playwright.state.Content");
    await expect(onContentAfterPostroll).toBeDefined();
  }

  // Enter Done

  const onDone = await page.waitForRequest("**/playwright.state.Done");
  await expect(onDone).toBeDefined();
});
