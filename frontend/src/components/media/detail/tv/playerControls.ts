export type PlayerControl = "rewind" | "playPause" | "forward" | "timeline";
export type TransportControl = Exclude<PlayerControl, "timeline">;

/** The timeline is the coarse scrubber; the buttons are the fine one. */
export type SeekMode = "transport" | "timeline";

const SEEK_STEPS: Record<SeekMode, [number, number, number]> = {
  transport: [10, 30, 60],
  timeline: [60, 300, 600],
};

export function getSeekStep(
  heldForMs: number,
  mode: SeekMode = "transport",
): number {
  const [base, medium, fast] = SEEK_STEPS[mode];
  if (heldForMs < 1000) return base;
  if (heldForMs < 2500) return medium;
  return fast;
}

/** Keeps a seek inside the media, one second short of the end. */
export function clampSeekTarget(target: number, duration: number): number {
  return Math.min(Math.max(target, 0), Math.max(duration - 1, 0));
}

export function getBackAction(
  controlsVisible: boolean,
): "hideControls" | "exitPlayer" {
  return controlsVisible ? "hideControls" : "exitPlayer";
}

export function shouldAutoHideControls(paused: boolean): boolean {
  return !paused;
}

export function isTransportControl(
  control: PlayerControl,
): control is TransportControl {
  return control !== "timeline";
}

export function movePlayerFocus(
  current: PlayerControl,
  direction: "left" | "right" | "up" | "down",
  lastTransport: TransportControl,
): PlayerControl {
  if (current === "timeline") {
    return direction === "up" ? lastTransport : current;
  }

  if (direction === "down") return "timeline";
  if (direction === "up") return current;

  if (direction === "left") {
    if (current === "forward") return "playPause";
    if (current === "playPause") return "rewind";
    return current;
  }

  if (current === "rewind") return "playPause";
  if (current === "playPause") return "forward";
  return current;
}
