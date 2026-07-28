/**
 * Per-page focus memory for spatial navigation. Remembers the last focused
 * content element for each location so that navigating back (BACK button /
 * history.back) restores focus to the card the user left from, instead of
 * falling back to the page's default autofocus target (typically the hero) —
 * which put the focus ring at the top of the page while the WebView restored
 * the scroll position further down.
 *
 * Elements are remembered by a stable key that survives the React remount:
 * `data-tv-focus-key` if present, else the anchor `href`, else the `id`.
 * The same media item can appear in several rows (e.g. Trending and Upcoming),
 * so the index of the containing `[data-tv-row]` disambiguates.
 */

interface Entry {
  key: string;
  row: number;
}

export type Recall =
  | { status: 'found'; el: HTMLElement }
  /** A memory exists but its element isn't rendered yet (row still loading). */
  | { status: 'pending' }
  | { status: 'none' };

const memory = new Map<string, Entry>();

// How long after arriving on a page we keep waiting for the remembered
// element to render before giving up and letting default autofocus run.
const PENDING_MS = 3000;

let seenLocation = '';
let seenAt = 0;

function locationKey(): string {
  return window.location.pathname + window.location.search;
}

function elementKey(el: HTMLElement): string | null {
  const explicit = el.getAttribute('data-tv-focus-key');
  if (explicit) return `key:${explicit}`;
  const href = el.getAttribute('href');
  if (href) return `href:${href}`;
  if (el.id) return `id:${el.id}`;
  return null;
}

function rowIndexOf(el: HTMLElement): number {
  const row = el.closest('[data-tv-row]');
  if (!row) return -1;
  return Array.from(document.querySelectorAll('[data-tv-row]')).indexOf(row);
}

function matches(key: string): HTMLElement[] {
  if (key.startsWith('key:')) {
    const value = key.slice(4);
    return Array.from(
      document.querySelectorAll<HTMLElement>('[data-tv-focus-key]'),
    ).filter((el) => el.getAttribute('data-tv-focus-key') === value);
  }
  if (key.startsWith('href:')) {
    const value = key.slice(5);
    return Array.from(document.querySelectorAll<HTMLElement>('a[href]')).filter(
      (el) => el.getAttribute('href') === value,
    );
  }
  const el = document.getElementById(key.slice(3));
  return el ? [el] : [];
}

// Duplicated from spatialNavigation to avoid a circular import.
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

function isTextEntry(el: HTMLElement): boolean {
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable === true;
}

export function recallFocus(): Recall {
  const loc = locationKey();
  if (loc !== seenLocation) {
    seenLocation = loc;
    seenAt = Date.now();
  }
  const entry = memory.get(loc);
  if (!entry) return { status: 'none' };
  const candidates = matches(entry.key).filter(isVisible);
  if (candidates.length === 0) {
    return Date.now() - seenAt < PENDING_MS ? { status: 'pending' } : { status: 'none' };
  }
  const el = candidates.find((c) => rowIndexOf(c) === entry.row) ?? candidates[0];
  return { status: 'found', el };
}

/**
 * True when a focus memory exists for the current location — i.e. a restore
 * is about to happen. Pages with their own scroll-to-top-on-mount effects
 * must skip them in that case, or they'd override the restored position.
 */
export function hasRememberedFocus(): boolean {
  return memory.has(locationKey());
}

export function initFocusMemory(): void {
  window.addEventListener('focusin', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    // Only remember page content: navbar/footer hops and modal-internal focus
    // shouldn't overwrite where the user was on the page, and restoring a text
    // field would pop the on-screen keyboard uninvited.
    if (el.closest('header, footer, [role="dialog"], [aria-modal="true"]')) return;
    if (isTextEntry(el)) return;
    const key = elementKey(el);
    if (!key) return;
    memory.set(locationKey(), { key, row: rowIndexOf(el) });
  });
}
