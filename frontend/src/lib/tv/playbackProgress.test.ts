import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPlaybackProgress,
  getResumePosition,
  savePlaybackProgress,
} from "./playbackProgress";

describe("playbackProgress", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps a useful resume position", () => {
    savePlaybackProgress("movie-1", 120, 3600);

    expect(getResumePosition("movie-1")).toBe(120);
  });

  it("drops positions near the start or end", () => {
    savePlaybackProgress("movie-start", 15, 3600);
    savePlaybackProgress("movie-end", 3550, 3600);

    expect(getResumePosition("movie-start")).toBeNull();
    expect(getResumePosition("movie-end")).toBeNull();
  });

  it("clears a saved position", () => {
    savePlaybackProgress("episode-1", 300, 1800);
    clearPlaybackProgress("episode-1");

    expect(getResumePosition("episode-1")).toBeNull();
  });

  it("ignores invalid media timing", () => {
    savePlaybackProgress("invalid", Number.NaN, 1800);
    savePlaybackProgress("invalid", 120, Number.POSITIVE_INFINITY);

    expect(getResumePosition("invalid")).toBeNull();
  });
});
