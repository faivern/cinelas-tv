/** Signed seconds as they accumulate under a held skip button, e.g. "+140s". */
export function formatSeekDelta(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${rounded < 0 ? "−" : "+"}${Math.abs(rounded)}s`;
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
