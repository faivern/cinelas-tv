import { describe, expect, it } from "vitest";
import {
  clampSeekTarget,
  getBackAction,
  getSeekStep,
  movePlayerFocus,
  shouldAutoHideControls,
} from "./playerControls";

describe("movePlayerFocus", () => {
  it("moves horizontally through the transport controls without wrapping", () => {
    expect(movePlayerFocus("rewind", "right", "playPause")).toBe("playPause");
    expect(movePlayerFocus("playPause", "right", "playPause")).toBe("forward");
    expect(movePlayerFocus("forward", "right", "playPause")).toBe("forward");
    expect(movePlayerFocus("forward", "left", "playPause")).toBe("playPause");
    expect(movePlayerFocus("playPause", "left", "playPause")).toBe("rewind");
    expect(movePlayerFocus("rewind", "left", "playPause")).toBe("rewind");
  });

  it("moves down to the timeline from every transport control", () => {
    expect(movePlayerFocus("rewind", "down", "playPause")).toBe("timeline");
    expect(movePlayerFocus("playPause", "down", "playPause")).toBe("timeline");
    expect(movePlayerFocus("forward", "down", "playPause")).toBe("timeline");
  });

  it("returns from the timeline to the last transport control", () => {
    expect(movePlayerFocus("timeline", "up", "rewind")).toBe("rewind");
    expect(movePlayerFocus("timeline", "up", "forward")).toBe("forward");
  });

  it("keeps left and right on the timeline for seeking", () => {
    expect(movePlayerFocus("timeline", "left", "playPause")).toBe("timeline");
    expect(movePlayerFocus("timeline", "right", "playPause")).toBe("timeline");
  });
});

describe("player control policies", () => {
  it("accelerates seeking after sustained holds", () => {
    expect(getSeekStep(0)).toBe(10);
    expect(getSeekStep(999)).toBe(10);
    expect(getSeekStep(1000)).toBe(30);
    expect(getSeekStep(2499)).toBe(30);
    expect(getSeekStep(2500)).toBe(60);
  });

  it("takes coarser steps on the timeline than on the skip buttons", () => {
    expect(getSeekStep(0, "timeline")).toBe(60);
    expect(getSeekStep(1000, "timeline")).toBe(300);
    expect(getSeekStep(2500, "timeline")).toBe(600);
  });

  it("keeps seeks inside the media", () => {
    expect(clampSeekTarget(50, 120)).toBe(50);
    expect(clampSeekTarget(-30, 120)).toBe(0);
    expect(clampSeekTarget(500, 120)).toBe(119);
    expect(clampSeekTarget(10, 0)).toBe(0);
  });

  it("uses Back to hide controls before exiting", () => {
    expect(getBackAction(true)).toBe("hideControls");
    expect(getBackAction(false)).toBe("exitPlayer");
  });

  it("keeps controls visible while paused", () => {
    expect(shouldAutoHideControls(true)).toBe(false);
    expect(shouldAutoHideControls(false)).toBe(true);
  });
});
