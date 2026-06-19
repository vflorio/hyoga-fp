/**
 * FreeWheel SDK mock injected by Playwright via addInitScript().
 * Runs before any page script, so it is in place when the React app boots.
 *
 * Exposes window.__fwMock for test control:
 *   .slotConfig        – configure which slots are returned (mutate before clicking Play)
 *   .calls             – read how many times each slot's play/pause/resume was called
 *   .videoStates       – array of setVideoState() calls (in order)
 *   .dispatchedEvents  – array of { event, data } dispatched to the SDK
 *   .slotEnded(type)   – fire EVENT_SLOT_ENDED for the slot of the given type
 *   .contentPauseRequest()  – fire EVENT_CONTENT_VIDEO_PAUSE_REQUEST
 *   .contentResumeRequest() – fire EVENT_CONTENT_VIDEO_RESUME_REQUEST
 *   .reset()           – clear all call counters / logs
 */
(() => {
  // ── Constants ──────────────────────────────────────────────────────────────
  var PREROLL = "preroll";
  var MIDROLL = "midroll";
  var OVERLAY = "overlay";
  var POSTROLL = "postroll";
  var PAUSE_MIDROLL = "pause_midroll";

  var EVT_PAUSE = "evt:content_pause_request";
  var EVT_RESUME = "evt:content_resume_request";
  var EVT_REQUEST_COMPLETE = "evt:request_complete";
  var EVT_SLOT_ENDED = "evt:slot_ended";
  var EVT_USER_ACTION = "evt:user_action_notified";
  var EVT_PAUSE_CLICK = "evt:user_action_pause";
  var EVT_RESUME_CLICK = "evt:user_action_resume";
  var VIDEO_PLAYING = "video:playing";
  var VIDEO_PAUSED = "video:paused";
  var VIDEO_COMPLETED = "video:completed";
  var PARAM_GLOBAL = "param:global";

  // ── Mutable state (shared across AdContext instances) ──────────────────────
  var state = {
    calls: {
      preroll: { play: 0, pause: 0, resume: 0 },
      midroll: { play: 0, pause: 0, resume: 0 },
      overlay: { play: 0, pause: 0, resume: 0 },
      postroll: { play: 0, pause: 0, resume: 0 },
      pauseMidroll: { play: 0, pause: 0, resume: 0 },
    },
    videoStates: [],
    dispatchedEvents: [],
  };

  // Test configures this before clicking Play
  var slotConfig = {
    preroll: 1,
    midroll: 1,
    midrollAt: 6,
    overlay: 0,
    overlayAt: 10,
    postroll: 1,
    pauseMidroll: 1,
  };

  /** @type {MockAdContext|null} */
  var activeCtx = null;

  // ── AdSlot factory ─────────────────────────────────────────────────────────
  function typeToKey(type) {
    switch (type) {
      case PREROLL:
        return "preroll";
      case MIDROLL:
        return "midroll";
      case OVERLAY:
        return "overlay";
      case POSTROLL:
        return "postroll";
      case PAUSE_MIDROLL:
        return "pauseMidroll";
      default:
        return "preroll";
    }
  }

  function makeSlot(type, timePosition) {
    var key = typeToKey(type);
    return {
      getTimePositionClass: () => type,
      getTimePosition: () => timePosition,
      getAdCount: () => 1,
      play: () => {
        state.calls[key].play++;
      },
      pause: () => {
        state.calls[key].pause++;
      },
      resume: () => {
        state.calls[key].resume++;
      },
    };
  }

  function buildSlots(cfg) {
    var slots = [];
    if (cfg.preroll > 0) slots.push(makeSlot(PREROLL, 0));
    if (cfg.midroll > 0) slots.push(makeSlot(MIDROLL, cfg.midrollAt != null ? cfg.midrollAt : 6));
    if (cfg.overlay > 0) slots.push(makeSlot(OVERLAY, cfg.overlayAt != null ? cfg.overlayAt : 10));
    if (cfg.postroll > 0) slots.push(makeSlot(POSTROLL, 120));
    if (cfg.pauseMidroll > 0) slots.push(makeSlot(PAUSE_MIDROLL, 0));
    return slots;
  }

  // ── MockAdContext ──────────────────────────────────────────────────────────
  function MockAdContext() {
    this._listeners = {};
    this._slots = [];
  }

  MockAdContext.prototype.setProfile = () => {};
  MockAdContext.prototype.setVideoAsset = () => {};
  MockAdContext.prototype.setSiteSection = () => {};
  MockAdContext.prototype.addTemporalSlot = () => {};
  MockAdContext.prototype.registerVideoDisplayBase = () => {};
  MockAdContext.prototype.addKeyValue = () => {};
  MockAdContext.prototype.setParameter = () => {};
  MockAdContext.prototype.dispose = () => {};

  MockAdContext.prototype.addEventListener = function (event, handler) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(handler);
  };

  MockAdContext.prototype.removeEventListener = function (event, handler) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((h) => h !== handler);
  };

  MockAdContext.prototype.getTemporalSlots = function () {
    return this._slots;
  };

  MockAdContext.prototype.setVideoState = (s) => {
    state.videoStates.push(s);
  };

  MockAdContext.prototype.submitRequest = function () {
    this._slots = buildSlots(slotConfig);
    this._fire(EVT_REQUEST_COMPLETE, { success: true });
  };

  MockAdContext.prototype.dispatchEvent = (event, data) => {
    state.dispatchedEvents.push({ event: event, data: data });
  };

  MockAdContext.prototype._fire = function (event, data) {
    var handlers = this._listeners[event] || [];
    handlers.forEach((h) => {
      h(data);
    });
  };

  // ── MockAdManager ──────────────────────────────────────────────────────────
  function MockAdManager() {}
  MockAdManager.prototype.setNetwork = () => {};
  MockAdManager.prototype.setServer = () => {};
  MockAdManager.prototype.newContext = () => {
    activeCtx = new MockAdContext();
    return activeCtx;
  };

  // ── SDK object ─────────────────────────────────────────────────────────────
  var SDK = {
    TIME_POSITION_CLASS_PREROLL: PREROLL,
    TIME_POSITION_CLASS_MIDROLL: MIDROLL,
    TIME_POSITION_CLASS_OVERLAY: OVERLAY,
    TIME_POSITION_CLASS_POSTROLL: POSTROLL,
    TIME_POSITION_CLASS_PAUSE_MIDROLL: PAUSE_MIDROLL,

    ADUNIT_PREROLL: "ADUNIT_PREROLL",
    ADUNIT_MIDROLL: "ADUNIT_MIDROLL",
    ADUNIT_OVERLAY: "ADUNIT_OVERLAY",
    ADUNIT_POSTROLL: "ADUNIT_POSTROLL",
    ADUNIT_PAUSE_MIDROLL: "ADUNIT_PAUSE_MIDROLL",

    EVENT_CONTENT_VIDEO_PAUSE_REQUEST: EVT_PAUSE,
    EVENT_CONTENT_VIDEO_RESUME_REQUEST: EVT_RESUME,
    EVENT_REQUEST_COMPLETE: EVT_REQUEST_COMPLETE,
    EVENT_SLOT_ENDED: EVT_SLOT_ENDED,
    EVENT_USER_ACTION_NOTIFIED: EVT_USER_ACTION,
    EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED: EVT_PAUSE_CLICK,
    EVENT_USER_ACTION_RESUME_BUTTON_CLICKED: EVT_RESUME_CLICK,

    VIDEO_STATE_PLAYING: VIDEO_PLAYING,
    VIDEO_STATE_PAUSED: VIDEO_PAUSED,
    VIDEO_STATE_COMPLETED: VIDEO_COMPLETED,

    PARAMETER_LEVEL_GLOBAL: PARAM_GLOBAL,

    AdManager: MockAdManager,
  };

  // ── Test control API ───────────────────────────────────────────────────────
  window.__fwMock = {
    slotConfig: slotConfig,

    get calls() {
      return state.calls;
    },
    get videoStates() {
      return state.videoStates;
    },
    get dispatchedEvents() {
      return state.dispatchedEvents;
    },

    slotEnded: (type) => {
      if (!activeCtx) throw new Error("No active AdContext");
      var slot = activeCtx._slots.find((s) => s.getTimePositionClass() === type);
      if (!slot) throw new Error("No slot of type: " + type);
      activeCtx._fire(EVT_SLOT_ENDED, { slot: slot });
    },

    contentPauseRequest: () => {
      if (activeCtx) activeCtx._fire(EVT_PAUSE, {});
    },
    contentResumeRequest: () => {
      if (activeCtx) activeCtx._fire(EVT_RESUME, {});
    },

    reset: () => {
      Object.keys(state.calls).forEach((k) => {
        state.calls[k] = { play: 0, pause: 0, resume: 0 };
      });
      state.videoStates.length = 0;
      state.dispatchedEvents.length = 0;
    },
  };

  // ── Install ────────────────────────────────────────────────────────────────
  window.tv = window.tv || {};
  window.tv.freewheel = window.tv.freewheel || {};
  window.tv.freewheel.SDK = SDK;
})();
