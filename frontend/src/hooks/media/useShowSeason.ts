import { useQuery } from "@tanstack/react-query";
import { getShowSeason } from "../../api/media.api";
import type { SeasonDetail } from "../../types/tmdb";

export function useShowSeason(seriesId?: number, seasonNumber?: number) {
  return useQuery<SeasonDetail>({
    queryKey: ["tv", "season", seriesId, seasonNumber],
    queryFn: ({ signal }) => getShowSeason(seriesId!, seasonNumber!, { signal }),
    enabled: Boolean(seriesId && seasonNumber != null),
    staleTime: 30 * 60 * 1000,
  });
}
