import {
  clickPlay,
  expect,
  getCalls,
  getVideoStates,
  setSlotConfig,
  slotEnded,
  test,
  timeupdate,
} from "./fixtures";

test.describe("Midroll", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // No preroll so content starts immediately, making setup simpler
    await setSlotConfig(page, {
      preroll: 0,
      midroll: 1,
      midrollAt: 6,
      postroll: 0,
      pauseMidroll: 0,
    });
    await clickPlay(page);

    // Wait until setVideoState(VIDEO_STATE_PLAYING) is called — the last step in
    // playContent(), meaning addVideoListeners has already run.
    await page.waitForFunction(() =>
      (window as any).__fwMock.videoStates.includes("video:playing"),
    );
  });

  test("midroll slot plays when timeupdate fires at the slot's time position", async ({
    page,
  }) => {
    await timeupdate(page, 6.0);

    await page.waitForFunction(
      () => (window as any).__fwMock.calls.midroll.play === 1,
    );

    const calls = await getCalls(page);
    expect(calls.midroll.play).toBe(1);
  });

  test("midroll does not trigger before its time position", async ({
    page,
  }) => {
    await timeupdate(page, 3.0); // 3 s before midroll at 6 s

    const calls = await getCalls(page);
    expect(calls.midroll.play).toBe(0);
  });

  test("content resumes at the saved position after midroll ends", async ({
    page,
  }) => {
    // Fire midroll
    await timeupdate(page, 6.0);
    await page.waitForFunction(
      () => (window as any).__fwMock.calls.midroll.play === 1,
    );

    // End the midroll; restoreAfterMidroll → playContent(src, 6) → setVideoState(playing) again
    const statesBefore = (await page.evaluate(
      () => (window as any).__fwMock.videoStates.length,
    )) as number;
    await slotEnded(page, "midroll");

    // Wait for the second VIDEO_STATE_PLAYING signal (content resumed after midroll)
    await page.waitForFunction(
      (n) => (window as any).__fwMock.videoStates.length > n,
      statesBefore,
    );

    const videoSrc = await page.evaluate(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src || v.currentSrc;
    });
    expect(videoSrc).toContain("bigbuckbunny");
  });

  test("midroll only fires once even if timeupdate fires repeatedly near the same time", async ({
    page,
  }) => {
    // Fire timeupdate multiple times near t=6
    for (const t of [5.8, 6.0, 6.1]) {
      await timeupdate(page, t);
    }

    // dropOverlayNear / the popMidroll removes the slot from the queue after first match
    const calls = await getCalls(page);
    expect(calls.midroll.play).toBe(1);
  });
});
