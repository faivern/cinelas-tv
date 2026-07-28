/**
 * TV-mode detection. Adds `tv` to <html> when Cinelas is running on the actual
 * Android TV target (the Capacitor APK) so the gated `html.tv` styles in
 * index.css apply. Everything is opt-in on the class, so the plain web/mobile
 * build renders exactly as before.
 *
 * Dev override for previewing TV styling in a desktop browser:
 *   ?tv=1  → enable (and remember), ?tv=0 → disable and forget.
 */
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = 'cinelas-tv-mode';

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function isTvUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /\bTV\b|BRAVIA|AFT[A-Z]|GoogleTV|Android TV|SMART-TV|Tizen|Web0S|NetCast/i.test(
    navigator.userAgent,
  );
}

/** True when TV mode is active (html.tv set by initTvMode before React renders). */
export function isTvMode(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('tv')
  );
}

export function initTvMode(): void {
  if (typeof document === 'undefined') return;

  let forced: string | null = null;
  try {
    forced = new URLSearchParams(window.location.search).get('tv');
    if (forced === '1') localStorage.setItem(STORAGE_KEY, '1');
    if (forced === '0') localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* URL / storage unavailable — fall back to platform detection */
  }

  let remembered = false;
  try {
    remembered = localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* ignore */
  }

  const isTv = forced === '1' || (forced !== '0' && (remembered || isNative() || isTvUserAgent()));

  document.documentElement.classList.toggle('tv', isTv);
}
