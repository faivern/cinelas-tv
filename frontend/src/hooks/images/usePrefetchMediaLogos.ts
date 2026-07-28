/**
 * Warms the media-logo pipeline for a row's items ahead of D-pad focus:
 * resolves each logo path via the shared react-query cache entry, then
 * primes the image bytes into the browser/WebView HTTP cache with an
 * off-screen Image (same trick as TrendingCarousel's backdrop preload).
 * Without this, every focus move pays two sequential roundtrips
 * (/images API + TMDB download) before the logo fades in.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mediaLogoQueryOptions } from "./useMediaLogo";
import { isTvMode } from "../../lib/tv/tvMode";

const warmed = new Set<string>();

// Mirror the srcSet width the Logo <img> will pick for sizes="30vw"
// (TvFocusRow's focused card), so the preload hits the same cache entry.
function logoWidth(): number {
  const target = 0.3 * window.innerWidth * (window.devicePixelRatio || 1);
  return [185, 342, 500].find((w) => w >= target) ?? 500;
}

export function usePrefetchMediaLogos(
  mediaType: "movie" | "tv",
  items: Array<{ id: number }>,
): void {
  const queryClient = useQueryClient();
  const ids = items.map((i) => i.id).join(",");

  useEffect(() => {
    if (!isTvMode() || ids.length === 0) return;
    let cancelled = false;
    const width = logoWidth();
    for (const idStr of ids.split(",")) {
      const id = Number(idStr);
      queryClient
        .ensureQueryData(mediaLogoQueryOptions(mediaType, id))
        .then((path) => {
          if (cancelled || !path) return;
          const url = `https://image.tmdb.org/t/p/w${width}${path}`;
          if (warmed.has(url)) return;
          warmed.add(url);
          new Image().src = url;
        })
        .catch(() => {
          /* prefetch is best-effort; the hook refetches on focus */
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mediaType, ids, queryClient]);
}
