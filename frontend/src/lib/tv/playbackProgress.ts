/**
 * Resume positions for owned media, kept in localStorage keyed by a stable
 * media id ("movie-603", "tv-1399-s1e2"). Device-local by design: the backend
 * stores no playback position and the Jellyfin stream URL hides the ItemId,
 * so there is nothing to sync against.
 */

const STORAGE_KEY = "cinelas.playbackProgress.v1";

// Below this, the user barely started — resuming would feel broken.
const MIN_RESUME_SECONDS = 30;
// Within this of the end, treat the title as finished and start over instead.
const END_MARGIN_SECONDS = 60;
const MAX_ENTRIES = 200;

type Entry = {
  position: number;
  duration: number;
  updatedAt: number;
};

type Store = Record<string, Entry>;

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode / quota — resume is a nicety, never block playback for it.
  }
}

function prune(store: Store): Store {
  const keys = Object.keys(store);
  if (keys.length <= MAX_ENTRIES) return store;
  const keep = keys
    .sort((a, b) => store[b].updatedAt - store[a].updatedAt)
    .slice(0, MAX_ENTRIES);
  return Object.fromEntries(keep.map((k) => [k, store[k]]));
}

function isResumable(entry: Entry): boolean {
  return (
    entry.position >= MIN_RESUME_SECONDS &&
    entry.duration > 0 &&
    entry.position < entry.duration - END_MARGIN_SECONDS
  );
}

/** Saved position in seconds, or null when there is nothing worth resuming. */
export function getResumePosition(key: string): number | null {
  const entry = read()[key];
  if (!entry || !isResumable(entry)) return null;
  return entry.position;
}

/**
 * Records where playback is. Positions too close to the start or the end are
 * dropped rather than stored, so a finished title replays from the beginning.
 */
export function savePlaybackProgress(
  key: string,
  position: number,
  duration: number,
): void {
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) {
    return;
  }
  const store = read();
  const entry = { position, duration, updatedAt: Date.now() };
  if (isResumable(entry)) store[key] = entry;
  else delete store[key];
  write(prune(store));
}

export function clearPlaybackProgress(key: string): void {
  const store = read();
  if (!(key in store)) return;
  delete store[key];
  write(store);
}
