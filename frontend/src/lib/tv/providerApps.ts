/**
 * Streaming launch service for the TV build. The UI hands over a provider and
 * the media being viewed; this module decides how to leave Cinelas:
 *
 *   1. per-title deep link, when the provider officially supports one
 *   2. launch the provider's native Android TV app by package name
 *   3. open the TMDB/JustWatch watch link (web) as a last resort
 *
 * TMDB exposes no per-title provider content IDs, so no provider ships a
 * deep-link builder yet — add `buildDeepLink` to its config when an official
 * scheme (and a content-ID source) exists. UI components never need to change.
 */
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import type { MediaType } from '../../types/tmdb';

export type LaunchMedia = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
};

type ProviderApp = {
  /** Android TV package name; omitted means web-link fallback only. */
  packageName?: string;
  /** Returns a per-title deep link URL, or null when none applies. */
  buildDeepLink?: (media: LaunchMedia) => string | null;
};

// Keyed by TMDB provider_id. Extend freely; unmapped providers fall back to
// the TMDB watch link.
const PROVIDER_APPS: Record<number, ProviderApp> = {
  8: { packageName: 'com.netflix.ninja' }, // Netflix
  337: { packageName: 'com.disney.disneyplus' }, // Disney Plus
  390: { packageName: 'com.disney.disneyplus' }, // Disney+ (Nordic regions)
  9: { packageName: 'com.amazon.amazonvideo.livingroom' }, // Amazon Prime Video
  119: { packageName: 'com.amazon.amazonvideo.livingroom' }, // Amazon Prime Video (alt id)
  1899: { packageName: 'com.wbd.stream' }, // Max
  384: { packageName: 'com.wbd.stream' }, // HBO Max
  15: { packageName: 'com.hulu.livingroomplus' }, // Hulu
  350: { packageName: 'com.apple.atve.androidtv.appletv' }, // Apple TV+
  2: { packageName: 'com.apple.atve.androidtv.appletv' }, // Apple TV (rent/buy)
  531: { packageName: 'com.cbs.ott' }, // Paramount Plus
  1770: { packageName: 'com.cbs.ott' }, // Paramount+ (alt id)
  386: { packageName: 'com.peacocktv.peacockandroid' }, // Peacock
  387: { packageName: 'com.peacocktv.peacockandroid' }, // Peacock Premium
  283: { packageName: 'com.crunchyroll.crunchyroid' }, // Crunchyroll
  192: { packageName: 'com.google.android.youtube.tv' }, // YouTube
  188: { packageName: 'com.google.android.youtube.tv' }, // YouTube Premium
  3: { packageName: 'com.google.android.videos' }, // Google Play Movies / Google TV
  76: { packageName: 'com.viaplay.android' }, // Viaplay
  1773: { packageName: 'com.skyshowtime.skyshowtime.google' }, // SkyShowtime
};

export type LaunchResult = 'deeplink' | 'app' | 'link' | 'failed';

async function tryOpen(url: string): Promise<boolean> {
  try {
    const { completed } = await AppLauncher.openUrl({ url });
    return completed;
  } catch {
    return false;
  }
}

export async function launchProvider(
  providerId: number,
  media: LaunchMedia,
  watchLink?: string,
): Promise<LaunchResult> {
  const app = PROVIDER_APPS[providerId];

  if (Capacitor.isNativePlatform()) {
    const deepLink = app?.buildDeepLink?.(media) ?? null;
    if (deepLink && (await tryOpen(deepLink))) return 'deeplink';
    if (app?.packageName && (await tryOpen(app.packageName))) return 'app';
    if (watchLink && (await tryOpen(watchLink))) return 'link';
    return 'failed';
  }

  if (watchLink) {
    window.open(watchLink, '_blank', 'noopener');
    return 'link';
  }
  return 'failed';
}
