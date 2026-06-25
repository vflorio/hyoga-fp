export interface AdSlot {
  getTimePositionClass(): string | null;
  getTimePosition(): number;
  getAdCount(): number;
  getCustomId(): string;
  getAdUnit(): string;
  play(): void;
  pause(): void;
  resume(): void;
}

export interface AdContext {
  setProfile(id: string): void;
  setVideoAsset(
    id: string,
    duration: number,
    networkId?: number | null,
    location?: string | null,
    autoPlayType?: string,
    viewUid?: number,
    idType?: string,
    fallbackId?: string,
    durationType?: string,
  ): void;
  setSiteSection(id: string, networkId?: number, viewUid?: number, idType?: string, fallbackId?: number): void;
  addTemporalSlot(name: string, unit: string, time: number): void;
  registerVideoDisplayBase(id: string): void;
  addKeyValue(key: string, value: string): void;
  addEventListener(event: string, handler: (e: any) => void): void;
  removeEventListener(event: string, handler: (e: any) => void): void;
  getTemporalSlots(): ReadonlyArray<AdSlot>;
  setVideoState(state: string): void;
  submitRequest(): void;
  setParameter(key: string, value: boolean | number, level: string): void;
  dispatchEvent(event: string, data: object): void;
  dispose(): void;
}

export interface SDK
  extends TimePositionClassIdentifiers,
    AdUnitClassIdentifiers,
    EventNames,
    VideoStateValues,
    ParameterLevels,
    ParameterKeys,
    VideoAssetConstants {
  readonly AdManager: new () => {
    setNetwork(networkId: number): void;
    setServer(url: string): void;
    newContext(): AdContext;
  };
}

export interface TimePositionClassIdentifiers {
  readonly TIME_POSITION_CLASS_PREROLL: string;
  readonly TIME_POSITION_CLASS_MIDROLL: string;
  readonly TIME_POSITION_CLASS_OVERLAY: string;
  readonly TIME_POSITION_CLASS_POSTROLL: string;
  readonly TIME_POSITION_CLASS_PAUSE_MIDROLL: string;
}

export interface AdUnitClassIdentifiers {
  readonly ADUNIT_PREROLL: string;
  readonly ADUNIT_MIDROLL: string;
  readonly ADUNIT_OVERLAY: string;
  readonly ADUNIT_POSTROLL: string;
  readonly ADUNIT_PAUSE_MIDROLL: string;
}

export interface EventNames {
  readonly EVENT_CONTENT_VIDEO_PAUSE_REQUEST: string;
  readonly EVENT_CONTENT_VIDEO_RESUME_REQUEST: string;
  readonly EVENT_REQUEST_INITIATED: string;
  readonly EVENT_REQUEST_COMPLETE: string;
  readonly EVENT_SLOT_STARTED: string;
  readonly EVENT_SLOT_ENDED: string;
  readonly EVENT_SLOT_IMPRESSION: string;
  readonly EVENT_SLOT_END: string;
  readonly EVENT_AD_INITIATED: string;
  readonly EVENT_AD_IMPRESSION: string;
  readonly EVENT_AD_IMPRESSION_END: string;
  readonly EVENT_AD_FIRST_QUARTILE: string;
  readonly EVENT_AD_MIDPOINT: string;
  readonly EVENT_AD_THIRD_QUARTILE: string;
  readonly EVENT_AD_COMPLETE: string;
  readonly EVENT_AD_CLICK: string;
  readonly EVENT_AD_MUTE: string;
  readonly EVENT_AD_UNMUTE: string;
  readonly EVENT_AD_COLLAPSE: string;
  readonly EVENT_AD_EXPAND: string;
  readonly EVENT_AD_PAUSE: string;
  readonly EVENT_AD_RESUME: string;
  readonly EVENT_AD_REWIND: string;
  readonly EVENT_AD_ACCEPT_INVITATION: string;
  readonly EVENT_AD_CLOSE: string;
  readonly EVENT_AD_MINIMIZE: string;
  readonly EVENT_AD_SKIPPED: string;
  readonly EVENT_AD_PROGRESS: string;
  readonly EVENT_AD_VOLUME_CHANGE: string;
  readonly EVENT_AD_AUTO_PLAY_BLOCKED: string;
  readonly EVENT_AD_SKIPPABLE_STATE_CHANGED: string;
  readonly EVENT_AD_BUFFERING_START: string;
  readonly EVENT_AD_BUFFERING_END: string;
  readonly EVENT_AD_MEASUREMENT: string;
  readonly EVENT_CONTENT_VIDEO_PAUSED: string;
  readonly EVENT_CONTENT_VIDEO_RESUMED: string;
  readonly EVENT_RESELLER_NO_AD: string;
  readonly EVENT_EXTENSION_LOADED: string;
  readonly EVENT_VIDEO_DISPLAY_BASE_CHANGED: string;
  readonly EVENT_ERROR: string;
  readonly EVENT_USER_ACTION_NOTIFIED: string;
  readonly EVENT_USER_ACTION_PAUSE_BUTTON_CLICKED: string;
  readonly EVENT_USER_ACTION_RESUME_BUTTON_CLICKED: string;
}

export interface VideoStateValues {
  readonly VIDEO_STATE_PLAYING: string;
  readonly VIDEO_STATE_PAUSED: string;
  readonly VIDEO_STATE_COMPLETED: string;
}

export interface ParameterLevels {
  readonly PARAMETER_LEVEL_GLOBAL: string;
  readonly PARAMETER_LEVEL_OVERRIDE: string;
}

export interface ParameterKeys {
  readonly PARAMETER_USE_CCPA_USPAPI: string;
  readonly PARAMETER_RENDERER_VIDEO_DISPLAY_CONTROLS_WHEN_PAUSE: string;
  readonly PARAMETER_AUTO_PAUSE_AD_ONVISIBILITYCHANGE: string;
  readonly PARAMETER_VAST_MAX_WRAPPER_COUNT: string;
  readonly PARAMETER_EXTENSION_OMSDK_ENABLED: string;
}

export interface VideoAssetConstants {
  readonly VIDEO_ASSET_AUTO_PLAY_TYPE_ATTENDED: string;
  readonly VIDEO_ASSET_DURATION_TYPE_EXACT: string;
  readonly ID_TYPE_CUSTOM: string;
}
