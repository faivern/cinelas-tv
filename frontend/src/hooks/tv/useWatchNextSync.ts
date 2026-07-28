import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUserMediaEntries } from '../mediaEntries/useMediaEntries';
import { isTvMode } from '../../lib/tv/tvMode';
import { publishWatchNext, type WatchNextItem } from '../../lib/tv/watchNext';

const MAX_ITEMS = 10;

/**
 * Headless hook: mirrors the user's watchlist into the Android TV Watch Next
 * home-screen row. Piggybacks on the ["mediaEntries"] query, so add/remove
 * mutations re-sync automatically.
 */
export function useWatchNextSync(): void {
  const lastPublished = useRef<string>('');
  const { data: entries } = useUserMediaEntries();

  useEffect(() => {
    if (!isTvMode() || !Capacitor.isNativePlatform() || !entries) return;

    const items: WatchNextItem[] = entries
      .filter((e) => e.status === 'WantToWatch' || e.status === 'Watching')
      .filter((e) => e.posterPath)
      .slice(0, MAX_ITEMS)
      .map((e) => {
        const mediaType = e.mediaType === 'tv' ? 'tv' : 'movie';
        return {
          id: `${mediaType}-${e.tmdbId}`,
          mediaType,
          title: e.title ?? '',
          posterUrl: `https://image.tmdb.org/t/p/w342${e.posterPath}`,
          deepLink: `cinelastv://${mediaType}/${e.tmdbId}`,
        };
      });

    // Refetches return referentially-new arrays; skip redundant native calls.
    const fingerprint = JSON.stringify(items);
    if (fingerprint === lastPublished.current) return;
    lastPublished.current = fingerprint;
    publishWatchNext(items);
  }, [entries]);
}
