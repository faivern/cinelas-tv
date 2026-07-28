// hooks/images/useMediaLogo.ts
import { useQuery, queryOptions } from "@tanstack/react-query";
import { getLogoImages } from "../../api/images.api";

const DAY = 24 * 60 * 60 * 1000;

// Logos are effectively static art — cache aggressively so a prefetched
// entry is still warm whenever the card is focused later in the session.
export function mediaLogoQueryOptions(mediaType: "movie" | "tv", id: number) {
  return queryOptions<string | null>({
    queryKey: ["mediaLogo", mediaType, id],
    staleTime: DAY,
    gcTime: DAY,
    retry: false,
    queryFn: async () => {
      const data = await getLogoImages(mediaType, id);
      const logos = data?.logos ?? [];
      const en = logos.find(l => (l.iso_639_1 ?? "").toLowerCase() === "en");
      return (en ?? logos[0])?.file_path ?? null;
    },
  });
}

export function useMediaLogo(mediaType?: "movie" | "tv", id?: number) {
  return useQuery({
    ...mediaLogoQueryOptions(mediaType ?? "movie", id ?? 0),
    enabled: !!mediaType && !!id,
  });
}
