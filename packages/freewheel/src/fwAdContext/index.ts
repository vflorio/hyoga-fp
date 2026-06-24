import type { FwAdSlot } from "..";

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
  getTemporalSlots(): ReadonlyArray<FwAdSlot.AdSlot>;
  setVideoState(state: string): void;
  submitRequest(): void;
  setParameter(key: string, value: boolean | number, level: string): void;
  dispatchEvent(event: string, data: object): void;
  dispose(): void;
}
