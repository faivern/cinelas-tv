import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { User } from "lucide-react";
import { usePerson } from "../../hooks/people/usePerson";
import { useCombinedCredits } from "../../hooks/people/useCombinedCredits";
import { useSortedMedia } from "../../hooks/sorting";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import { dateFormatLong } from "../../utils/dateFormatLong";
import { calcAge } from "../../utils/calcAge";
import { knownForDepartment } from "../../utils/knownForDepartment";
import type { TrendingMedia } from "../../types/tmdb";
import { hasRememberedFocus } from "../../lib/tv/focusMemory";

const TMDB_IMG = "https://image.tmdb.org/t/p";

type PersonCredit = TrendingMedia & {
  vote_count?: number;
  character?: string;
  job?: string;
};

/** Full-screen biography reader. The scrollable text is the only focusable
 *  element, so D-pad up/down fall through to native scrolling; BACK (→Escape
 *  via backButton.ts) closes it. */
function TvBioOverlay({
  name,
  biography,
  onClose,
}: {
  name: string;
  biography: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} biography`}
      className="fixed inset-0 z-50 flex flex-col items-center bg-black/95 px-[10vw] py-[6vh]"
    >
      <h2 className="mb-4 text-3xl font-bold text-white">{name}</h2>
      <div
        ref={scrollRef}
        tabIndex={0}
        data-tv-autofocus
        className="focus-ring-target min-h-0 flex-1 overflow-y-auto rounded-xl bg-white/5 px-8 py-6"
      >
        <p className="whitespace-pre-line text-xl leading-relaxed text-white/85">
          {biography}
        </p>
      </div>
      <p className="mt-4 text-base text-white/50">Press BACK to close</p>
    </div>
  );
}

export default function TvCreditsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const personId = parseInt(id || "", 10);
  const [bioOpen, setBioOpen] = useState(false);

  const { data: person, isLoading: personLoading, error: personError } = usePerson(personId);
  const { data: creditsData, isLoading: creditsLoading } = useCombinedCredits(personId);

  // Cast-in-another-person navigation reuses this page; start each at the
  // top — unless focus memory is about to restore a position (back-navigation).
  useEffect(() => {
    if (!hasRememberedFocus()) window.scrollTo(0, 0);
    setBioOpen(false);
  }, [personId]);

  // Merge acting + crew credits so directors/writers get a filmography too,
  // deduping titles the person holds several roles on.
  const seen = new Set<string>();
  const allCredits = [
    ...((creditsData?.cast ?? []) as PersonCredit[]),
    ...((creditsData?.crew ?? []) as PersonCredit[]),
  ].filter((c) => {
    const key = `${c.media_type}-${c.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sortedCredits = useSortedMedia(allCredits, "bayesian");
  const movies = sortedCredits.filter((c) => c.media_type === "movie");
  const shows = sortedCredits.filter((c) => c.media_type === "tv");

  if (!id || isNaN(personId)) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Invalid person ID.</p>
      </main>
    );
  }

  if (personLoading) {
    return (
      <main>
        <div className="h-[70vh] -mx-[var(--tv-safe-x)] -mt-[var(--tv-safe-y)] animate-pulse bg-white/5" />
      </main>
    );
  }

  if (personError || !person) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Error loading person.</p>
      </main>
    );
  }

  const backdropPath = sortedCredits.find((c) => c.backdrop_path)?.backdrop_path;
  const knownFor = knownForDepartment(person.known_for_department, person.gender);
  const age = calcAge(person.birthday, person.deathday);
  const ageLabel = age !== "N/A" ? ` (${age})` : "";
  const born = person.birthday
    ? `Born ${dateFormatLong(person.birthday)}${!person.deathday ? ageLabel : ""}`
    : null;
  const died = person.deathday
    ? `Died ${dateFormatLong(person.deathday)}${ageLabel}`
    : null;
  const metaParts = [knownFor, born, died, person.place_of_birth].filter(
    Boolean,
  ) as string[];

  return (
    <main className="pb-16">
      {/* Hero — backdrop borrowed from the person's top-rated credit */}
      <section className="relative h-[70vh] -mx-[var(--tv-safe-x)] -mt-[var(--tv-safe-y)] overflow-hidden">
        {backdropPath ? (
          <img
            src={`${TMDB_IMG}/w1280${backdropPath}`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 bg-component-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[var(--background)] to-transparent" />

        <div className="relative z-10 flex h-full items-end gap-10 px-[calc(var(--tv-safe-x)+1rem)] pb-10">
          {person.profile_path ? (
            <img
              src={`${TMDB_IMG}/w500${person.profile_path}`}
              alt={person.name}
              className="h-[42vh] w-auto shrink-0 rounded-2xl border border-[var(--border)] object-cover shadow-2xl"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div
              role="img"
              aria-label={person.name}
              className="flex h-[42vh] w-[calc(42vh*2/3)] shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--component-primary)] text-accent-primary shadow-2xl"
            >
              <User className="h-1/3 w-1/3" />
            </div>
          )}

          <div className="flex max-w-[55%] flex-col gap-4">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg">
              {person.name}
            </h1>

            {metaParts.length > 0 && (
              <div className="text-lg text-white/85">{metaParts.join("  •  ")}</div>
            )}

            {person.biography && (
              <p className="text-lg leading-relaxed text-white/70 line-clamp-3">
                {person.biography}
              </p>
            )}

            {person.biography && (
              <div className="pt-1">
                <button
                  type="button"
                  data-tv-autofocus
                  onClick={() => setBioOpen(true)}
                  className="rounded-lg bg-white/15 px-8 py-3.5 text-xl font-semibold text-white shadow-lg backdrop-blur-sm transition-transform focus-visible:scale-105 focus-visible:bg-white/25"
                >
                  Full biography
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {creditsLoading || movies.length > 0 ? (
        <TvFocusRow
          media_type="movie"
          items={movies}
          loading={creditsLoading}
          title="Movies"
        />
      ) : null}

      {shows.length > 0 && (
        <TvFocusRow media_type="tv" items={shows} title="TV Shows" />
      )}

      {bioOpen && person.biography && (
        <TvBioOverlay
          name={person.name}
          biography={person.biography}
          onClose={() => setBioOpen(false)}
        />
      )}
    </main>
  );
}
