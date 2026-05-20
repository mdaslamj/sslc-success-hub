/**
 * Low-data / battery-friendly mode. Persists a single flag; consumers can
 * read it to disable heavy animations, large images, and background polls.
 */
import { offlineGet, offlineSet } from "./storage";

const KEY = "lightweight-mode";

export interface LightweightSettings {
  enabled: boolean;
  reduceMotion: boolean;
  compressImages: boolean;
  lowDataAi: boolean;
}

export const DEFAULT_LIGHTWEIGHT: LightweightSettings = {
  enabled: false,
  reduceMotion: false,
  compressImages: false,
  lowDataAi: false,
};

export async function readLightweight(): Promise<LightweightSettings> {
  return (await offlineGet<LightweightSettings>(KEY)) ?? DEFAULT_LIGHTWEIGHT;
}

export async function writeLightweight(s: LightweightSettings): Promise<void> {
  await offlineSet(KEY, s);
}

export async function toggleLightweight(enabled: boolean): Promise<LightweightSettings> {
  const next: LightweightSettings = enabled
    ? { enabled: true, reduceMotion: true, compressImages: true, lowDataAi: true }
    : DEFAULT_LIGHTWEIGHT;
  await writeLightweight(next);
  return next;
}