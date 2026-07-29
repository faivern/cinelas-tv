import { useQuery } from "@tanstack/react-query";
import { getMoviePlayback, getShowPlayback } from "../../api/playback.api";
import type { Playback } from "../../api/playback.api";
import type { MediaType } from "../../types/tmdb";

export function usePlayback(mediaType?: MediaType, id?: number) {
  return useQuery<Playback>({
    queryKey: ["playback", mediaType, id],
    queryFn: ({ signal }) =>
      mediaType === "movie"
        ? getMoviePlayback(id!, { signal })
        : getShowPlayback(id!, { signal }),
    enabled: Boolean(mediaType && id),
    // Matches the backend's 5-minute Jellyfin availability cache.
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
