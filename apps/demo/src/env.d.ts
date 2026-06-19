/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FW_NETWORK_ID: string;
  readonly VITE_FW_SERVER_URL: string;
  readonly VITE_FW_PROFILE_ID: string;
  readonly VITE_FW_VIDEO_ASSET_ID: string;
  readonly VITE_FW_SITE_SECTION_ID: string;
  readonly VITE_FW_VIDEO_DURATION: string;
  readonly VITE_FW_FALLBACK_SITE_ID: string;
  readonly VITE_FW_VIDEO_CONTAINER: string;
  readonly VITE_FW_DISABLE_AUTO_PAUSE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
