/**
 * Genre page for the TV build. Netflix/Disney+-style category page: a compact
 * full-bleed header (genre backdrop, name, catalogue counts) followed by
 * D-pad shelves — Popular / Top Rated / New Releases per supported media
 * type — instead of the web page's sort dropdown + infinite scroll grid,
 * which don't work from a remote.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import RotatingBackdrop from "../../components/media/shared/RotatingBackdrop";
import { useGenreById } from "../../hooks/genres/useGenreById";
import { useGenresWithBackdrops } from "../../hooks/genres/useGenresWithBackdrops";
import { getDiscoverGenre } from "../../api/genres.api";
import { getAdvancedDiscover } from "../../api/advancedDiscover.api";
import { getGenreColor } from "../../theme/genreColors";
import { CANONICAL_GENRE_IDS } from "../../utils/genreMap";
import type { MediaType } from "../../types/tmdb";

function useGenreShelf(
  mediaType: MediaType,
  genreId: number | undefined,
  sortBy: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["discover", "genre", "tv-shelf", mediaType, genreId, sortBy],
    queryFn: () =>
      getDiscoverGenre({ mediaType, genreId: genreId!, page: 1, sortBy }),
    enabled: Boolean(genreId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** "New releases" the streaming-app way: popular titles from the last ~2
 *  calendar years, not a raw release-date sort (which surfaces unrated
 *  obscurities and unreleased entries). */
function useNewReleases(
  mediaType: MediaType,
  genreId: number | undefined,
  enabled: boolean,
) {
  const yearGte = new Date().getFullYear() - 1;
  return useQuery({
    queryKey: ["discover", "genre", "tv-shelf-new", mediaType, genreId, yearGte],
    queryFn: () =>
      getAdvancedDiscover({
        mediaType,
        genreIds: [genreId!],
        primaryReleaseYearGte: yearGte,
        sortBy: "popularity.desc",
      }),
    enabled: Boolean(genreId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export default function TvGenreDetailPage() {
  const { genreId } = useParams<{ genreId: string }>();

  const genreIdNum = useMemo(() => {
    const n = parseInt(genreId || "", 10);
    if (!Number.isFinite(n)) return undefined;
    return CANONICAL_GENRE_IDS[n] ?? n;
  }, [genreId]);

  const { genre, supportsMovie, supportsTv, isLoading: genreLoading } =
    useGenreById(genreIdNum);
  const genreName = genre?.name ?? "Unknown Genre";

  const { data: genresWithBackdrops } = useGenresWithBackdrops();
  const backdropPaths =
    genresWithBackdrops?.find((g) => g.id === genreIdNum)?.backdropPaths ?? [];

  const moviesOn = !genreLoading && supportsMovie;
  const showsOn = !genreLoading && supportsTv;

  const moviePopular = useGenreShelf("movie", genreIdNum, "popularity.desc", moviesOn);
  const movieTopRated = useGenreShelf("movie", genreIdNum, "vote_average.desc", moviesOn);
  const movieNew = useNewReleases("movie", genreIdNum, moviesOn);
  const tvPopular = useGenreShelf("tv", genreIdNum, "popularity.desc", showsOn);
  const tvTopRated = useGenreShelf("tv", genreIdNum, "vote_average.desc", showsOn);
  const tvNew = useNewReleases("tv", genreIdNum, showsOn);

  if (!genreIdNum) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Invalid or missing genre id.</p>
      </main>
    );
  }

  if (genreLoading) {
    return (
      <main>
        <div className="mx-auto mt-[2vh] w-[90vw] h-[30vh] animate-pulse rounded-2xl bg-white/5" />
      </main>
    );
  }

  return (
    <main className="pb-16">
      {/* Category header — a short, wide banner so the first shelf stays visible. */}
      <section className="flex justify-center py-[2vh]">
        <div className="relative w-[90vw] h-[30vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
          {backdropPaths.length > 0 ? (
            <RotatingBackdrop paths={backdropPaths} />
          ) : (
            <div className={`absolute inset-0 ${getGenreColor(genreIdNum)}`} />
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

          <div className="absolute inset-0 z-10 flex items-center justify-center px-8">
            <h1 className="text-center text-5xl font-bold tracking-tight text-white [text-shadow:0_2px_12px_rgb(0_0_0_/_0.85)]">
              {genreName}
            </h1>
          </div>
        </div>
      </section>

      {moviesOn && (
        <>
          <TvFocusRow
            media_type="movie"
            items={moviePopular.data?.results ?? []}
            loading={moviePopular.isLoading}
            title={`Popular ${genreName} Movies`}
          />
          {(movieTopRated.isLoading || (movieTopRated.data?.results?.length ?? 0) > 0) && (
            <TvFocusRow
              media_type="movie"
              items={movieTopRated.data?.results ?? []}
              loading={movieTopRated.isLoading}
              title="Top Rated Movies"
            />
          )}
          {(movieNew.isLoading || (movieNew.data?.results?.length ?? 0) > 0) && (
            <TvFocusRow
              media_type="movie"
              items={movieNew.data?.results ?? []}
              loading={movieNew.isLoading}
              title="New Movie Releases"
            />
          )}
        </>
      )}

      {showsOn && (
        <>
          <TvFocusRow
            media_type="tv"
            items={tvPopular.data?.results ?? []}
            loading={tvPopular.isLoading}
            title={`Popular ${genreName} TV Shows`}
          />
          {(tvTopRated.isLoading || (tvTopRated.data?.results?.length ?? 0) > 0) && (
            <TvFocusRow
              media_type="tv"
              items={tvTopRated.data?.results ?? []}
              loading={tvTopRated.isLoading}
              title="Top Rated TV Shows"
            />
          )}
          {(tvNew.isLoading || (tvNew.data?.results?.length ?? 0) > 0) && (
            <TvFocusRow
              media_type="tv"
              items={tvNew.data?.results ?? []}
              loading={tvNew.isLoading}
              title="New TV Shows"
            />
          )}
        </>
      )}
    </main>
  );
}
