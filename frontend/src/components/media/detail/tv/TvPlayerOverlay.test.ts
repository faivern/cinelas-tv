import { describe, expect, it } from "vitest";
import { formatPlayerTime, formatSeekDelta } from "./playerTime";

describe("formatPlayerTime", () => {
  it.each([
    [0, "0:00"],
    [65, "1:05"],
    [3599, "59:59"],
    [3661, "1:01:01"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatPlayerTime(seconds)).toBe(expected);
  });

  it("falls back safely for invalid values", () => {
    expect(formatPlayerTime(Number.NaN)).toBe("0:00");
    expect(formatPlayerTime(-1)).toBe("0:00");
  });
});

describe("formatSeekDelta", () => {
  it("signs the accumulated skip", () => {
    expect(formatSeekDelta(10)).toBe("+10s");
    expect(formatSeekDelta(140)).toBe("+140s");
    expect(formatSeekDelta(-30)).toBe("−30s");
  });
});
