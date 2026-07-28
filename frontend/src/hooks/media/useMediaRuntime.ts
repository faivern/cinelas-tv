import { useMemo } from "react";

type UseMediaRuntimeProps = {
  mediaType: string;
  runtimeMin?: number | null;
  seasons?: number | null;
};

export default function useMediaRuntime({
  mediaType,
  runtimeMin,
  seasons,
}: UseMediaRuntimeProps): string | null {
  return useMemo(() => {
    if (mediaType === "movie") {
      if (typeof runtimeMin !== "number" || runtimeMin <= 0) return null;

      const hours = Math.floor(runtimeMin / 60);
      const minutes = runtimeMin % 60;

      if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
      if (hours > 0) return `${hours}h`;
      return `${minutes}min`;
    }

    if (mediaType === "tv") {
      return seasons ? `${seasons} Season${seasons > 1 ? "s" : ""}` : null;
    }

    return null;
  }, [mediaType, runtimeMin, seasons]);
}
