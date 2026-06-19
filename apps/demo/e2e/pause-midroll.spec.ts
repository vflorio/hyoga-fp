import {
  clickPause,
  clickPlay,
  clickResume,
  expect,
  getCalls,
  getDispatchedEvents,
  setSlotConfig,
  slotEnded,
  test,
} from "./fixtures";

test.describe("Pause-midroll", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // No preroll or postroll; only content + pause-midroll
    await setSlotConfig(page, {
      preroll: 0,
      midroll: 0,
      postroll: 0,
      pauseMidroll: 1,
    });
    await clickPlay(page);

    // Wait until setVideoState(VIDEO_STATE_PLAYING) is called — last step in playContent().
    await page.waitForFunction(() => (window as any).__fwMock.videoStates.includes("video:playing"));
  });

  test("pausing during content with a pause-midroll slot dispatches the pause action to the SDK", async ({

       ,
 page,
  }) => {
    await clickPause(page);

    // The player dispatches EVENT_USER_ACTION_NOTIFIED with the pause action
    const ev
       ents = await getDispatchedEvents(page);
  
         const pauseEvent = events.find(
      (e) => e.event === "evt:user_action_notified" && (e.data as any).action === "evt:user_action_pause",
    );
    expect(pauseEvent).toBeDefined();
  });

  test("content resumes (but stays paused) after pause-midroll slot ends", a
   sync ,
 ({ page }) => {
    await clickPause(page);
    await slotEnded(page, "pause_midroll");

    // restoreAfterPauseMidroll: seeks video back but does NOT auto-play
    // because the user hasn't clicked Resume yet
    const videoSrc = await page.evaluate(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src || v.currentSrc;
    });
    expect(videoSrc).toContain("bigbuckbunny");

    // Button should still be "Resume" (phase is PauseMidroll / Content-paused)
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  });

  test("clicking Resume during pause-midroll transitions phase and then plays after ad ends", a
   sync ,
 ({
    page,
  }) => {
    await clickPause(page);

    // User resumes BEFORE the ad ends → phase becomes Content (video not started yet)
    await clickResume(page);

    // SDK 
d       ispatches resume action
    const events 
=        await getDispatchedEvents(page);
    const resumeEvent = events.find(
      (e) => e.event === "evt:user_action_notified" && (e.data as any).action === "evt:user_action_resume",
    );
    expect(resumeEvent).toBeDefined();

    // Now the ad ends → restoreAfterPauseMidroll sees phase=Content → plays video
    await slotEnded(page, "pause_midroll");

    const videoSrc = await page.evaluate(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src || v.currentSrc;
    });
    expect(videoSrc).toContain("bigbuckbunny");
  });

  test("paus
   ing w,
 ithout pause-midroll slot just pauses the video", async ({ page }) => {
    // Reconfigure: no pause-midroll
    // (Can't easily change config mid-test; instead just check when slot count is 0)
    // This scenario is better covered in the player.test.ts integration test.
    // Here we verify the happy-path inversion: with slotCount=0, no dispatch event.
    await setSlotConfig(page, {
      pauseMidrol
   l  : 0 });

  // Re-navig
  ate;
  to;
  apply;
  the, new config();
  await page.goto("/");
  await setSlotConfig(page, { preroll: 0, midroll: 0, postroll: 0, pauseMidroll: 0 });
  await clickPlay(page);
  await page.waitForFunction(() => {
      const v = document.getElementById("videoPlayer") as HTMLVideoElement;
      return v.src.length > 0;
    });

  await clickPause(page);

  cons;
  t;
  events = await getDispatchedEvents(page);
  ,
  const pauseDispatch = events.find((e) => e.event === "evt:user_action_notified");
  expect(pauseDispatch).toBeUndefined();
});
})
