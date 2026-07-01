import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as t from "io-ts";

// --- Codecs ---

const BooleanFromString = new t.Type<boolean, string, unknown>(
  "BooleanFromString",
  t.boolean.is,
  (u, c) => {
    if (typeof u !== "string") return t.failure(u, c);
    if (u === "true") return t.success(true);
    if (u === "false") return t.success(false);
    return t.failure(u, c, "expected 'true' or 'false'");
  },
  String,
);

const IntFromString = new t.Type<number, string, unknown>(
  "IntFromString",
  t.number.is,
  (u, c) => {
    if (typeof u !== "string") return t.failure(u, c);
    const n = Number(u);
    return Number.isNaN(n) || !Number.isInteger(n) ? t.failure(u, c, "expected integer string") : t.success(n);
  },
  String,
);

// --- Env schema ---

const EnvCodec = t.type({
  VITE_FW_NETWORK_ID: IntFromString,
  VITE_FW_SERVER_URL: t.string,
  VITE_FW_PROFILE_ID: t.string,
  VITE_FW_VIDEO_ASSET_ID: t.string,
  VITE_FW_SITE_SECTION_ID: t.string,
  VITE_FW_VIDEO_DURATION: IntFromString,
  VITE_FW_FALLBACK_SITE_ID: IntFromString,
  VITE_FW_VIDEO_CONTAINER: t.string,
  VITE_FW_DISABLE_AUTO_PAUSE: BooleanFromString,
  VITE_HYOGA_LOG_LEVEL: t.keyof({
    debug: null,
    info: null,
    warning: null,
    error: null,
    silent: null,
  }),
  VITE_VIDEO_URL: t.string,
});

// --- Parse and export ---

const formatErrors = (errors: t.Errors): string =>
  errors
    .map(
      (e) =>
        `  ${e.context
          .map((c) => c.key)
          .filter(Boolean)
          .join(".")} : ${JSON.stringify(e.value)}`,
    )
    .join("\n");

export const config = pipe(
  EnvCodec.decode(import.meta.env),
  E.match(
    (errors) => {
      throw new Error(`Invalid environment configuration:\n${formatErrors(errors)}`);
    },
    (env) => ({
      networkId: env.VITE_FW_NETWORK_ID,
      serverURL: env.VITE_FW_SERVER_URL,
      profileId: env.VITE_FW_PROFILE_ID,
      videoAssetId: env.VITE_FW_VIDEO_ASSET_ID,
      siteSectionId: env.VITE_FW_SITE_SECTION_ID,
      videoDuration: env.VITE_FW_VIDEO_DURATION,
      fallbackSiteId: env.VITE_FW_FALLBACK_SITE_ID,
      videoContainer: env.VITE_FW_VIDEO_CONTAINER,
      disableAutoPause: env.VITE_FW_DISABLE_AUTO_PAUSE,
      videoURL: env.VITE_VIDEO_URL,
      logLevel: env.VITE_HYOGA_LOG_LEVEL,
    }),
  ),
);
