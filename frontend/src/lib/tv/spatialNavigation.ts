/**
 * Global D-pad / spatial navigation for the Android TV (Capacitor WebView) build.
 *
 * Android TV WebView is Chromium, but Chromium ships *no* spatial navigation to
 * the web layer — arrow keys from the remote arrive as `keydown` events and move
 * nothing on their own. This module translates ArrowUp/Down/Left/Right into DOM
 * focus moves, picking the nearest focusable element in the pressed direction by
 * geometry. Enter/OK activation and text-entry cursor movement are left to the
 * browser. It works app-wide against the existing real <button>/<a> elements and
 * the global :focus-visible ring, so individual components need no wiring.
 */

import { isTvMode } from './tvMode';
import { initFocusMemory, recallFocus } from './focusMemory';
import { playNavSound } from './navSounds';

type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]:not([aria-disabled="true"])',
].join(',');

// Weight applied to cross-axis misalignment when scoring candidates. High so
// that an element on the same row/column is strongly preferred over a closer
// but badly-aligned one — this is what makes TV navigation feel predictable.
const CROSS_AXIS_WEIGHT = 8;

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

function rectOf(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetWidth <= 0 && el.offsetHeight <= 0 && el.getClientRects().length === 0) {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') {
    return false;
  }
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return true;
}

function isTextEntry(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    // Types where arrow keys should move the caret / adjust the value natively.
    return ['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(type);
  }
  return (el as HTMLElement).isContentEditable === true;
}

/**
 * Root to search within. When a modal/dialog is open, focus stays trapped inside
 * it; otherwise the whole document is fair game.
 */
function activeScope(): ParentNode {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]'),
  ).filter(isVisible);
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : document;
}

function focusableWithin(scope: ParentNode): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isVisible);
}

/** Gap between two 1-D ranges; 0 when they overlap. */
function rangeGap(aMin: number, aMax: number, bMin: number, bMax: number): number {
  if (aMax < bMin) return bMin - aMax;
  if (bMax < aMin) return aMin - bMax;
  return 0;
}

function inDirection(from: Rect, to: Rect, dir: Direction): boolean {
  // Require meaningful movement along the primary axis so overlapping siblings
  // don't count as being "in the direction".
  switch (dir) {
    case 'up':
      return to.cy < from.cy - 1;
    case 'down':
      return to.cy > from.cy + 1;
    case 'left':
      return to.cx < from.cx - 1;
    case 'right':
      return to.cx > from.cx + 1;
  }
}

function score(from: Rect, to: Rect, dir: Direction): number {
  let primary: number;
  let cross: number;
  switch (dir) {
    case 'up':
      primary = from.cy - to.cy;
      cross = rangeGap(from.left, from.right, to.left, to.right);
      break;
    case 'down':
      primary = to.cy - from.cy;
      cross = rangeGap(from.left, from.right, to.left, to.right);
      break;
    case 'left':
      primary = from.cx - to.cx;
      cross = rangeGap(from.top, from.bottom, to.top, to.bottom);
      break;
    case 'right':
      primary = to.cx - from.cx;
      cross = rangeGap(from.top, from.bottom, to.top, to.bottom);
      break;
  }
  return primary + cross * CROSS_AXIS_WEIGHT;
}

function crossGap(from: Rect, to: Rect, dir: Direction): number {
  return dir === 'up' || dir === 'down'
    ? rangeGap(from.left, from.right, to.left, to.right)
    : rangeGap(from.top, from.bottom, to.top, to.bottom);
}

function findBestCandidate(current: HTMLElement, dir: Direction): HTMLElement | null {
  const scope = activeScope();
  const candidates = focusableWithin(scope);
  const from = rectOf(current);

  // Two passes: a candidate aligned with the current element on the cross axis
  // (same row for left/right, same column for up/down) always beats a
  // misaligned one, no matter how close the latter is. Weighted scoring alone
  // can't guarantee this — e.g. a wide button on the row above, whose center
  // is barely in the pressed direction, can out-score the true row neighbor
  // (hero "Play trailer" vs. the status buttons under it).
  let bestAligned: HTMLElement | null = null;
  let bestAlignedScore = Infinity;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (candidate === current) continue;
    const to = rectOf(candidate);
    if (!inDirection(from, to, dir)) continue;
    const s = score(from, to, dir);
    if (crossGap(from, to, dir) === 0 && s < bestAlignedScore) {
      bestAlignedScore = s;
      bestAligned = candidate;
    }
    if (s < bestScore) {
      bestScore = s;
      best = candidate;
    }
  }
  return bestAligned ?? best;
}

// Prefer non-text-entry targets: auto-focusing an input pops the on-screen
// keyboard uninvited (e.g. returning to the search page from a result).
function pick(candidates: HTMLElement[]): HTMLElement | null {
  return candidates.find((el) => !isTextEntry(el)) ?? candidates[0] ?? null;
}

/**
 * Strict initial-focus target: an explicit `[data-tv-autofocus]` element (e.g.
 * the hero carousel's active slide), else the first focusable inside <main>.
 * Returns null when neither exists yet — pages that render <main> late (home
 * page splash) must wait rather than grab header/footer chrome, otherwise
 * focus starts on the navbar or, invisibly, on a footer link.
 */
function contentFocusable(): HTMLElement | null {
  const scope = activeScope();
  if (scope === document) {
    // Returning to a page: the element focused when the user left beats the
    // page's default autofocus target.
    const recalled = recallFocus();
    if (recalled.status === 'found') return recalled.el;
  }
  const preferred = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-tv-autofocus]'),
  ).filter(isVisible);
  if (preferred.length > 0) return preferred[0];
  if (scope !== document) return pick(focusableWithin(scope));
  const main = document.querySelector('main');
  if (!main) return null;
  return pick(focusableWithin(main));
}

/** Wake-up target for a key press when nothing is focused. Falls back to a
 *  document-wide search (minus header/footer chrome) for pages without <main>. */
function firstFocusable(): HTMLElement | null {
  const content = contentFocusable();
  if (content) return content;
  const candidates = focusableWithin(document).filter(
    (el) => !el.closest('header, footer'),
  );
  return pick(candidates);
}

function currentFocus(): HTMLElement | null {
  const el = document.activeElement;
  if (el && el !== document.body && el instanceof HTMLElement) return el;
  return null;
}

function moveFocus(el: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  el.focus({ preventScroll: true });
  // Full-viewport hero (detail page): centring a small button inside it would
  // scroll the artwork half away — any focus inside pins the page to the top
  // so the hero stays fully framed. Inner scrollers (the vertical option
  // menu) still get minimal scrolling; the window scroll is then corrected.
  if (el.closest('[data-tv-hero]')) {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior });
    window.scrollTo({ top: 0, behavior });
    return;
  }
  if (typeof el.scrollIntoView !== 'function') return;
  // TV (10-foot standard, cf. Netflix/Disney+/HBO): the focused row is the
  // center of attention, so scroll it to the vertical middle of the screen.
  // scrollIntoView clamps at the document edges, so the hero stays put at the
  // top and the last row at the bottom. Web keeps minimal "nearest" scrolling;
  // inline stays "nearest" so horizontal row scrollers reveal just enough.
  el.scrollIntoView({
    block: isTvMode() ? 'center' : 'nearest',
    inline: 'nearest',
    behavior,
  });
}

function onKeyDown(event: KeyboardEvent): void {
  // The fullscreen player owns its D-pad as a deterministic virtual-focus
  // surface (transport row + timeline). Its capture listener handles every
  // relevant key; geometric page navigation must never race it.
  if (document.querySelector('[data-tv-player][role="dialog"]')) return;

  // OK/Enter select sound. No preventDefault — the browser still activates
  // the focused button/link natively.
  if (event.key === 'Enter' && !event.repeat && isTvMode()) {
    const active = currentFocus();
    if (active && !isTextEntry(active)) playNavSound('click');
  }

  const dir = DIRECTION_KEYS[event.key];
  if (!dir) return;

  const active = document.activeElement;

  // Let text fields / selects use arrows natively (caret, value stepping).
  // Exception (TV only): up/down in a single-line input has no caret meaning,
  // so treat it as a spatial move — otherwise the D-pad gets stuck in search
  // fields. On web, inputs keep all arrows (e.g. dropdown suggestion lists).
  const singleLineVertical =
    isTvMode() &&
    isTextEntry(active) &&
    active.tagName === 'INPUT' &&
    (active as HTMLInputElement).type !== 'number' && // up/down steps the value
    (dir === 'up' || dir === 'down');
  if (!singleLineVertical && (isTextEntry(active) || (active && active.tagName === 'SELECT')))
    return;

  const current = currentFocus();

  // Nothing focused yet — first D-pad press "wakes up" navigation.
  if (!current) {
    const first = firstFocusable();
    if (first) {
      event.preventDefault();
      moveFocus(first);
      if (isTvMode()) playNavSound(dir);
    }
    return;
  }

  // Inside a horizontal slider (hero carousel) left/right move the slides,
  // not the focus — leave the event for the component's own key handler.
  if ((dir === 'left' || dir === 'right') && current.closest('[data-tv-slider]')) {
    return;
  }

  let next = findBestCandidate(current, dir);
  // Entering a focus row from above/below lands on the row's own focused
  // card (the landscape entry), not whichever card happens to sit under the
  // origin — the geometric pick would shift the row window sideways.
  if (next && (dir === 'up' || dir === 'down')) {
    const row = next.closest('[data-tv-row]');
    if (row && !row.contains(current)) {
      const entry = row.querySelector<HTMLElement>('[data-tv-row-entry]');
      if (entry && isVisible(entry)) next = entry;
    }
  }
  // Entering the header from below: full-width rows (hero) tie every navbar
  // item on cross-axis alignment, so the geometric pick lands on whichever
  // element is first in the DOM — the profile trigger, which then opens its
  // dropdown on focus. Redirect to the header's designated default target.
  if (next && dir === 'up') {
    const header = next.closest('header');
    if (header && !header.contains(current)) {
      const preferred = header.querySelector<HTMLElement>('[data-tv-header-default]');
      if (preferred && isVisible(preferred)) next = preferred;
    }
  }
  if (next) {
    event.preventDefault();
    moveFocus(next);
    if (isTvMode()) playNavSound(dir);
  }
  // No candidate in that direction: stay put (edge of the screen).
}

/**
 * Keep a focus ring on screen. Whenever focus falls back to <body> — initial
 * load, or the focused element unmounting on a route change — move it to the
 * first focusable in the main content. Because this only fires when nothing is
 * focused, it never steals focus mid-navigation.
 */
function initAutoFocus(): void {
  let timer: number | undefined;
  const maybeFocus = () => {
    if (document.activeElement && document.activeElement !== document.body) return;
    if (activeScope() === document) {
      const recalled = recallFocus();
      // A remembered element that hasn't rendered yet (row still loading):
      // hold off so default autofocus doesn't steal the restore — the next
      // DOM mutation re-triggers this.
      if (recalled.status === 'pending') return;
      if (recalled.status === 'found') {
        // moveFocus, not a bare focus(): the restored card can be anywhere on
        // the page. Instant, not smooth — a back-navigation should land on
        // the remembered spot, not visibly seek down from the top.
        moveFocus(recalled.el, 'instant');
        return;
      }
    }
    // Strict: only real content. If it isn't rendered yet, a later DOM
    // mutation re-triggers this; never fall back to header/footer chrome.
    const first = contentFocusable();
    if (!first) return;
    // TV: with ScrollToTop disabled, focus owns the viewport — jump to the
    // autofocus target (hero → clamps to top). Web keeps preventScroll so
    // ScrollToTop's position stands.
    if (isTvMode()) moveFocus(first, 'instant');
    else first.focus({ preventScroll: true });
  };
  // Restore path skips the debounce: run on every mutation batch so a
  // remembered card is re-focused the moment it renders, before the user
  // sees the page sitting at the top. Cheap — bails as soon as anything
  // holds focus.
  const tryRestore = () => {
    if (document.activeElement && document.activeElement !== document.body) return;
    if (activeScope() !== document) return;
    const recalled = recallFocus();
    if (recalled.status === 'found') moveFocus(recalled.el, 'instant');
  };
  const schedule = () => {
    tryRestore();
    window.clearTimeout(timer);
    timer = window.setTimeout(maybeFocus, 150);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

let started = false;

export function initSpatialNavigation(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  // Capture phase so we act before the WebView's default (page-scrolling) handling.
  window.addEventListener('keydown', onKeyDown, true);
  initFocusMemory();
  initAutoFocus();
  // TV: focus restore drives the scroll on back-navigation; the WebView's
  // async native scroll restoration would fight it (and ScrollToTop).
  if (isTvMode() && 'scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
}
