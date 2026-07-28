/**
 * Collection page for the TV build. Inset rounded header (collection
 * backdrop, franchise logo, era + rating + count + runtime + genres)
 * followed by a single D-pad shelf
 * of the collection's movies in release order — instead of the web page's
 * hero card + sort dropdown + poster grid, which don't work from a remote.
 */
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import RatingPill from "../../components/ui/RatingPill";
import Logo from "../../components/media/shared/EnhancedTitle";
import { getCollectionById } from "../../api/collections.api";
import { useMediaLogo } from "../../hooks/images/useMediaLogo";
import { avgCollectionRating } from "../../utils/avgCollectionRating";
import { firstLastRelease } from "../../utils/firstLastRelease";
import genreMap from "../../utils/genreMap";

const TMDB_IMG = "https://image.tmdb.org/t/p";

function formatRuntime(minutes: number): string | null {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TvCollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const idNum = parseInt(collectionId || "", 10);

  const { data: collection, isLoading, isError } = useQuery({
    queryKey: ["collection", idNum],
    queryFn: () => getCollectionById(idNum),
    enabled: Number.isFinite(idNum),
    staleTime: 5 * 60 * 1000,
  });

  const parts = useMemo(() => {
    const list = [...(collection?.parts ?? [])];
    // Release order, undated (unreleased/announced) entries last.
    return list.sort((a, b) => {
      const da = a.release_date || "9999";
      const db = b.release_date || "9999";
      return da.localeCompare(db);
    });
  }, [collection?.parts]);

  // Collections carry no logo art of their own on TMDB, so the earliest
  // released movie's logo fronts the hero (parts are release-sorted).
  const { data: logoPath } = useMediaLogo("movie", parts[0]?.id);

  // TMDB doesn't return genres on the collection itself, so derive the top 3
  // by frequency across the collection's parts.
  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const part of collection?.parts ?? []) {
      const ids = part.genre_ids ?? part.genres?.map((g) => g.id) ?? [];
      for (const id of ids) {
        const name = genreMap[id];
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
      .join(", ");
  }, [collection?.parts]);

  if (!Number.isFinite(idNum)) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Invalid or missing collection id.</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main>
        <div className="mx-auto mt-[2vh] w-[92vw] h-[38vh] animate-pulse rounded-2xl bg-white/5" />
      </main>
    );
  }

  if (isError || !collection) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Error loading collection.</p>
      </main>
    );
  }

  const displayName = collection.name.replace(/\s+collection$/i, "");
  const rating = avgCollectionRating(collection.parts);
  const { first, last } = firstLastRelease(collection.parts);
  const era =
    Number.isFinite(first) && Number.isFinite(last)
      ? first === last
        ? `${first}`
        : `${first} – ${last}`
      : null;
  const backdropPath = collection.backdrop_path || collection.poster_path;

  const ratingNum = rating ? Number(rating) : undefined;
  const totalRuntime = formatRuntime(
    parts.reduce((sum, p) => sum + (p.runtime ?? 0), 0),
  );
  const movieCount = `${parts.length} movie${parts.length === 1 ? "" : "s"}`;

  return (
    <main className="pb-16">
      {/* Inset rounded header — matches TvGenreDetailPage / other TV detail views. */}
      <section className="flex justify-center py-[2vh]">
        <div className="relative mx-auto w-[92vw] h-[38vh] overflow-hidden rounded-2xl border border-white/15 shadow-2xl">
          {backdropPath ? (
            <img
              src={`${TMDB_IMG}/w1280${backdropPath}`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--component-primary)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

          <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-6">
            {logoPath ? (
              <Logo
                path={logoPath}
                alt={displayName}
                className="max-h-24 w-auto max-w-[40%] drop-shadow-lg animate-[fadeIn_0.3s_ease-in-out]"
                sizes="40vw"
                priority
              />
            ) : (
              <h1 className="text-5xl font-bold text-white [text-shadow:0_2px_8px_rgb(0_0_0_/_0.75)]">
                {displayName}
              </h1>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-gray-300 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
              {ratingNum && <RatingPill rating={ratingNum} />}
              <span className="text-gray-400">
                {[era, movieCount, totalRuntime].filter(Boolean).join(" · ")}
              </span>
            </div>
            {genres && (
              <div className="mt-1 text-sm text-gray-300 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
                {genres}
              </div>
            )}
            {collection.overview && (
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70 line-clamp-2 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
                {collection.overview}
              </p>
            )}
          </div>
        </div>
      </section>

      <TvFocusRow media_type="movie" items={parts} title="Movies" />
    </main>
  );
}
