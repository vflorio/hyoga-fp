export interface AdSlot {
  getTimePositionClass(): string;
  getTimePosition(): number;
  getAdCount(): number;
  play(): void;
  pause(): void;
  resume(): void;
}

export interface AdContext {
  setProfile(id: string): void;
  setVideoAsset(id: string, duration: number): void;
  setSiteSection(id: string): void;
  addTemporalSlot(name: string, unit: string, time: number): void;
  registerVideoDisplayBase(id: string): void;
  addKeyValue(key: string, value: string): void;
  addEventListener(event: string, handler: (e: any) => void): void;
  removeEventListener(event: string, handler: (e: any) => void): void;
  getTemporalSlots(): ReadonlyArray<AdSlot>;
  setVideoState(state: string): void;
  submitRequest(): void;
  setParameter(key: string, value: boolean, level: string): void;
  dispatchEvent(event: string, data: object): void;
  dispose(): void;
}

export interface SDK
  extends TimePositionClassIdentifiers,
    AdUnitClassIdentifiers,
    EventNames,
    VideoStateValues,
    ParameterLevels {
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
  readonly EVENT_REQUEST_COMPLETE: string;
  readonly EVENT_SLOT_ENDED: string;
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
}
