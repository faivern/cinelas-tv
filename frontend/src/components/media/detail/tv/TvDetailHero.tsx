import type { ComponentType } from "react";
import type { DetailMedia, MediaType } from "../../../../types/tmdb";
import { useMediaLogo } from "../../../../hooks/images/useMediaLogo";
import { useMediaBackdrops } from "../../../../hooks/media/useMediaBackdrops";
import Logo from "../../shared/EnhancedTitle";
import RotatingBackdrop from "../../shared/RotatingBackdrop";
import BrandLogo from "../../../common/BrandLogo";
import RatingPill from "../../../ui/RatingPill";
import StatusPicker from "../StatusPicker";
import {
  ChevronRight,
  LayoutGrid,
  ListVideo,
  MonitorPlay,
  Play,
  Users,
} from "lucide-react";

export type TvDetailSection = "episodes" | "providers" | "credits" | "similar";

function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-fill flex w-full shrink-0 items-center justify-between rounded-lg bg-white/10 px-4 py-2
        text-sm font-medium text-white shadow-lg transition-colors
        focus-visible:bg-white focus-visible:text-black"
    >
      <span className="flex items-center gap-3">
        <Icon className="size-4" />
        {label}
      </span>
      <ChevronRight className="size-4 opacity-60" />
    </button>
  );
}

type Props = {
  details: DetailMedia;
  mediaType: MediaType;
  hasEpisodes: boolean;
  canPlay?: boolean;
  onPlay?: () => void;
  onPlayUnavailable: () => void;
  onPlayTrailer: () => void;
  onOpenSection: (section: TvDetailSection) => void;
};

export default function TvDetailHero({
  details,
  mediaType,
  hasEpisodes,
  canPlay = false,
  onPlay,
  onPlayUnavailable,
  onPlayTrailer,
  onOpenSection,
}: Props) {
  const title = details.title ?? details.name ?? "Unknown";
  const { data: logoPath } = useMediaLogo(mediaType, details.id);
  const { data: fetchedBackdropPaths = [] } = useMediaBackdrops(
    mediaType,
    details.id
  );

  const backdropImagePaths =
    fetchedBackdropPaths.length > 0
      ? fetchedBackdropPaths
      : details.backdrop_path
        ? [details.backdrop_path]
        : [];

  const year = (details.release_date ?? details.first_air_date ?? "").slice(0, 4);
  const runtime =
    mediaType === "movie"
      ? formatRuntime(details.runtime)
      : details.number_of_seasons
        ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? "s" : ""}`
        : null;
  const hasRating = details.vote_average != null && details.vote_average > 0;
  const genres = (details.genres ?? [])
    .slice(0, 3)
    .map((g) => g.name)
    .join(", ");

  const isMovie = mediaType === "movie";
  const showPlayButton = isMovie || canPlay;
  const showLibraryBadge = isMovie && !canPlay;

  const handlePlay = () => {
    if (canPlay && onPlay) {
      onPlay();
    } else {
      onPlayUnavailable();
    }
  };

  return (
    <section
      data-tv-hero
      className="relative h-dvh -mx-[calc(var(--tv-safe-x)*2)] -mt-[calc(var(--tv-safe-y)*2)]"
    >
      {/* Backdrop pinned to the viewport: true end-to-end, rotating every 8s. */}
      <div aria-hidden="true" className="fixed inset-0">
        {backdropImagePaths.length > 0 ? (
          <RotatingBackdrop paths={backdropImagePaths} />
        ) : (
          <div className="h-full w-full bg-component-primary" />
        )}
        {/* Legibility scrim: opaque under the left metadata column, fully clear past 40% width. */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 via-20% to-transparent to-40%" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full max-w-[45%] flex-col justify-end gap-3 px-[calc(var(--tv-safe-x)+1rem)] pb-[calc(var(--tv-safe-y)+1.5rem)]">
        {/* Logo floats in the free space above the bottom stack, scaled to the
            full column width so it reads big from the couch. */}
        <div className="flex min-h-0 flex-1 items-center">
          {logoPath ? (
            <Logo
              path={logoPath}
              alt={title}
              className="max-h-56 w-full object-left animate-[fadeIn_0.3s_ease-in-out]"
              sizes="45vw"
              priority
            />
          ) : (
            <h1 className="text-6xl font-bold text-white [text-shadow:0_2px_8px_rgb(0_0_0_/_0.75)]">
              {title}
            </h1>
          )}
        </div>

        {/* Meta row — same presentation as the home trending carousel.
            Subtle text-shadow keeps the copy legible over bright backdrops. */}
        {(hasRating || year || runtime) && (
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-300 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
            {hasRating && (
              <>
                <RatingPill rating={details.vote_average as number} />
                {(year || runtime) && <span className="text-gray-500">·</span>}
              </>
            )}
            {year && (
              <>
                <span className="text-gray-400">{year}</span>
                {runtime && <span className="text-gray-500">·</span>}
              </>
            )}
            {runtime && <span className="text-gray-400">{runtime}</span>}
          </div>
        )}

        {(genres || showLibraryBadge) && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
            {genres && <span>{genres}</span>}
            {showLibraryBadge && (
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
                Not in library
              </span>
            )}
          </div>
        )}

        {details.overview && (
          <p className="text-sm leading-relaxed text-white/70 line-clamp-2 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.85)]">
            {details.overview}
          </p>
        )}

        {/* Play has its own placement; everything else lives in the option menu.
            Movies always show Play so the state is discoverable by D-pad: owned
            titles stream, unowned ones toast a hint (plus the meta-row badge). */}
        <div className="flex flex-wrap items-center gap-3">
          {showPlayButton && (
            <button
              type="button"
              data-tv-autofocus
              onClick={handlePlay}
              className={`flex w-fit items-center gap-2.5 rounded-lg px-6 py-2 text-base font-semibold
                shadow-lg transition-transform focus-visible:scale-105 ${
                  canPlay
                    ? "bg-white text-black"
                    : "bg-white/60 text-black/70 focus-visible:bg-white focus-visible:text-black"
                }`}
            >
              <Play className="size-4 fill-current" />
              Play
            </button>
          )}
          <button
            type="button"
            {...(showPlayButton ? {} : { "data-tv-autofocus": true })}
            onClick={onPlayTrailer}
            className={`flex w-fit items-center gap-2.5 rounded-lg px-6 py-2 text-base font-semibold
              shadow-lg transition-transform focus-visible:scale-105 ${
                showPlayButton
                  ? "bg-white/10 text-white focus-visible:bg-white focus-visible:text-black"
                  : "bg-white text-black"
              }`}
          >
            <Play className="size-4" />
            Play trailer
          </button>
        </div>

        {/* Vertical option menu (scrolls if it ever outgrows its slot) —
            sections appear only when summoned from here. Mask softens the
            top/bottom cutoff so scrolled items don't get a hard edge. */}
        <div
          className="flex max-h-[36vh] w-72 flex-col gap-2 overflow-y-auto py-2"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0, black 0.75rem, black calc(100% - 0.75rem), transparent 100%)",
          }}
        >
          {hasEpisodes && (
            <MenuItem
              icon={ListVideo}
              label="More Episodes"
              onClick={() => onOpenSection("episodes")}
            />
          )}
          <StatusPicker
            mediaId={details.id}
            mediaType={mediaType}
            variant="tv-menu"
          />
          <MenuItem
            icon={MonitorPlay}
            label="Where to Watch"
            onClick={() => onOpenSection("providers")}
          />
          <MenuItem
            icon={Users}
            label="Credits & More Info"
            onClick={() => onOpenSection("credits")}
          />
          <MenuItem
            icon={LayoutGrid}
            label="More Like This"
            onClick={() => onOpenSection("similar")}
          />
        </div>
      </div>

      {/* Cinelas watermark — fixed to the bottom-right corner. */}
      <div
        className="pointer-events-none fixed bottom-[calc(var(--tv-safe-y)+1rem)] right-[calc(var(--tv-safe-x)+1rem)] z-10 scale-125 opacity-40"
        aria-hidden="true"
      >
        <BrandLogo />
      </div>
    </section>
  );
}
