// Visual Validation Utilities
// Verifies that ad creatives are actually visible in the viewport

import type { Page } from "@playwright/test";

export interface VisualCheckResult {
  readonly passed: boolean;
  readonly checks: VisualCheck[];
}

export interface VisualCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly details: string;
}

// --- Video Ad Validation ---

export const validateVideoAd = async (page: Page): Promise<VisualCheckResult> => {
  const checks: VisualCheck[] = [];

  // Check: video element present in ad container
  const videoPresent = await page.evaluate(() => {
    const adContainers = document.querySelectorAll('[id*="fw_ad_container"], [id*="_fw_ad"]');
    for (const container of adContainers) {
      const video = container.querySelector("video, iframe");
      if (video) return true;
    }
    return false;
  });
  checks.push({
    name: "video-element-present",
    passed: videoPresent,
    details: videoPresent ? "Video element found in ad container" : "No video element in ad containers",
  });

  if (!videoPresent) {
    return { passed: false, checks };
  }

  // Check: video visibility > 50%
  const visibilityCheck = await page.evaluate(() => {
    const adVideo = document.querySelector(
      '[id*="fw_ad_container"] video, [id*="_fw_ad"] video, iframe[id*="fw"]',
    ) as HTMLElement | null;
    if (!adVideo) return { visible: false, ratio: 0 };

    const rect = adVideo.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
    const visibleArea = visibleWidth * visibleHeight;
    const totalArea = rect.width * rect.height;

    const ratio = totalArea > 0 ? visibleArea / totalArea : 0;
    return { visible: ratio > 0.5, ratio };
  });
  checks.push({
    name: "video-visibility",
    passed: visibilityCheck.visible,
    details: `Visibility ratio: ${(visibilityCheck.ratio * 100).toFixed(1)}% (threshold: 50%)`,
  });

  // Check: playback started (currentTime > 0)
  const playbackStarted = await page.evaluate(() => {
    const video = document.querySelector('[id*="fw_ad_container"] video') as HTMLVideoElement | null;
    if (!video) return false;
    return video.currentTime > 0 && !video.paused;
  });
  checks.push({
    name: "video-playback-started",
    passed: playbackStarted,
    details: playbackStarted ? "Video is playing" : "Video not playing",
  });

  return { passed: checks.every((c) => c.passed), checks };
};

// --- Banner Ad Validation ---

export const validateBannerAd = async (
  page: Page,
  selector: string,
  expectedWidth?: number,
  expectedHeight?: number,
): Promise<VisualCheckResult> => {
  const checks: VisualCheck[] = [];

  // Check: DOM element present
  const elementInfo = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;

    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      exists: true,
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
    };
  }, selector);

  checks.push({
    name: "banner-dom-present",
    passed: elementInfo !== null,
    details: elementInfo
      ? `Element found: ${elementInfo.width}x${elementInfo.height}`
      : `Element not found: ${selector}`,
  });

  if (!elementInfo) return { passed: false, checks };

  // Check: not hidden
  const notHidden =
    elementInfo.display !== "none" && elementInfo.visibility !== "hidden" && Number.parseFloat(elementInfo.opacity) > 0;
  checks.push({
    name: "banner-not-hidden",
    passed: notHidden,
    details: `display=${elementInfo.display}, visibility=${elementInfo.visibility}, opacity=${elementInfo.opacity}`,
  });

  // Check: correct dimensions (if specified)
  if (expectedWidth && expectedHeight) {
    const dimensionsCorrect =
      Math.abs(elementInfo.width - expectedWidth) < 5 && Math.abs(elementInfo.height - expectedHeight) < 5;
    checks.push({
      name: "banner-dimensions",
      passed: dimensionsCorrect,
      details: `Expected ${expectedWidth}x${expectedHeight}, got ${elementInfo.width}x${elementInfo.height}`,
    });
  }

  return { passed: checks.every((c) => c.passed), checks };
};

// --- Companion Ad Validation ---

export const validateCompanionAd = async (
  page: Page,
  containerId: string,
  expectedWidth?: number,
  expectedHeight?: number,
): Promise<VisualCheckResult> => {
  const checks: VisualCheck[] = [];

  const containerInfo = await page.evaluate((id) => {
    const container = document.getElementById(id);
    if (!container) return null;

    const children = container.children;
    if (children.length === 0) return { exists: true, rendered: false, width: 0, height: 0 };

    const child = children[0] as HTMLElement;
    const rect = child.getBoundingClientRect();
    return { exists: true, rendered: true, width: rect.width, height: rect.height };
  }, containerId);

  checks.push({
    name: "companion-container-exists",
    passed: containerInfo !== null,
    details: containerInfo ? "Container found" : `Container #${containerId} not found`,
  });

  if (!containerInfo) return { passed: false, checks };

  checks.push({
    name: "companion-rendered",
    passed: containerInfo.rendered,
    details: containerInfo.rendered
      ? `Rendered: ${containerInfo.width}x${containerInfo.height}`
      : "No content in container",
  });

  if (expectedWidth && expectedHeight && containerInfo.rendered) {
    const dimensionsCoherent =
      containerInfo.width > 0 &&
      containerInfo.height > 0 &&
      containerInfo.width <= expectedWidth * 1.1 &&
      containerInfo.height <= expectedHeight * 1.1;
    checks.push({
      name: "companion-dimensions",
      passed: dimensionsCoherent,
      details: `Expected ~${expectedWidth}x${expectedHeight}, got ${containerInfo.width}x${containerInfo.height}`,
    });
  }

  return { passed: checks.every((c) => c.passed), checks };
};
