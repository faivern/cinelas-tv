import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initSpatialNavigation } from "./spatialNavigation";

// jsdom has no layout engine (getBoundingClientRect returns zeroes), so these
// tests cover the layout-independent contract: init wiring, the "wake on first
// D-pad press" behaviour, and leaving text entry alone. Geometry-based nearest
// selection is exercised on-device.

function pressArrow(key: string, target: EventTarget = document) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

// jsdom reports zero layout for every element; make elements "visible" so the
// engine's visibility filter accepts them.
function stubLayout() {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return 100;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return 30;
    },
  });
}

describe("spatialNavigation", () => {
  beforeEach(() => {
    stubLayout();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("initialises once and is idempotent", () => {
    expect(() => {
      initSpatialNavigation();
      initSpatialNavigation();
    }).not.toThrow();
  });

  it("wakes navigation by focusing the first focusable when nothing is focused", () => {
    document.body.innerHTML = `
      <main>
        <button id="a">A</button>
        <button id="b">B</button>
      </main>`;
    initSpatialNavigation();

    expect(document.activeElement).toBe(document.body);
    pressArrow("ArrowDown");
    expect(document.activeElement).toBe(document.getElementById("a"));
  });

  it("leaves left/right to the component inside a [data-tv-slider]", () => {
    document.body.innerHTML = `
      <main>
        <a id="other" href="/other">Other</a>
        <div data-tv-slider="true">
          <a id="slide" href="/slide">Slide</a>
        </div>
      </main>`;
    const slide = document.getElementById("slide")!;
    const other = document.getElementById("other")!;
    const rect = (left: number) =>
      ({ left, right: left + 100, top: 100, bottom: 130, width: 100, height: 30 }) as DOMRect;
    slide.getBoundingClientRect = () => rect(500);
    other.getBoundingClientRect = () => rect(100); // valid "left" candidate
    initSpatialNavigation();

    slide.focus();
    pressArrow("ArrowLeft", slide);
    expect(document.activeElement).toBe(slide);
  });

  it("prefers a row-aligned neighbor over a closer but misaligned one", () => {
    // Detail-hero regression: a wide "Play trailer" button on the row above,
    // whose center is barely to the right, used to out-score the true row
    // neighbor ("Watching") when pressing right from "Watch Later".
    document.body.innerHTML = `
      <main>
        <button id="trailer">Play trailer</button>
        <button id="want">Watch Later</button>
        <button id="watching">Watching</button>
      </main>`;
    const rect = (left: number, right: number, top: number, bottom: number) =>
      ({ left, right, top, bottom, width: right - left, height: bottom - top }) as DOMRect;
    document.getElementById("trailer")!.getBoundingClientRect = () => rect(112, 496, 328, 432);
    document.getElementById("want")!.getBoundingClientRect = () => rect(96, 368, 460, 640);
    document.getElementById("watching")!.getBoundingClientRect = () => rect(400, 664, 472, 620);
    initSpatialNavigation();

    const want = document.getElementById("want")!;
    want.focus();
    pressArrow("ArrowRight", want);
    expect(document.activeElement).toBe(document.getElementById("watching"));
  });

  it("does not hijack arrow keys inside a text field", () => {
    document.body.innerHTML = `
      <main>
        <input id="q" type="text" />
        <button id="a">A</button>
      </main>`;
    initSpatialNavigation();

    const input = document.getElementById("q") as HTMLInputElement;
    input.focus();
    pressArrow("ArrowDown", input);
    expect(document.activeElement).toBe(input);
  });
});
