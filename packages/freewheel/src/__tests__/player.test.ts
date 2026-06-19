import type { Logger } from "@hyoga-fp/core";
import { describe, expect, it, vi } from "vitest";
import type * as FW from "../freewheel";
import { createPlayer, type PlayerDeps, type VideoPlayer } from "../player";

// ── SDK constants mock ─────────────────────────────────────────────────────

const SDK: FW.SDK = {
  TIME_POSITION_CLASS_PREROLL: "preroll",
  TIME_POSITION_CLASS_MIDROLL: "midroll",
  TIME_POSITION_CLASS_OVERLAY: "overlay",
  TIME_POSITION_CLASS_POSTROLL: "postroll",
  TIME_POSITION_CLASS_PAUSE_MIDROLL: "pause_midroll",

  ADUNIT_PREROLL: "ADUNIT_PREROLL",
  ADUNIT_MIDROLL: "ADUNIT_MIDROLL",
  ADUNIT_OVERLAY: "ADUNIT_OVERLAY",
  ADUNIT_POSTROLL: "ADUNIT_POSTROLL",
  ADUNIT_PAUSE_MIDROLL: "ADUNIT_PAUSE_MIDROLL",

  EVENT_CONTENT_VIDEO_PAUSE_REQUEST: "evt:pause",
  EVENT_CONTENT_VIDEO_RESUME_REQUEST: "evt:resume",
  EVENT_REQUEST_COMPLETE: "evt:request_complete",
  EVENT_SLOT_ENDED: "evt:slot_ended",
  EVENT_USER_ACTION_NOTIFIED: "evt:user_action",
  EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED: "evt:pause_click",
  EVENT_USER_ACTION_RESUME_BUTTON_CLICKED: "evt:resume_click",

  VIDEO_STATE_PLAYING: "playing",
  VIDEO_STATE_PAUSED: "paused",
  VIDEO_STATE_COMPLETED: "completed",

  PARAMETER_LEVEL_GLOBAL: "global",

  AdManager: class {
    setNetwork() {}
    setServer() {}
    newContext() {
      return null as any;
    }
  },
} as const;

// ── Logger mock ────────────────────────────────────────────────────────────

const noopLogger: Logger = {
  debug: () => () => {},
  info: () => () => {},
  warn: () => () => {},
  error: () => () => {},
};

// ── AdSlot factory ─────────────────────────────────────────────────────────

const makeSlot = (type: string, timePosition = 0, adCount = 1): FW.AdSlot => ({
  getTimePositionClass: () => type,
  getTimePosition: () => timePosition,
  getAdCount: () => adCount,
  play: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
});

// ── AdContext mock factory ─────────────────────────────────────────────────

function makeAdContextMock(slots: FW.AdSlot[] = []) {
  const listeners: Record<string, Array<(e: any) => void>> = {};

  const ctx = {
    setProfile: vi.fn(),
    setVideoAsset: vi.fn(),
    setSiteSection: vi.fn(),
    addTemporalSlot: vi.fn(),
    registerVideoDisplayBase: vi.fn(),
    addKeyValue: vi.fn(),
    setParameter: vi.fn(),
    dispose: vi.fn(),
    setVideoState: vi.fn(),
    dispatchEvent: vi.fn(),

    addEventListener: vi.fn((event: string, handler: (e: any) => void) => {
      (listeners[event] ??= []).push(handler);
    }),

    removeEventListener: vi.fn((event: string, handler: (e: any) => void) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),

    getTemporalSlots: vi.fn(() => slots),

    // Fires EVENT_REQUEST_COMPLETE synchronously so awaitSlots resolves on the
    // next microtask (Promise resolution) without any real network call.
    submitRequest: vi.fn(() => {
      (listeners[SDK.EVENT_REQUEST_COMPLETE] ?? []).forEach((h) =>
        h({ success: true }),
      );
    }),

    // Test helper: fire any SDK event manually
    fire: (event: string, data: unknown) => {
      (listeners[event] ?? []).forEach((h) => h(data));
    },
  } satisfies FW.AdContext & { fire: (e: string, d: unknown) => void };

  return ctx;
}

// ── VideoPlayer mock factory ───────────────────────────────────────────────

function makeVideoMock(src = "content.mp4") {
  const handlers: Record<string, Array<() => void>> = {};

  return {
    play: vi.fn(),
    pause: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    seek: vi.fn((_src: string, _at: number) => vi.fn()),
    enableControls: vi.fn(),
    getSrc: vi.fn(() => src),
    on: vi.fn((event: string, handler: () => void) => {
      (handlers[event] ??= []).push(handler);
      return vi.fn();
    }),
    off: vi.fn((event: string, handler: () => void) => {
      if (handlers[event])
        handlers[event] = handlers[event].filter((h) => h !== handler);
      return vi.fn();
    }),
    // Test helper: fire a DOM event
    fire: (event: string) => {
      (handlers[event] ?? []).forEach((h) => h());
    },
  } satisfies VideoPlayer & { fire: (e: string) => void };
}

// ── Setup helper ───────────────────────────────────────────────────────────

function setup(slots: FW.AdSlot[] = []) {
  const adContext = makeAdContextMock(slots);
  const video = makeVideoMock();
  const onComplete = vi.fn();
  const onOverlayShown = vi.fn();

  const deps: PlayerDeps = {
    SDK,
    adContext,
    video,
    logger: noopLogger,
    onComplete,
    onOverlayShown,
  };

  const player = createPlayer(deps);
  return { player, adContext, video, onComplete, onOverlayShown };
}

const fireSlotEnded = (
  adContext: ReturnType<typeof makeAdContextMock>,
  slot: FW.AdSlot,
) => adContext.fire(SDK.EVENT_SLOT_ENDED, { slot });

// ── Tests ──────────────────────────────────────────────────────────────────

describe("requestAds", () => {
  it("plays the preroll slot when one exists", async () => {
    const preroll = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const { player, video } = setup([preroll]);

    await player.requestAds();

    expect(preroll.play).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });

  it("starts content directly when no slots are returned", async () => {
    const { player, video } = setup([]);

    await player.requestAds();

    expect(video.seek).toHaveBeenCalledWith("content.mp4", 0);
    expect(video.play).toHaveBeenCalledOnce();
  });

  it("registers VIDEO_STATE_PLAYING when content starts", async () => {
    const { player, adContext } = setup([]);

    await player.requestAds();

    expect(adContext.setVideoState).toHaveBeenCalledWith(
      SDK.VIDEO_STATE_PLAYING,
    );
  });
});

describe("preroll → content", () => {
  it("plays content after the preroll slot ends", async () => {
    const preroll = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const { player, adContext, video } = setup([preroll]);

    await player.requestAds();
    fireSlotEnded(adContext, preroll);

    expect(video.seek).toHaveBeenCalledWith("content.mp4", 0);
    expect(video.play).toHaveBeenCalledOnce();
  });

  it("plays a second preroll when multiple preroll slots exist", async () => {
    const preroll1 = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const preroll2 = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const { player, adContext, video } = setup([preroll1, preroll2]);

    await player.requestAds();
    expect(preroll1.play).toHaveBeenCalledOnce();

    fireSlotEnded(adContext, preroll1);
    expect(preroll2.play).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();

    fireSlotEnded(adContext, preroll2);
    expect(video.play).toHaveBeenCalledOnce();
  });
});

describe("midroll", () => {
  async function startContent(slots: FW.AdSlot[]) {
    const ctx = setup(slots);
    await ctx.player.requestAds();
    return ctx;
  }

  it("plays midroll slot when timeupdate fires at its time position", async () => {
    const midroll = makeSlot(SDK.TIME_POSITION_CLASS_MIDROLL, 6);
    const { video } = await startContent([midroll]);

    video.getCurrentTime.mockReturnValue(6.0);
    video.fire("timeupdate");

    expect(midroll.play).toHaveBeenCalledOnce();
  });

  it("does not trigger midroll before its time position", async () => {
    const midroll = makeSlot(SDK.TIME_POSITION_CLASS_MIDROLL, 6);
    const { video } = await startContent([midroll]);

    video.getCurrentTime.mockReturnValue(2.0);
    video.fire("timeupdate");

    expect(midroll.play).not.toHaveBeenCalled();
  });

  it("resumes content at the saved position after midroll ends", async () => {
    const midroll = makeSlot(SDK.TIME_POSITION_CLASS_MIDROLL, 6);
    const { adContext, video } = await startContent([midroll]);

    video.getCurrentTime.mockReturnValue(6.0);
    video.fire("timeupdate");
    expect(midroll.play).toHaveBeenCalledOnce();

    fireSlotEnded(adContext, midroll);

    // video.seek(contentSrc, 6.0) — resumes at the saved position
    expect(video.seek).toHaveBeenCalledWith("content.mp4", 6.0);
    // video.play is called twice: once for initial content, once after midroll
    expect(video.play).toHaveBeenCalledTimes(2);
  });
});

describe("postroll", () => {
  it("plays postroll when content ends", async () => {
    const postroll = makeSlot(SDK.TIME_POSITION_CLASS_POSTROLL);
    const { player, video } = setup([postroll]);

    await player.requestAds(); // no preroll → content starts immediately
    video.fire("ended");

    expect(postroll.play).toHaveBeenCalledOnce();
  });

  it("calls onComplete after the last postroll ends", async () => {
    const postroll = makeSlot(SDK.TIME_POSITION_CLASS_POSTROLL);
    const { player, adContext, video, onComplete } = setup([postroll]);

    await player.requestAds();
    video.fire("ended");

    fireSlotEnded(adContext, postroll);

    expect(onComplete).toHaveBeenCalledOnce();
  });
});

describe("pause / resume", () => {
  it("pause() during Content with pause-midroll dispatches the SDK pause event", async () => {
    const pauseMidroll = makeSlot(SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL, 0, 1);
    const { player, adContext } = setup([pauseMidroll]);

    await player.requestAds(); // no preroll → content starts

    player.pause();

    expect(adContext.dispatchEvent).toHaveBeenCalledWith(
      SDK.EVENT_USER_ACTION_NOTIFIED,
      {
        action: SDK.EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED,
      },
    );
  });

  it("pause() during Content without pause-midroll pauses the video", async () => {
    const { player, video } = setup([]); // no slots → content starts

    await player.requestAds();
    player.pause();

    expect(video.pause).toHaveBeenCalledOnce();
    // No SDK event dispatched
  });

  it("resume() during Content plays the video", async () => {
    const { player, video } = setup([]);

    await player.requestAds();
    player.pause();
    player.resume();

    expect(video.play).toHaveBeenCalledTimes(2); // once on start, once on resume
  });

  it("pause() during Preroll pauses the ad slot", async () => {
    const preroll = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const { player } = setup([preroll]);

    await player.requestAds();
    player.pause();

    expect(preroll.pause).toHaveBeenCalledOnce();
  });

  it("resume() during Preroll resumes the ad slot", async () => {
    const preroll = makeSlot(SDK.TIME_POSITION_CLASS_PREROLL);
    const { player } = setup([preroll]);

    await player.requestAds();
    player.pause();
    player.resume();

    expect(preroll.resume).toHaveBeenCalledOnce();
  });

  it("resume() during PauseMidroll transitions phase and dispatches resume event", async () => {
    const pauseMidroll = makeSlot(SDK.TIME_POSITION_CLASS_PAUSE_MIDROLL, 0, 1);
    const { player, adContext } = setup([pauseMidroll]);

    await player.requestAds();
    player.pause(); // → PauseMidroll phase
    player.resume(); // → Content phase (video will play when slot ends)

    expect(adContext.dispatchEvent).toHaveBeenCalledWith(
      SDK.EVENT_USER_ACTION_NOTIFIED,
      {
        action: SDK.EVENT_USER_ACTION_RESUME_BUTTON_CLICKED,
      },
    );
  });
});
