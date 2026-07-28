import { describe, it, expect, beforeEach } from "vitest";
import { initFocusMemory, recallFocus } from "./focusMemory";

// jsdom reports zero layout for every element; make elements "visible" so the
// visibility filter accepts them.
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

describe("focusMemory", () => {
  beforeEach(() => {
    stubLayout();
    document.body.innerHTML = "";
    initFocusMemory();
    window.history.replaceState(null, "", "/");
  });

  it("restores focus to the same link after a remount", () => {
    document.body.innerHTML = `
      <main>
        <div data-tv-row><a id="a" href="/movie/1">A</a></div>
        <div data-tv-row><a id="b" href="/collections/10">B</a></div>
      </main>`;
    document.getElementById("b")!.focus();

    // Simulate route away and back: old DOM unmounts, new elements render.
    document.body.innerHTML = `
      <main>
        <div data-tv-row><a href="/movie/1">A</a></div>
        <div data-tv-row><a id="b2" href="/collections/10">B</a></div>
      </main>`;

    const recalled = recallFocus();
    expect(recalled.status).toBe("found");
    if (recalled.status === "found") {
      expect(recalled.el).toBe(document.getElementById("b2"));
    }
  });

  it("prefers the remembered row when the same href appears twice", () => {
    document.body.innerHTML = `
      <main>
        <div data-tv-row><a id="first" href="/movie/1">A</a></div>
        <div data-tv-row><a id="second" href="/movie/1">A again</a></div>
      </main>`;
    document.getElementById("second")!.focus();

    const recalled = recallFocus();
    expect(recalled.status).toBe("found");
    if (recalled.status === "found") {
      expect(recalled.el).toBe(document.getElementById("second"));
    }
  });

  it("reports pending while the remembered element hasn't rendered yet", () => {
    window.history.replaceState(null, "", "/pending-page");
    document.body.innerHTML = `
      <main><div data-tv-row><a id="a" href="/movie/2">A</a></div></main>`;
    document.getElementById("a")!.focus();

    document.body.innerHTML = `<main></main>`;
    expect(recallFocus().status).toBe("pending");
  });

  it("does not remember navbar or text-entry focus", () => {
    window.history.replaceState(null, "", "/chrome-page");
    document.body.innerHTML = `
      <header><a id="nav" href="/search">Search</a></header>
      <main><input id="q" type="text" /></main>`;
    document.getElementById("nav")!.focus();
    document.getElementById("q")!.focus();

    expect(recallFocus().status).toBe("none");
  });
});
