/**
 * Bridge to the native WatchNext Capacitor plugin, which publishes items to
 * the Android TV home-screen Watch Next row. No-op outside the native APK.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export type WatchNextItem = {
  /** Composite id, e.g. "movie-603" — becomes the provider's internal id. */
  id: string;
  mediaType: 'movie' | 'tv';
  title: string;
  /** Full https TMDB poster URL. */
  posterUrl: string;
  /** e.g. "cinelastv://movie/603" — opened when the row item is clicked. */
  deepLink: string;
};

interface WatchNextPlugin {
  setItems(options: { items: WatchNextItem[] }): Promise<void>;
  clear(): Promise<void>;
}

const WatchNext = registerPlugin<WatchNextPlugin>('WatchNext');

export function publishWatchNext(items: WatchNextItem[]): void {
  if (!Capacitor.isNativePlatform()) return;
  WatchNext.setItems({ items }).catch(() => {});
}

export function clearWatchNext(): void {
  if (!Capacitor.isNativePlatform()) return;
  WatchNext.clear().catch(() => {});
}
