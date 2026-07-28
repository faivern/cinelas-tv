import { useSyncExternalStore } from "react";

export const WATCH_REGION_STORAGE_KEY = "watchProviders_selectedCountry";

const REGION_CHANGED_EVENT = "watch-region-changed";

export function getDefaultCountry(): string {
  const stored = localStorage.getItem(WATCH_REGION_STORAGE_KEY);
  if (stored) return stored;

  const browserLocale = navigator.language || "en-US";
  const countryCode = browserLocale.split("-")[1] || "US";
  return countryCode.toUpperCase();
}

let sessionRegion: string | null = null;

export function setWatchRegion(code: string) {
  sessionRegion = code;
  try {
    localStorage.setItem(WATCH_REGION_STORAGE_KEY, code);
  } catch {
    /* storage unavailable — sessionRegion still carries the selection */
  }
  window.dispatchEvent(new Event(REGION_CHANGED_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(REGION_CHANGED_EVENT, onChange);
  return () => window.removeEventListener(REGION_CHANGED_EVENT, onChange);
}

function getSnapshot() {
  return sessionRegion ?? getDefaultCountry();
}

export function useWatchRegion(): string {
  return useSyncExternalStore(subscribe, getSnapshot);
}
