// Network Correlation Model
// Matches captured network requests against ad model entities

import type { NetworkRequest, NetworkRequestType, TrackingEvent } from "./model.js";

// --- FreeWheel URL parsing ---

// FreeWheel tracking URLs typically contain these patterns
const FW_TRACKING_PATTERNS: Array<{ pattern: RegExp; type: NetworkRequestType }> = [
  { pattern: /\/ad\/l\/1\?/, type: "ad_request" },
  { pattern: /adManager.*submitRequest/, type: "ad_request" },
  { pattern: /e=impression|evt=impression/i, type: "impression" },
  { pattern: /e=firstQuartile|evt=firstQuartile/i, type: "firstQuartile" },
  { pattern: /e=midpoint|evt=midpoint/i, type: "midpoint" },
  { pattern: /e=thirdQuartile|evt=thirdQuartile/i, type: "thirdQuartile" },
  { pattern: /e=complete|evt=complete/i, type: "complete" },
  { pattern: /e=click|evt=click|type=click/i, type: "click" },
];

export interface ParsedTrackingUrl {
  readonly type: NetworkRequestType;
  readonly adId: string | null;
  readonly creativeId: string | null;
  readonly slotId: string | null;
}

export const parseTrackingUrl = (url: string): ParsedTrackingUrl | null => {
  const matchedType = FW_TRACKING_PATTERNS.find((p) => p.pattern.test(url));
  if (!matchedType) return null;

  // Extract IDs from URL parameters
  const urlObj = safeParseUrl(url);
  if (!urlObj) return null;

  const params = urlObj.searchParams;
  const adId = params.get("adid") ?? params.get("ad") ?? params.get("adId") ?? extractFromPath(url, /\/ad\/(\d+)/);
  const creativeId = params.get("crid") ?? params.get("creativeId") ?? params.get("cr");
  const slotId = params.get("slotid") ?? params.get("slot") ?? params.get("slid");

  return {
    type: matchedType.type,
    adId,
    creativeId,
    slotId,
  };
};

const safeParseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

const extractFromPath = (url: string, pattern: RegExp): string | null => {
  const match = url.match(pattern);
  return match?.[1] ?? null;
};

// --- Correlator ---

export interface CorrelationEntry {
  readonly request: NetworkRequest;
  readonly parsed: ParsedTrackingUrl;
  readonly matchedAdId: string | null;
  readonly matchedSlotId: string | null;
  readonly matchedCreativeId: string | null;
}

export interface CorrelationResult {
  readonly correlated: CorrelationEntry[];
  readonly uncorrelated: NetworkRequest[];
  readonly missingTracking: Array<{
    adId: string;
    expectedType: NetworkRequestType;
  }>;
}

export const correlateRequests = (requests: NetworkRequest[], expectedAdIds: string[]): CorrelationResult => {
  const correlated: CorrelationEntry[] = [];
  const uncorrelated: NetworkRequest[] = [];

  for (const request of requests) {
    const parsed = parseTrackingUrl(request.url);
    if (parsed) {
      correlated.push({
        request,
        parsed,
        matchedAdId: parsed.adId,
        matchedSlotId: parsed.slotId,
        matchedCreativeId: parsed.creativeId,
      });
    } else {
      uncorrelated.push(request);
    }
  }

  // Find expected tracking that never fired
  const firedImpressions = new Set(
    correlated
      .filter((c) => c.parsed.type === "impression")
      .map((c) => c.matchedAdId)
      .filter(Boolean),
  );

  const missingTracking = expectedAdIds
    .filter((adId) => !firedImpressions.has(adId))
    .map((adId) => ({ adId, expectedType: "impression" as NetworkRequestType }));

  return { correlated, uncorrelated, missingTracking };
};

// Convert correlated network requests into TrackingEvents
export const toTrackingEvents = (correlated: CorrelationEntry[], slotId: string): TrackingEvent[] =>
  correlated.map((entry) => ({
    type: mapNetworkTypeToTracking(entry.parsed.type),
    timestamp: entry.request.timestamp,
    url: entry.request.url,
    adId: entry.matchedAdId ?? "",
    creativeId: entry.matchedCreativeId ?? undefined,
    slotId: entry.matchedSlotId ?? slotId,
    networkCorrelated: true,
  }));

const mapNetworkTypeToTracking = (type: NetworkRequestType): TrackingEvent["type"] => {
  switch (type) {
    case "ad_request":
      return "custom";
    case "impression":
      return "impression";
    case "firstQuartile":
      return "firstQuartile";
    case "midpoint":
      return "midpoint";
    case "thirdQuartile":
      return "thirdQuartile";
    case "complete":
      return "complete";
    case "click":
      return "click";
    case "custom":
      return "custom";
  }
};
