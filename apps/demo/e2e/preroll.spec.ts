import {
  clickPlay,
  expect,
  getCalls,
  setSlotConfig,
  slotEnded,
  test,
} from "./fixtures";

test.describe("Preroll", () => {
  test("slot plays immediately after clicking Play", async ({ page }) => {
    await page.goto("/");

    await clickPlay(page);

    // requestAds() is async but the mock fires EVENT_REQUEST_COMPLETE synchronously,
    // so we just need to wait for React + the Task microtask to settle.
    await page.waitForFunction(
      () => (window as any).__fwMock.calls.preroll.play === 1,
    );

    const calls = await getCalls(page);
    expect(calls.preroll.play).toBe(1);
    expect(calls.midroll.play).toBe(0);
    expect(calls.postroll.play).toBe(0);
  });

  test("content video src is set after preroll ends", async ({ page }) => {
    await page.goto("/");
    await clickPlay(page);
    await page.waitForFunction(
      () => (window as any).__fwMock.calls.preroll.play === 1,
    );

    // Simulate the SDK firing SLOT_ENDED for the preroll
    await slotEnded(page, "preroll");

    // After preroll ends, player calls video.seek(contentSrc, 0) → sets videoEl.src
    const videoSrc = await page.evaluate(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src || v.currentSrc;
    });

    expect(videoSrc).toContain("bigbuckbunny");
  });

  test("no preroll when slotConfig.preroll = 0 → content starts directly", async ({
    page,
  }) => {
    await page.goto("/");

    await setSlotConfig(page, {
      preroll: 0,
      midroll: 0,
      postroll: 0,
      pauseMidroll: 0,
    });
    await clickPlay(page);

    // No preroll → player calls playContent immediately; video.seek is called
    await page.waitForFunction(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src.length > 0;
    });

    const calls = await getCalls(page);
    expect(calls.preroll.play).toBe(0);
  });
});
