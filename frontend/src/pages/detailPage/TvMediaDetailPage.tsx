import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { MediaType } from "../../types/tmdb";
import { useMediaDetail } from "../../hooks/media/useMediaDetail";
import { useMediaCredits } from "../../hooks/people/useMediaCredits";
import { useSimilarMedia } from "../../hooks/media/useSimilarMedia";
import { usePlayback } from "../../hooks/media/usePlayback";
import { getEpisodePlayback } from "../../api/playback.api";
import TvDetailHero, {
  type TvDetailSection,
} from "../../components/media/detail/tv/TvDetailHero";
import TvTrailerOverlay from "../../components/media/detail/tv/TvTrailerOverlay";
import TvSectionOverlay from "../../components/media/detail/tv/TvSectionOverlay";
import TvSeasonEpisodes from "../../components/media/detail/tv/TvSeasonEpisodes";
import TvWatchProvidersRow from "../../components/media/detail/tv/TvWatchProvidersRow";
import TvCreditsTabs from "../../components/media/detail/tv/TvCreditsTabs";
import TvPlayerOverlay from "../../components/media/detail/tv/TvPlayerOverlay";
import TvFocusRow from "../../components/media/carousel/TvFocusRow";
import TvConfirmDialog from "../../components/ui/TvConfirmDialog";

const SECTION_LABELS: Record<TvDetailSection, string> = {
  episodes: "Episodes",
  providers: "Where to Watch",
  credits: "Credits & More Info",
  similar: "More Like This",
};

export default function TvMediaDetailPage({ mediaType }: { mediaType: MediaType }) {
  const { id } = useParams<{ id: string }>();
  const numericId = parseInt(id || "", 10);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [player, setPlayer] = useState<{ url: string; label: string } | null>(null);
  const [openSection, setOpenSection] = useState<TvDetailSection | null>(null);
  const sectionTriggerRef = useRef<HTMLElement | null>(null);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const libraryDialogTriggerRef = useRef<HTMLElement | null>(null);

  const { data: details, isLoading, isError } = useMediaDetail(mediaType, numericId);
  const { data: credits } = useMediaCredits(mediaType, numericId);
  const { data: similarMedia = [], isLoading: isSimilarLoading } = useSimilarMedia(
    mediaType,
    numericId,
  );
  const { data: playback } = usePlayback(mediaType, numericId);

  // Similar-title navigation reuses this page; each title starts fresh at the
  // hero with every overlay closed.
  useEffect(() => {
    window.scrollTo(0, 0);
    setTrailerOpen(false);
    setPlayer(null);
    setOpenSection(null);
    setLibraryDialogOpen(false);
  }, [mediaType, numericId]);

  const openSectionFrom = (section: TvDetailSection) => {
    sectionTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpenSection(section);
  };

  const closeSection = () => setOpenSection(null);

  // Playback attempt on a title that isn't in the Jellyfin library: instead
  // of a dead end, offer the jump to "Where to Watch".
  const openLibraryDialog = () => {
    libraryDialogTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLibraryDialogOpen(true);
  };

  const cancelLibraryDialog = () => {
    setLibraryDialogOpen(false);
    libraryDialogTriggerRef.current?.focus();
  };

  const goToWhereToWatch = () => {
    setLibraryDialogOpen(false);
    // Closing the providers sheet later should return focus to whatever
    // triggered this dialog (hero Play button or an episode row).
    sectionTriggerRef.current = libraryDialogTriggerRef.current;
    setOpenSection("providers");
  };

  // Hand focus back to the menu button that summoned the closed section.
  useEffect(() => {
    if (openSection === null) sectionTriggerRef.current?.focus();
  }, [openSection]);

  if (!id) return <div>Invalid media type or ID.</div>;

  if (isLoading) {
    return (
      <main>
        <div className="fixed inset-0 animate-pulse bg-white/5" />
      </main>
    );
  }

  if (isError || !details) {
    return (
      <main className="flex h-[60vh] items-center justify-center">
        <p className="text-lg text-gray-300">Error loading media details.</p>
      </main>
    );
  }

  const title = details.title ?? details.name ?? "Unknown";
  const hasEpisodes = mediaType === "tv" && Boolean(details.seasons?.length);

  // Movies play straight from the hero; TV episodes resolve their stream URL
  // on demand (per-episode availability isn't known until the click).
  const canPlayMovie =
    mediaType === "movie" && Boolean(playback?.available && playback.streamUrl);

  const playMovie = () => {
    if (playback?.streamUrl) setPlayer({ url: playback.streamUrl, label: title });
  };

  const playEpisode = async (season: number, episode: number) => {
    const pb = await getEpisodePlayback(numericId, season, episode);
    if (pb.available && pb.streamUrl) {
      setOpenSection(null);
      setPlayer({ url: pb.streamUrl, label: `${title} — S${season}E${episode}` });
    } else {
      openLibraryDialog();
    }
  };

  return (
    <main>
      <TvDetailHero
        details={details}
        mediaType={mediaType}
        hasEpisodes={hasEpisodes}
        canPlay={canPlayMovie}
        onPlay={playMovie}
        onPlayUnavailable={openLibraryDialog}
        onPlayTrailer={() => setTrailerOpen(true)}
        onOpenSection={openSectionFrom}
      />

      {openSection && (
        <TvSectionOverlay
          // Remount on section swap (library dialog → providers) so the
          // overlay grabs focus for the new content.
          key={openSection}
          label={SECTION_LABELS[openSection]}
          onClose={closeSection}
        >
          {openSection === "episodes" && hasEpisodes && (
            <TvSeasonEpisodes
              seriesId={numericId}
              seasons={details.seasons!}
              playable={Boolean(playback?.available)}
              onPlayEpisode={playEpisode}
              onUnavailable={openLibraryDialog}
            />
          )}
          {openSection === "providers" && (
            <TvWatchProvidersRow
              mediaType={mediaType}
              mediaId={numericId}
              mediaTitle={title}
            />
          )}
          {openSection === "credits" && (
            <TvCreditsTabs
              details={details}
              credits={credits}
              mediaType={mediaType}
            />
          )}
          {openSection === "similar" && (
            <TvFocusRow
              media_type={mediaType}
              items={similarMedia}
              loading={isSimilarLoading}
              title="More like this"
            />
          )}
        </TvSectionOverlay>
      )}

      {player && (
        <TvPlayerOverlay
          streamUrl={player.url}
          title={player.label}
          onClose={() => setPlayer(null)}
        />
      )}

      {trailerOpen && (
        <TvTrailerOverlay
          mediaType={mediaType}
          id={numericId}
          title={title}
          onClose={() => setTrailerOpen(false)}
        />
      )}

      {/* Rendered last: must be the topmost dialog in DOM order so BACK
          closes it without also closing an open section sheet. */}
      {libraryDialogOpen && (
        <TvConfirmDialog
          title="This title isn't available in your library"
          body={`You can check where it's available to stream in the "Where to Watch" section.`}
          confirmLabel="Go to Where to Watch"
          onConfirm={goToWhereToWatch}
          onCancel={cancelLibraryDialog}
        />
      )}
    </main>
  );
}
