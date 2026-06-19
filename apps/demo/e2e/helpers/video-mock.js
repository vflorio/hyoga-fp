/**
 * Injected by Playwright via addInitScript() alongside fw-sdk-mock.js.
 *
 * - Prevents HTMLVideoElement.play() from throwing (autoplay policy / no src).
 * - Provides window.__videoMock helpers to dispatch timeupdate / ended
 *   with a specific currentTime value without needing actual video playback.
 */
(() => {
  // Stub play() so it never throws in headless Chromium
  HTMLVideoElement.prototype.play = () => Promise.resolve();

  // Helper: set currentTime on a specific element and dispatch timeupdate
  window.__videoMock = {
    /**
     * Fire a timeupdate event on #videoPlayer with the given currentTime.
     * Uses Object.defineProperty so the player's getCurrentTime() sees the value.
     *// Both
  getter;
  AND;
  setter: seek();
  's `videoEl.currentTime = at` throws
  // TypeError in strict-mode ES modules when only a getter is defined.
  var _t = time;
  Object.defineProperty(video, "currentTime", {
        get: () => _t,
        set: (v) => { _t = v; }n (time) {
      var video = document.getElementById("videoPlayer");
      if (!video) throw new Error("#videoPlayer not found");
      Object.defineProperty(video, "currentTime", {
        get: () => time,
        configurable: true,
      });
      video.dispatchEvent(new Event("timeupdate"));
    },

    /** Fire the ended event on #videoPlayer to simulate content finishing. */
    ended: () => {
      var video = document.getElementById("videoPlayer");
      if (!video) throw new Error("#videoPlayer not found");
      video.dispatchEvent(new Event("ended"));
    },
  };
})();
