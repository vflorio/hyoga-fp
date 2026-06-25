// Custom Playwright fixtures for ad validation

import type { AdSession, NetworkRequest } from "@hyoga-fp/validation";
import { test as base, type Page } from "@playwright/test";

// --- Types for window.__AD_RUNTIME__ ---

declare global {
  interface Window {
    __AD_RUNTIME__: AdSession;
  }
}

// --- Network capture ---

export interface CapturedRequest {
  url: string;
  method: string;
  timestamp: number;
  statusCode: number | null;
  resourceType: string;
}

export interface AdTestFixtures {
  adRuntime: {
    waitForSession: () => Promise<AdSession>;
    getSession: () => Promise<AdSession>;
    waitForComplete: (timeoutMs?: number) => Promise<AdSession>;
  };
  networkCapture: {
    requests: CapturedRequest[];
    getAdRequests: () => CapturedRequest[];
    getTrackingRequests: () => CapturedRequest[];
  };
}

// FreeWheel tracking URL patterns
const FW_TRACKING_PATTERNS = [
  /2mdn\.net/,
  /fwmrm\.net/,
  /g\.doubleclick/,
  /impression/i,
  /quartile/i,
  /complete/i,
  /tracking/i,
];

const isAdRelatedUrl = (url: string): boolean => FW_TRACKING_PATTERNS.some((p) => p.test(url));

export const test = base.extend<AdTestFixtures>({
  adRuntime: async ({ page }, use) => {
    const fixture = {
      waitForSession: async (): Promise<AdSession> => {
        await page.waitForFunction(() => window.__AD_RUNTIME__ != null, { timeout: 30_000 });
        return page.evaluate(() => window.__AD_RUNTIME__);
      },

      getSession: async (): Promise<AdSession> => {
        return page.evaluate(() => window.__AD_RUNTIME__);
      },

      waitForComplete: async (timeoutMs = 120_000): Promise<AdSession> => {
        await page.waitForFunction(() => window.__AD_RUNTIME__?.endTimestamp != null, { timeout: timeoutMs });
        return page.evaluate(() => window.__AD_RUNTIME__);
      },
    };

    await use(fixture);
  },

  networkCapture: async ({ page }, use) => {
    const requests: CapturedRequest[] = [];

    page.on("request", (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        statusCode: null,
        resourceType: request.resourceType(),
      });
    });

    page.on("response", (response) => {
      const url = response.url();
      const entry = requests.find((r) => r.url === url && r.statusCode === null);
      if (entry) {
        entry.statusCode = response.status();
      }
    });

    const fixture = {
      requests,
      getAdRequests: () => requests.filter((r) => isAdRelatedUrl(r.url)),
      getTrackingRequests: () =>
        requests.filter(
          (r) => (isAdRelatedUrl(r.url) && r.resourceType === "image") || r.resourceType === "xmlhttprequest",
        ),
    };

    await use(fixture);
  },
});

export { expect } from "@playwright/test";
