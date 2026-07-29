import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  ArrowLeft,
  CircleAlert,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { keepScreenAwake, allowScreenSleep } from "../../../../lib/tv/keepAwake";
import {
  clearPlaybackProgress,
  getResumePosition,
  savePlaybackProgress,
} from "../../../../lib/tv/playbackProgress";
import {
  clampSeekTarget,
  getBackAction,
  getSeekStep,
  isTransportControl,
  movePlayerFocus,
  shouldAutoHideControls,
  type PlayerControl,
  type SeekMode,
  type TransportControl,
} from "./playerControls";
import BrandLogo from "../../../common/BrandLogo";
import { formatPlayerTime, formatSeekDelta } from "./playerTime";

type Props = {
  streamUrl: string;
  title: string;
  /** Stable id for the resume position, e.g. "movie-603" / "tv-1399-s1e2". */
  progressKey: string;
  onClose: () => void;
};

// Repeated D-pad presses build up one seek instead of hammering the HLS
// pipeline with a request per press; this is how long we wait for the next one.
const SEEK_COMMIT_MS = 850;
const OSD_HIDE_MS = 4000;
const PROGRESS_SAVE_MS = 5000;
const RESUME_TOAST_MS = 4000;
const CONTROL_PULSE_MS = 180;

/**
 * Fullscreen HLS player for owned media (Jellyfin via nginx). hls.js is the
 * default for the Capacitor WebView; Safari-style native HLS is the fallback.
 * role="dialog" gets the spatial-nav focus trap and BACK→Escape synthesis
 * from backButton.ts for free (same pattern as TvTrailerOverlay).
 *
 * The controls use virtual focus (semantic buttons with tabIndex=-1) and read
 * the D-pad directly. Native <video controls> is unreachable with a remote,
 * while browser focus would let global spatial navigation consume timeline
 * left/right presses that need to mean "seek".
 */
export default function TvPlayerOverlay({
  streamUrl,
  title,
  progressKey,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [osdVisible, setOsdVisible] = useState(true);
  const [focusedControl, setFocusedControl] =
    useState<PlayerControl>("playPause");
  const [lastTransport, setLastTransport] =
    useState<TransportControl>("playPause");
  const [pulsedControl, setPulsedControl] =
    useState<TransportControl | null>(null);
  const [pendingDelta, setPendingDelta] = useState<number | null>(null);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  // Until the first frame decodes, the WebView paints its own grey placeholder
  // (a giant play button) over the element — keep it hidden behind our own black.
  const [hasFrame, setHasFrame] = useState(false);

  // Accumulated skip while the user is still pressing, committed once the
  // presses stop. Stored as an offset rather than an absolute target so the
  // seek lands exactly this far from wherever playback has reached by then —
  // an absolute target would silently lose the seconds that elapsed meanwhile.
  // Mirrored in a ref so key handling never reads stale state.
  const pendingDeltaRef = useRef<number | null>(null);
  const seekHoldRef = useRef<{
    direction: 1 | -1;
    mode: SeekMode;
    startedAt: number;
  } | null>(null);
  // True once the current seek came from a held key. Releasing a hold commits
  // immediately; separate taps instead fall through to SEEK_COMMIT_MS so they
  // can be stacked into one larger skip.
  const seekHeldDownRef = useRef(false);
  const seekTimerRef = useRef<number | undefined>(undefined);
  const osdTimerRef = useRef<number | undefined>(undefined);
  const pulseTimerRef = useRef<number | undefined>(undefined);
  // Ref, not an effect-local flag: durationchange can fire repeatedly and must
  // never yank the user back to the resume point mid-playback.
  const resumeAppliedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    keepScreenAwake();
    videoRef.current?.focus({ preventScroll: true });
    return () => allowScreenSleep();
  }, []);

  const showOsd = useCallback(() => {
    setOsdVisible(true);
    window.clearTimeout(osdTimerRef.current);
    const video = videoRef.current;
    // While paused the bar stays up — there is nothing to watch behind it.
    if (video && shouldAutoHideControls(video.paused)) {
      osdTimerRef.current = window.setTimeout(
        () => setOsdVisible(false),
        OSD_HIDE_MS,
      );
    }
  }, []);

  const hideOsd = useCallback(() => {
    window.clearTimeout(osdTimerRef.current);
    setOsdVisible(false);
  }, []);

  const pulseControl = useCallback((control: TransportControl) => {
    setPulsedControl(control);
    window.clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = window.setTimeout(
      () => setPulsedControl(null),
      CONTROL_PULSE_MS,
    );
  }, []);

  const commitSeek = useCallback(() => {
    const video = videoRef.current;
    const delta = pendingDeltaRef.current;
    pendingDeltaRef.current = null;
    seekHoldRef.current = null;
    seekHeldDownRef.current = false;
    setPendingDelta(null);
    if (!video || delta === null) return;
    const target = clampSeekTarget(video.currentTime + delta, video.duration);
    video.currentTime = target;
    // hls.js flushes and refetches segments after a seek, so `timeupdate` goes
    // quiet for a moment; without this the scrubber visibly snaps back to the
    // pre-seek position until playback resumes.
    setCurrentTime(target);
  }, []);

  const seekBy = useCallback(
    (direction: 1 | -1, mode: SeekMode = "transport", held = false) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      const now = Date.now();
      const previous = seekHoldRef.current;
      // Only a held key keeps the acceleration clock running; a fresh tap
      // restarts it so repeated taps stay at the predictable base step.
      const hold =
        held &&
        previous &&
        previous.direction === direction &&
        previous.mode === mode
          ? previous
          : { direction, mode, startedAt: now };
      seekHeldDownRef.current = held;
      seekHoldRef.current = hold;
      const heldForMs = now - hold.startedAt;
      const step = getSeekStep(heldForMs, mode) * direction;
      const accumulated = (pendingDeltaRef.current ?? 0) + step;
      const delta =
        clampSeekTarget(video.currentTime + accumulated, video.duration) -
        video.currentTime;
      pendingDeltaRef.current = delta;
      setPendingDelta(delta);
      showOsd();
      window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = window.setTimeout(commitSeek, SEEK_COMMIT_MS);
    },
    [commitSeek, showOsd],
  );

  const focusControl = useCallback((control: PlayerControl) => {
    setFocusedControl(control);
    if (isTransportControl(control)) setLastTransport(control);
  }, []);

  // Dismissing the controls ends that interaction: the next time they come up
  // they start from play/pause rather than wherever focus happened to be left.
  useEffect(() => {
    if (osdVisible) return;
    setFocusedControl("playPause");
    setLastTransport("playPause");
  }, [osdVisible]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => {});
    else video.pause();
    showOsd();
  }, [showOsd]);

  const activateControl = useCallback(
    (control: TransportControl, repeated = false) => {
      // Holding OK on a skip button accelerates; holding it on play/pause must
      // not flap the video between states once per key repeat.
      if (control === "playPause") {
        if (repeated) return;
        pulseControl(control);
        togglePlay();
        return;
      }
      pulseControl(control);
      seekBy(control === "rewind" ? -1 : 1, "transport", repeated);
    },
    [pulseControl, seekBy, togglePlay],
  );

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    savePlaybackProgress(progressKey, video.currentTime, video.duration);
  }, [progressKey]);

  const close = useCallback(() => {
    saveProgress();
    onClose();
  }, [onClose, saveProgress]);

  // Remote/keyboard transport. Capture phase so the WebView never scrolls the
  // page underneath, and every arrow is consumed here rather than by spatial nav.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const handledKeys = new Set([
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Enter",
        " ",
        "MediaPlayPause",
        "MediaPlay",
        "MediaPause",
        "MediaRewind",
        "MediaFastForward",
      ]);
      if (!handledKeys.has(e.key)) return;

      e.preventDefault();
      e.stopPropagation();

      // BACK is deliberately two-stage: dismiss chrome first, exit only from
      // the already-immersive player.
      if (e.key === "Escape") {
        if (getBackAction(osdVisible) === "hideControls") hideOsd();
        else close();
        return;
      }

      // Dedicated media keys retain their standard meaning even when the OSD
      // is hidden. Directional/OK input only wakes the OSD on its first press.
      if (e.key === "MediaPlayPause") {
        togglePlay();
        return;
      }
      if (e.key === "MediaPlay") {
        void videoRef.current?.play().catch(() => {});
        showOsd();
        return;
      }
      if (e.key === "MediaPause") {
        videoRef.current?.pause();
        showOsd();
        return;
      }
      if (e.key === "MediaRewind" || e.key === "MediaFastForward") {
        seekBy(e.key === "MediaRewind" ? -1 : 1, "transport", e.repeat);
        return;
      }

      if (!osdVisible) {
        showOsd();
        return;
      }

      showOsd();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (focusedControl === "timeline") {
          seekBy(e.key === "ArrowLeft" ? -1 : 1, "timeline", e.repeat);
        } else {
          focusControl(
            movePlayerFocus(
              focusedControl,
              e.key === "ArrowLeft" ? "left" : "right",
              lastTransport,
            ),
          );
        }
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        focusControl(
          movePlayerFocus(
            focusedControl,
            e.key === "ArrowUp" ? "up" : "down",
            lastTransport,
          ),
        );
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        if (isTransportControl(focusedControl))
          activateControl(focusedControl, e.repeat);
        else commitSeek();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "Enter" ||
          e.key === " ") &&
        seekHoldRef.current &&
        seekHeldDownRef.current
      ) {
        window.clearTimeout(seekTimerRef.current);
        commitSeek();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, [
    activateControl,
    close,
    commitSeek,
    focusControl,
    focusedControl,
    hideOsd,
    lastTransport,
    osdVisible,
    seekBy,
    showOsd,
    togglePlay,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setFailed(true);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.addEventListener("error", () => setFailed(true));
    } else {
      setFailed(true);
    }

    return () => hls?.destroy();
  }, [streamUrl]);

  // Media element → UI state, plus the one-shot resume seek.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncBuffered = () => {
      for (let i = 0; i < video.buffered.length; i++) {
        if (
          video.buffered.start(i) <= video.currentTime &&
          video.currentTime <= video.buffered.end(i)
        ) {
          setBuffered(video.buffered.end(i));
          return;
        }
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration);
      if (resumeAppliedRef.current) return;
      resumeAppliedRef.current = true;
      const resume = getResumePosition(progressKey);
      if (resume === null || resume >= video.duration) return;
      video.currentTime = resume;
      setCurrentTime(resume);
      setResumedFrom(resume);
      window.setTimeout(() => setResumedFrom(null), RESUME_TOAST_MS);
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      syncBuffered();
    };
    const onPlay = () => {
      setPaused(false);
      showOsd();
    };
    const onPause = () => {
      setPaused(true);
      showOsd();
      saveProgress();
    };
    const onEnded = () => {
      clearPlaybackProgress(progressKey);
      onCloseRef.current();
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onSeeked = () => setCurrentTime(video.currentTime);
    const onLoadedData = () => setHasFrame(true);

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("durationchange", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("progress", syncBuffered);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onLoadedData);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("durationchange", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("progress", syncBuffered);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onLoadedData);
    };
  }, [progressKey, saveProgress, showOsd]);

  // Periodic checkpoint so an app kill or power cut still leaves a resume point.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!videoRef.current?.paused) saveProgress();
    }, PROGRESS_SAVE_MS);
    return () => window.clearInterval(timer);
  }, [saveProgress]);

  useEffect(
    () => () => {
      window.clearTimeout(seekTimerRef.current);
      window.clearTimeout(osdTimerRef.current);
      window.clearTimeout(pulseTimerRef.current);
      saveProgress();
    },
    [saveProgress],
  );

  const previewTime =
    pendingDelta === null
      ? null
      : clampSeekTarget(currentTime + pendingDelta, duration);
  const displayTime = previewTime ?? currentTime;
  const percent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  const previewPercent = Math.min(Math.max(percent, 5), 95);

  const seekBadge = (control: TransportControl) =>
    pendingDelta !== null && focusedControl === control ? (
      <span
        aria-live="polite"
        className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2
          whitespace-nowrap rounded-full border border-cyan-300/40 bg-black/85 px-3.5
          py-1 text-xl font-semibold tabular-nums text-cyan-300 shadow-xl backdrop-blur-md"
      >
        {formatSeekDelta(pendingDelta)}
      </span>
    ) : null;

  const transportClass = (
    control: TransportControl,
    size: "primary" | "secondary",
  ) => {
    const focused = focusedControl === control;
    const pulsed = pulsedControl === control;
    return `pointer-events-auto relative flex items-center justify-center rounded-full border
      outline-none transition-all duration-150 ease-out
      ${size === "primary" ? "h-24 w-24" : "h-20 w-20"}
      ${
        focused
          ? "z-10 scale-110 border-white bg-white text-black shadow-[0_14px_42px_rgba(0,0,0,0.55)]"
          : "scale-100 border-white/20 bg-black/40 text-white/80 shadow-xl backdrop-blur-lg"
      }
      ${pulsed ? "!scale-95 !bg-cyan-100" : ""}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-tv-player
      data-focused-control={focusedControl}
      className="fixed inset-0 z-50 bg-black"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        tabIndex={-1}
        data-tv-autofocus
        className={`h-full w-full outline-none transition-opacity duration-200 ${
          hasFrame ? "opacity-100" : "opacity-0"
        }`}
      />

      {resumedFrom !== null && (
        <div
          aria-live="polite"
          className="absolute left-1/2 top-[calc(var(--tv-safe-y)+5.5rem)] -translate-x-1/2
            rounded-full border border-white/10 bg-black/70 px-5 py-2.5 text-base
            font-medium text-white shadow-2xl backdrop-blur-xl"
        >
          Resuming from {formatPlayerTime(resumedFrom)}
        </div>
      )}

      <div
        aria-hidden={!osdVisible}
        className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b
          from-black/75 via-black/25 to-transparent px-[calc(var(--tv-safe-x)+1.5rem)]
          pb-20 pt-[calc(var(--tv-safe-y)+1.25rem)] transition-all duration-200
          ${osdVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <ArrowLeft className="h-5 w-5 shrink-0 text-white/65" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                Now playing
              </p>
              <h2 className="mt-0.5 truncate text-xl font-medium tracking-tight text-white/90">
                {title}
              </h2>
            </div>
          </div>
          <BrandLogo className="shrink-0 opacity-45" />
        </div>
      </div>

      {buffering && !failed && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-black/35 shadow-2xl backdrop-blur-xl">
              <Loader2 className="h-9 w-9 animate-spin text-accent-primary" />
            </div>
            <span className="text-sm font-medium tracking-wide text-white/65">
              Loading playback
            </span>
          </div>
        </div>
      )}

      {!buffering && !failed && (
        <div
          aria-hidden={!osdVisible}
          className={`pointer-events-none absolute inset-0 flex items-center justify-center pb-8
            transition-all duration-200 ${
              osdVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
        >
          <div className="flex items-center gap-14">
            <button
              id="player-control-rewind"
              data-player-control="rewind"
              type="button"
              tabIndex={-1}
              aria-label="Rewind 10 seconds"
              className={transportClass("rewind", "secondary")}
              onClick={() => {
                focusControl("rewind");
                activateControl("rewind");
              }}
            >
              <RotateCcw className="h-8 w-8" strokeWidth={2} />
              <span className="absolute text-[11px] font-bold">10</span>
              {seekBadge("rewind")}
            </button>

            <button
              id="player-control-playPause"
              data-player-control="playPause"
              type="button"
              tabIndex={-1}
              aria-label={paused ? "Play" : "Pause"}
              aria-pressed={!paused}
              className={transportClass("playPause", "primary")}
              onClick={() => {
                focusControl("playPause");
                activateControl("playPause");
              }}
            >
              <Play
                className={`absolute ml-1 h-10 w-10 transition-all duration-150 ${
                  paused ? "scale-100 opacity-100" : "scale-75 opacity-0"
                }`}
                fill="currentColor"
                strokeWidth={1.75}
              />
              <Pause
                className={`absolute h-10 w-10 transition-all duration-150 ${
                  paused ? "scale-75 opacity-0" : "scale-100 opacity-100"
                }`}
                fill="currentColor"
                strokeWidth={1.75}
              />
            </button>

            <button
              id="player-control-forward"
              data-player-control="forward"
              type="button"
              tabIndex={-1}
              aria-label="Forward 10 seconds"
              className={transportClass("forward", "secondary")}
              onClick={() => {
                focusControl("forward");
                activateControl("forward");
              }}
            >
              <RotateCw className="h-8 w-8" strokeWidth={2} />
              <span className="absolute text-[11px] font-bold">10</span>
              {seekBadge("forward")}
            </button>
          </div>
        </div>
      )}

      <div
        aria-hidden={!osdVisible}
        className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t
          from-black via-black/75 to-transparent px-[calc(var(--tv-safe-x)+1.5rem)]
          pb-[calc(var(--tv-safe-y)+1rem)] pt-36 transition-all duration-200
          ${
            osdVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-3 opacity-0"
          }`}
      >
        <div
          id="player-control-timeline"
          data-player-control="timeline"
          data-preview-time={previewTime ?? undefined}
          role="slider"
          tabIndex={-1}
          aria-label="Playback timeline"
          aria-valuemin={0}
          aria-valuemax={Math.max(Math.floor(duration), 0)}
          aria-valuenow={Math.max(Math.floor(displayTime), 0)}
          aria-valuetext={`${formatPlayerTime(displayTime)} of ${formatPlayerTime(duration)}`}
          className={`relative rounded-xl transition-all duration-150 ${
            focusedControl === "timeline" ? "py-4" : "py-2"
          }`}
        >
          {previewTime !== null && focusedControl === "timeline" && (
            <div
              aria-live="polite"
              className="absolute bottom-full mb-3 -translate-x-1/2 rounded-xl border
                border-white/15 bg-black/85 px-4 py-2.5 text-center shadow-2xl backdrop-blur-xl"
              style={{ left: `${previewPercent}%` }}
            >
              <p className="text-xl font-semibold tabular-nums text-white">
                {formatPlayerTime(previewTime)}
              </p>
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-cyan-300">
                {(pendingDelta ?? 0) > 0 ? "+" : "−"}
                {formatPlayerTime(Math.abs(pendingDelta ?? 0))}
              </p>
            </div>
          )}

          <div
            className={`relative w-full rounded-full bg-white/20 shadow-inner
              transition-all duration-150 ${
                focusedControl === "timeline" ? "h-5" : "h-2"
              }`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/15"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.45)]"
              style={{ width: `${percent}%` }}
            />
            <div
              className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full
                border-[3px] border-white bg-cyan-400 shadow-lg transition-all duration-150 ${
                  focusedControl === "timeline" ? "h-10 w-10" : "h-4 w-4"
                }`}
              style={{ left: `${percent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-lg font-medium tabular-nums text-white">
              {formatPlayerTime(displayTime)}
            </span>
            <span className="text-lg font-medium tabular-nums text-white/60">
              −{formatPlayerTime(Math.max(duration - displayTime, 0))}
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-5 text-[13px] font-medium text-white/40">
          <span className="flex items-center gap-2">
            <span className="flex h-6 min-w-7 items-center justify-center rounded border border-white/15 bg-white/5 px-1.5 text-[10px] font-semibold text-white/55">
              OK
            </span>
            {focusedControl === "timeline"
              ? "Jump to point"
              : focusedControl === "playPause"
                ? "Play / pause"
                : "Skip — hold to speed up"}
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-6 items-center justify-center rounded border border-white/15 bg-white/5 px-2 text-xs text-white/55">
              ← →
            </span>
            {focusedControl === "timeline" ? "Scrub" : "Move"}
          </span>
          <span className="flex items-center gap-2">
            <span className="flex h-6 items-center justify-center rounded border border-white/15 bg-white/5 px-2 text-[10px] font-semibold text-white/55">
              BACK
            </span>
            Back
          </span>
        </div>
      </div>

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[34rem] rounded-3xl border border-white/10 bg-[#141414]/95 p-10 text-center shadow-2xl">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <CircleAlert className="h-8 w-8" />
            </span>
            <p className="mt-6 text-2xl font-semibold tracking-tight text-white">
              We couldn't play this title
            </p>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-white/55">
              The stream stopped responding. Return to the title and try again in a
              moment.
            </p>
            <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/80">
              <ArrowLeft className="h-4 w-4" />
              Press BACK to return
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
