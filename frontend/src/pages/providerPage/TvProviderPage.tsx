/**
 * Provider (streaming service) page for the TV build. Compact header with
 * the provider's logo + name, then D-pad shelves — Popular / Top Rated /
 * New Releases per media type — instead of the web page's sort + region
 * dropdowns and infinite grid, which don't work from a remote. Region
 * comes from the persisted selection (getDefaultCountry) since the region
 * picker is desktop-only.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import { getDefaultCountry } from "../../components/media/RegionSelector";
import { useWatchProvidersList } from "../../hooks/media/useWatchProvidersList";
import { getAdvancedDiscover } from "../../api/advancedDiscover.api";
import type { MediaType } from "../../types/tmdb";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function useProviderShelf(
  mediaType: MediaType,
  providerId: number | undefined,
  region: string,
  sortBy: string,
) {
  return useQuery({
    queryKey: [
      "discover",
      "provider",
      "tv-shelf",
      mediaType,
      providerId,
      region,
      sortBy,
    ],
    queryFn: () =>
      getAdvancedDiscover({
        mediaType,
        withWatchProviders: providerId!,
        watchRegion: region,
        sortBy,
      }),
    enabled: Boolean(providerId),
    staleTime: 5 * 60 * 1000,
  });
}

/** "New releases" the streaming-app way: popular titles from the last ~2
 *  calendar years, not a raw release-date sort (which surfaces unrated
 *  obscurities and unreleased entries). Mirrors the genre page. */
function useProviderNewReleases(
  mediaType: MediaType,
  providerId: number | undefined,
  region: string,
) {
  const yearGte = new Date().getFullYear() - 1;
  return useQuery({
    queryKey: [
      "discover",
      "provider",
      "tv-shelf-new",
      mediaType,
      providerId,
      region,
      yearGte,
    ],
    queryFn: () =>
      getAdvancedDiscover({
        mediaType,
        withWatchProviders: providerId!,
        watchRegion: region,
        primaryReleaseYearGte: yearGte,
        sortBy: "popularity.desc",
      }),
    enabled: Boolean(providerId),
    staleTime: 5 * 60 * 1000,
  });
}

export default function TvProviderPage() {
  const { providerId } = useParams<{ providerId: string }>();

  const providerIdNum = useMemo(() => {
    const n = parseInt(providerId || "", 10);
    return Number.isFinite(n) ? n : undefined;
  }, [providerId]);

  // Region: use the last-persisted selection — the region picker is a web
  // control (getDefaultCountry reads localStorage / falls back to the
  // browser locale).
  const region = getDefaultCountry();

  const { data: providersList } = useWatchProvidersList(region);
  const providerInfo = providersList?.find(
    (p) => p.provider_id === providerIdNum,
  );
  const providerName = providerInfo?.provider_name ?? "Provider";
  const providerLogo = providerInfo?.logo_path ?? null;

  const moviePopular = useProviderShelf(
    "movie",
    providerIdNum,
    region,
    "popularity.desc",
  );
  const movieTopRated = useProviderShelf(
    "movie",
    providerIdNum,
    region,
    "vote_average.desc",
  );
  const movieNew = useProviderNewReleases("movie", providerIdNum, region);
  const tvPopular = useProviderShelf(
    "tv",
    providerIdNum,
    region,
    "popularity.desc",
  );
  const tvTopRated = useProviderShelf(
    "tv",
    providerIdNum,
    region,
    "vote_average.desc",
  );
  const tvNew = useProviderNewReleases("tv", providerIdNum, region);

  if (!providerIdNum) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Invalid or missing provider id.</p>
      </main>
    );
  }

  const hasAnyMovies =
    (moviePopular.data?.results?.length ?? 0) > 0 ||
    (movieTopRated.data?.results?.length ?? 0) > 0 ||
    (movieNew.data?.results?.length ?? 0) > 0;
  const hasAnyShows =
    (tvPopular.data?.results?.length ?? 0) > 0 ||
    (tvTopRated.data?.results?.length ?? 0) > 0 ||
    (tvNew.data?.results?.length ?? 0) > 0;

  return (
    <main className="pb-16">
      {/* Compact header — provider logo + name, no backdrop (providers have
          no editorial art) so the first shelf sits closer to the top. */}
      <section className="pb-6 pt-[6vh]">
        <div className="flex items-center gap-6">
          {providerLogo ? (
            <img
              src={`${TMDB_IMG}/w500${providerLogo}`}
              alt={providerName}
              className="h-24 w-24 rounded-2xl object-cover shadow-lg"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div
              className="h-24 w-24 rounded-2xl bg-white/10"
              aria-hidden="true"
            />
          )}
          <h1 className="text-5xl font-bold text-text-h1">{providerName}</h1>
        </div>
      </section>

      {(moviePopular.isLoading || (moviePopular.data?.results?.length ?? 0) > 0) && (
        <TvFocusRow
          media_type="movie"
          items={moviePopular.data?.results ?? []}
          loading={moviePopular.isLoading}
          title={`Popular Movies on ${providerName}`}
        />
      )}
      {(movieTopRated.data?.results?.length ?? 0) > 0 && (
        <TvFocusRow
          media_type="movie"
          items={movieTopRated.data?.results ?? []}
          title="Top Rated Movies"
        />
      )}
      {(movieNew.data?.results?.length ?? 0) > 0 && (
        <TvFocusRow
          media_type="movie"
          items={movieNew.data?.results ?? []}
          title="New Movie Releases"
        />
      )}

      {(tvPopular.isLoading || (tvPopular.data?.results?.length ?? 0) > 0) && (
        <TvFocusRow
          media_type="tv"
          items={tvPopular.data?.results ?? []}
          loading={tvPopular.isLoading}
          title={`Popular TV Shows on ${providerName}`}
        />
      )}
      {(tvTopRated.data?.results?.length ?? 0) > 0 && (
        <TvFocusRow
          media_type="tv"
          items={tvTopRated.data?.results ?? []}
          title="Top Rated TV Shows"
        />
      )}
      {(tvNew.data?.results?.length ?? 0) > 0 && (
        <TvFocusRow
          media_type="tv"
          items={tvNew.data?.results ?? []}
          title="New TV Shows"
        />
      )}

      {!moviePopular.isLoading && !tvPopular.isLoading && !hasAnyMovies && !hasAnyShows && (
        <div className="flex h-[40vh] flex-col items-center justify-center px-8 text-center">
          <p className="text-2xl text-white/85">
            Nothing available on {providerName} for your region.
          </p>
          <p className="mt-3 text-lg text-white/60">
            Try changing your region from the desktop app.
          </p>
        </div>
      )}
    </main>
  );
}
