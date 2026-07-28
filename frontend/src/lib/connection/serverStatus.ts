/**
 * Global "backend reachable?" store. The axios interceptor reports outcomes;
 * a single network-level failure triggers a confirmation probe (so one flaky
 * request can't flash the overlay), and only a failed probe flips to down.
 * While down, a 5s interval keeps probing until the server answers again.
 *
 * Probe target is `${API_URL}/api/`: if nginx is down the fetch rejects, and
 * if only the backend is down nginx's /api/ proxy returns 502 — any other
 * response (even 404/401 from .NET) proves the stack is alive. A bare SPA
 * path would be wrong here: the index.html fallback answers 200 with nginx
 * alone, faking a recovery.
 */
import { useSyncExternalStore } from "react";
import { isAxiosError } from "axios";
import { API_URL } from "../config";

const PROBE_INTERVAL_MS = 5000;
const PROBE_TIMEOUT_MS = 4000;
const GATEWAY_STATUSES = [502, 503, 504];

let down = false;
let probing = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function setDown(value: boolean) {
  if (down === value) return;
  down = value;
  listeners.forEach((l) => l());
}

export function subscribeServerStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isServerDown(): boolean {
  return down;
}

export function useServerDown(): boolean {
  return useSyncExternalStore(subscribeServerStatus, () => down);
}

export function isNetworkError(err: unknown): boolean {
  if (!isAxiosError(err)) return false;
  if (!err.response) return err.code !== "ERR_CANCELED";
  return GATEWAY_STATUSES.includes(err.response.status);
}

async function probe(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/`, {
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return !GATEWAY_STATUSES.includes(res.status);
  } catch {
    return false;
  }
}

function startPolling() {
  if (intervalId !== null) return;
  intervalId = setInterval(() => void probeNow(), PROBE_INTERVAL_MS);
}

function stopPolling() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

/** Probe once and update state; used by polling and the overlay's retry button. */
export async function probeNow(): Promise<void> {
  if (probing) return;
  probing = true;
  const ok = await probe();
  probing = false;
  if (ok) {
    stopPolling();
    setDown(false);
  } else {
    startPolling();
    setDown(true);
  }
}

/** Called by the axios interceptor on a network-level failure. */
export function reportNetworkFailure(): void {
  if (down || probing) return;
  void probeNow();
}

/** Called by the axios interceptor on any successful response. */
export function reportSuccess(): void {
  if (!down) return;
  stopPolling();
  setDown(false);
}
