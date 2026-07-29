import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TrendingMedia } from "../../../types/tmdb";
import { Link } from "react-router-dom";
import { mediaUrl } from "../../../utils/urlBuilder";
import Backdrop from "../../media/shared/Backdrop";
import RatingPill from "../../ui/RatingPill";
import genreMap, { resolveGenreIds } from "../../../utils/genreMap";
import { useMediaLogo } from "../../../hooks/images/useMediaLogo";
import Logo from "../shared/EnhancedTitle";
import useEmblaCarousel from "embla-carousel-react";
import { isTvMode } from "../../../lib/tv/tvMode";
import { playNavSound } from "../../../lib/tv/navSounds";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  items: TrendingMedia[];
  loading?: boolean;
};

function SlideTitleArea({ m, isActive }: { m: TrendingMedia; isActive: boolean }) {
  const mediaType =
    m.media_type === "movie" || m.media_type === "tv" ? m.media_type : undefined;
  // Only fetch logo for the active slide to avoid 20+ simultaneous /images calls
  const { data: logoPath } = useMediaLogo(
    isActive ? mediaType : undefined,
    isActive ? m.id : undefined
  );

  useEffect(() => {
    if (!logoPath) return;
    const img = new Image();
    img.src = `https://image.tmdb.org/t/p/w342${logoPath}`;
    return () => { img.src = ""; };
  }, [logoPath]);

  if (!isActive) return null;

  return logoPath ? (
    <Logo
      path={logoPath}
      alt={m.title || m.name || "Title logo"}
      className="max-h-16 w-auto max-w-xs animate-[fadeIn_0.4s_ease-in-out]"
      sizes="100vw"
      priority={false}
    />
  ) : (
    <h2 className="text-white text-3xl font-bold animate-[fadeIn_0.3s_ease-in-out]">
      {m.title || m.name}
    </h2>
  );
}

export default function TrendingCarousel({ items, loading = false }: Props) {
  const tv = isTvMode();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const intervalTime = tv ? 6000 : 8000;

  // TV: autoplay only while the remote is idle — any input pauses rotation,
  // 2s of silence resumes it, so a slide never rotates away right under an
  // imminent OK press.
  const IDLE_RESUME_MS = 2000;
  const [idle, setIdle] = useState(true);
  useEffect(() => {
    if (!tv) return;
    let timer: number | undefined;
    const onInput = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_RESUME_MS);
    };
    window.addEventListener("keydown", onInput, true);
    window.addEventListener("pointerdown", onInput, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onInput, true);
      window.removeEventListener("pointerdown", onInput, true);
    };
  }, [tv]);
  // only movie/tv with backdrop
  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (m) =>
          (m.media_type === "movie" || m.media_type === "tv") && m.backdrop_path
      ),
    [items]
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: false,
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  // Meta shows on initial load and on user interaction, then fades out and
  // stays hidden across auto-slides so the artwork isn't obstructed.
  const [metaVisible, setMetaVisible] = useState(true);
  const hideMetaTimerRef = useRef<number | null>(null);

  const revealMeta = useCallback(() => {
    setMetaVisible(true);
    if (hideMetaTimerRef.current) clearTimeout(hideMetaTimerRef.current);
    hideMetaTimerRef.current = window.setTimeout(
      () => setMetaVisible(false),
      4000
    );
  }, []);

  useEffect(() => {
    hideMetaTimerRef.current = window.setTimeout(
      () => setMetaVisible(false),
      4000
    );
    return () => {
      if (hideMetaTimerRef.current) clearTimeout(hideMetaTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("init", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("init", onSelect);
    };
  }, [emblaApi]);

  // autoplay — on TV it only runs while idle (see above)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!loading && emblaApi && filtered.length > 0 && (!tv || idle)) {
      intervalRef.current = window.setInterval(() => {
        emblaApi.scrollNext();
      }, intervalTime);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, emblaApi, filtered.length, tv, idle, intervalTime]);

  // TV: the hero is a single focus stop — when the slide changes while focus
  // is inside (D-pad left/right or idle autoplay), move focus to the new
  // active slide so it never lingers on an off-screen, aria-hidden anchor.
  // The ref marks the move as programmatic so an autoplay-driven refocus
  // doesn't count as user interaction (which would re-reveal the meta).
  const programmaticFocusRef = useRef(false);
  useEffect(() => {
    if (!tv) return;
    const root = containerRef.current;
    if (!root || !root.contains(document.activeElement)) return;
    const active = root.querySelector<HTMLElement>("a[data-tv-autofocus]");
    if (!active) return;
    programmaticFocusRef.current = true;
    active.focus({ preventScroll: true });
    programmaticFocusRef.current = false;
  }, [tv, currentIndex]);

  // TV: left/right cycle the slides directly (spatialNavigation defers to us
  // inside [data-tv-slider]); Enter/OK activates the focused slide's Link.
  const onTvKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!tv || !emblaApi) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        emblaApi.scrollNext();
        playNavSound("right");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        emblaApi.scrollPrev();
        playNavSound("left");
      }
    },
    [tv, emblaApi]
  );

  // Only the active slide and its two neighbours keep a backdrop <img> mounted.
  // Holding all ~20 decoded at once starves the TV's image cache and makes the
  // auto-advance transform stutter; three eager neighbours load well before the
  // 6s rotation reaches them.
  const isNearActive = useCallback(
    (idx: number) => {
      const n = filtered.length;
      if (n === 0) return false;
      return (
        idx === currentIndex ||
        idx === (currentIndex + 1) % n ||
        idx === (currentIndex - 1 + n) % n
      );
    },
    [currentIndex, filtered.length]
  );

  return (
    <div data-tv-row className="w-full">
      {/* Web: hero slides under the translucent sticky navbar (-mt-40).
          TV: the header is in-flow and must never cover the hero. */}
      <div
        ref={containerRef}
        data-tv-slider={tv ? "true" : undefined}
        className="relative w-full overflow-hidden -mt-40 tv:mt-0 tv:rounded-2xl tv:ring-1 tv:ring-white/10 tv:shadow-lg"
        onFocusCapture={() => {
          if (!programmaticFocusRef.current) revealMeta();
        }}
        onKeyDown={onTvKeyDown}
        onKeyDownCapture={revealMeta}
        onPointerDownCapture={revealMeta}
      >
        {/* Arrows — pointer-only chrome, hidden for the D-pad build */}
        {!tv && !loading && filtered.length > 0 && (
          <button
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Previous"
            className="hidden sm:block absolute left-2 sm:left-4 top-1/2 z-20 -translate-y-1/2
                       bg-black/40 backdrop-blur-sm text-white/70
                       hover:bg-black/60 hover:text-white
                       rounded-full p-3 sm:p-4 transition-all duration-300
                       shadow-[0_0_20px_rgba(0,0,0,0.5)]
                       hover:shadow-[0_0_30px_rgba(0,0,0,0.7)]
                       hover:scale-110 cursor-pointer"
          >
            <ChevronLeft className="size-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          </button>
        )}

        {!tv && (
        <button
          onClick={() => emblaApi?.scrollNext()}
          aria-label="Next"
          disabled={loading || filtered.length === 0}
          className="hidden sm:block absolute right-2 sm:right-4 top-1/2 z-20 -translate-y-1/2
                     bg-black/40 backdrop-blur-sm text-white/70
                     hover:bg-black/60 hover:text-white
                     disabled:opacity-0 disabled:cursor-not-allowed
                     rounded-full p-3 sm:p-4 transition-all duration-300
                     shadow-[0_0_20px_rgba(0,0,0,0.5)]
                     hover:shadow-[0_0_30px_rgba(0,0,0,0.7)]
                     hover:scale-110 cursor-pointer"
        >
          <ChevronRight className="size-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </button>
        )}

        <div
          ref={emblaRef}
          className="relative w-full overflow-hidden"
        >
          <div className="flex h-[60dvh] md:h-[65dvh] lg:h-[75dvh] xl:h-[78dvh]">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex-[0_0_100%] min-w-0">
                    <div className="w-full h-full bg-white/10 animate-pulse" />
                  </div>
                ))
              : filtered.map((m, idx) => {
                  const year = (m.release_date || m.first_air_date || "").slice(0, 4);
                  const genres = resolveGenreIds(m.genre_ids ?? [], m.original_language)
                    .map((id) => genreMap[id])
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ");
                  return (
                  <div
                    key={m.id}
                    className="flex-[0_0_100%] min-w-0 relative"
                  >
                    <Link
                      to={mediaUrl(m.media_type || "movie", m.id, m.title || m.name || "")}
                      data-tv-autofocus={idx === currentIndex ? "true" : undefined}
                      // TV: one focus stop — off-screen slides are hidden from
                      // spatial navigation, and the shared focus key restores
                      // the hero (whatever slide is active) on back-navigation.
                      data-tv-focus-key={tv ? "trending-hero" : undefined}
                      aria-hidden={tv && idx !== currentIndex ? true : undefined}
                      tabIndex={tv && idx !== currentIndex ? -1 : undefined}
                      className="focus-ring-none block h-full tv:rounded-2xl"
                    >
                      <div className="absolute bottom-0 left-0 w-full h-38 bg-gradient-to-t from-background via-background/70 to-transparent z-10"></div>
                      {isNearActive(idx) ? (
                        <Backdrop
                          path={m.backdrop_path || undefined}
                          alt={m.title || m.name || "Backdrop"}
                          className="w-full h-full object-cover object-top transition-opacity duration-1000 ease-in-out"
                          width="w1280"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5" />
                      )}
                      <div
                        className={`absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-background/80 via-black/30 to-transparent z-0 pointer-events-none
                          transition-opacity duration-700 ${metaVisible ? "opacity-100" : "opacity-0"}`}
                      />
                    </Link>

                    <div
                      className={`absolute bottom-4 sm:bottom-10 md:bottom-14 left-4 sm:left-8 md:left-12 z-(--z-overlay)
                             flex flex-col gap-3
                             w-[calc(100%-2rem)] sm:w-[min(75%,36rem)] max-w-2xl
                             px-4 sm:px-6 py-4 sm:py-6`}
                    >
                      {/* Title / Logo */}
                      <div
                        className="flex items-start flex-wrap gap-2
                             min-h-10 sm:min-h-12 md:min-h-14"
                      >
                        <SlideTitleArea m={m} isActive={idx === currentIndex} />
                      </div>
                      {/* Meta + overview: visible briefly after a slide change, then fades out */}
                      {/* Collapses to 0 height on fade so the logo above slides
                          down into the corner instead of floating mid-image. */}
                      <div
                        className={`flex flex-col gap-2 overflow-hidden pointer-events-none
                          transition-[max-height,opacity] duration-700 ease-out
                          ${metaVisible ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
                        aria-label="Media metadata"
                        aria-hidden={!metaVisible}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 text-gray-300 text-sm sm:text-base">
                          {m.vote_average != null && m.vote_average > 0 && (
                            <>
                              <RatingPill rating={m.vote_average} />
                              {(year || genres) && <span className="text-gray-500">·</span>}
                            </>
                          )}
                          {year && (
                            <>
                              <span className="text-gray-400">{year}</span>
                              {genres && <span className="text-gray-500">·</span>}
                            </>
                          )}
                          {genres && <span>{genres}</span>}
                        </div>

                        <p className="hidden sm:line-clamp-2 text-gray-300 text-sm sm:text-base md:text-lg leading-snug overflow-hidden">
                          {m.overview || "No overview available."}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })}
          </div>
        </div>

        {/* Dots */}
        <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 lg:bottom-6 xl:bottom-8 left-1/2 z-30 hidden lg:flex gap-2 -translate-x-1/2">
          {(loading ? Array.from({ length: 6 }) : filtered).map((_, idx) => {
            const isActive = !loading && idx === currentIndex;
            const bar = (
              <span
                className={`block h-1 sm:h-0.5 md:h-1 lg:h-1.5 xl:h-2 w-4 sm:w-6 md:w-8 lg:w-10 xl:w-12 rounded-full transition-all
                ${
                  isActive
                    ? "bg-gradient-to-r from-accent-primary to-accent-secondary scale-110 shadow"
                    : "bg-gray-400/60 group-hover:bg-gradient-to-r group-hover:from-accent-primary/75 group-hover:to-accent-secondary/75"
                }`}
              />
            );
            // TV: dots are a read-only position indicator — left/right on the
            // hero cycles slides, so the dots must not be D-pad focus targets.
            return tv ? (
              <span key={idx} className="py-2 px-1 flex items-center justify-center">
                {bar}
              </span>
            ) : (
              <button
                key={idx}
                type="button"
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={isActive ? "true" : "false"}
                disabled={loading}
                onClick={() => !loading && emblaApi?.scrollTo(idx)}
                className="group py-2 px-1 flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                {bar}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
