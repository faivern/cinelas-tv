import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import useMediaRuntime from "./useMediaRuntime";

describe("useMediaRuntime", () => {
  it("formats movie runtime with hours and minutes", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "movie", runtimeMin: 150 })
    );
    expect(result.current).toBe("2h 30min");
  });

  it("formats movie runtime with hours only", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "movie", runtimeMin: 120 })
    );
    expect(result.current).toBe("2h");
  });

  it("formats movie runtime with minutes only", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "movie", runtimeMin: 45 })
    );
    expect(result.current).toBe("45min");
  });

  it("returns null for movie with null runtime", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "movie", runtimeMin: null })
    );
    expect(result.current).toBeNull();
  });

  it("returns null for movie with zero runtime", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "movie", runtimeMin: 0 })
    );
    expect(result.current).toBeNull();
  });

  it("formats TV show with seasons only", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "tv", seasons: 3 })
    );
    expect(result.current).toBe("3 Seasons");
  });

  it("uses singular for 1 season", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "tv", seasons: 1 })
    );
    expect(result.current).toBe("1 Season");
  });

  it("returns null for TV show without seasons", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "tv" })
    );
    expect(result.current).toBeNull();
  });

  it("returns null for unknown mediaType", () => {
    const { result } = renderHook(() =>
      useMediaRuntime({ mediaType: "podcast", runtimeMin: 60 })
    );
    expect(result.current).toBeNull();
  });
});
