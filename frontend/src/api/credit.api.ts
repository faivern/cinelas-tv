import { api } from "./http/axios";
import type { Credit, CreditsResponse, MediaType } from "../types/tmdb";

// aggregate_credits nests character/job inside roles[]/jobs[]; flatten so
// consumers can treat movie and TV credits uniformly.
function normalizeCredit(credit: Credit): Credit {
  const character =
    credit.character ??
    credit.roles?.map((r) => r.character).filter(Boolean).join(" / ");
  const job =
    credit.job ?? credit.jobs?.map((j) => j.job).filter(Boolean).join(", ");
  return { ...credit, character: character || undefined, job: job || undefined };
}

export async function getMediaCredits(
  mediaType: MediaType,
  mediaId: number
): Promise<CreditsResponse> {
  const path =
    mediaType === "movie"
      ? `/api/Movies/movie/${mediaId}/credits`
      : `/api/Movies/tv/${mediaId}/aggregate_credits`;

  const response = await api.get<CreditsResponse>(path);
  return {
    cast: (response.data.cast ?? []).map(normalizeCredit),
    crew: (response.data.crew ?? []).map(normalizeCredit),
  };
}
