import { useQuery } from "@tanstack/react-query";
import { getMediaImages } from "../../api/media.api";
import type { MediaType } from "../../types/tmdb";

const DEFAULT_LIMIT = 5;

function pickBackdropPaths(
  response: Awaited<ReturnType<typeof getMediaImages>>,
  limit: number,
  fallback?: string | null
): string[] {
  const paths = (response.backdrops ?? [])
    .filter((b) => b.file_path)
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, limit)
    .map((b) => b.file_path);

  if (paths.length === 0 && fallback) {
    paths.push(fallback);
  }

  return paths;
}

export function useMediaBackdrops(
  mediaType?: MediaType,
  id?: number,
  fallbackPath?: string | null,
  limit = DEFAULT_LIMIT
) {
  return useQuery<string[]>({
    queryKey: ["mediaImages", mediaType, id, limit],
    queryFn: async ({ signal }) => {
      const data = await getMediaImages(mediaType!, id!, { signal });
      return pickBackdropPaths(data, limit, fallbackPath);
    },
    enabled: Boolean(mediaType && id),
    staleTime: 10 * 60 * 1000,
  });
}
