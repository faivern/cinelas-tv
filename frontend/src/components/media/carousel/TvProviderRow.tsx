/**
 * TV focus row for streaming providers, following the TvFocusRow design:
 * fixed-height strip, focused card pinned at the left edge, window shifts
 * with D-pad focus, half-width blurred peek/upcoming edge cards. Cards are
 * uniform square logos with the provider name below (full cards only).
 */
import { useMemo, useState } from "react";
import { useRowFocusMemory } from "../../../lib/tv/useRowFocusMemory";
import { Link } from "react-router-dom";
import TitleMid from "../title/TitleMid";
import AllProvidersModal from "../AllProvidersModal";
import { providerUrl } from "../../../utils/urlBuilder";
import type { WatchProviderListItem } from "../../../types/tmdb";
import { LayoutGrid } from "lucide-react";

const MAX_PROVIDERS = 24;
const FULL_CARDS = 7;
const TMDB_IMG = "https://image.tmdb.org/t/p/w154";

// Surface the globally well-known services first; the rest of the region
// list backfills after them so the row always has enough cards to span the
// full strip width. Keyed by TMDB provider_id (stable across regions and
// name changes).
const WELL_KNOWN_PROVIDER_IDS = new Set<number>([
  8,    // Netflix
  337,  // Disney Plus
  384,  // HBO Max
  1899, // Max
  9,    // Amazon Prime Video
  119,  // Amazon Prime Video (alt id)
  15,   // Hulu
  350,  // Apple TV+
  531,  // Paramount Plus
  1770, // Paramount+ (alt id)
  386,  // Peacock
  387,  // Peacock Premium
  283,  // Crunchyroll
]);

// Uniform logo squares; the focused card grows slightly since there is
// no portrait/landscape swap like the media rows. Sized so the full row
// (peek + focused + 6 cards + upcoming + gaps) spans the same width as the
// 32vh TvFocusRow strip (~142vh), keeping every home row flush on the right
// and vertical D-pad moves column-aligned.
const H = "h-[17vh]";
const W_CARD = "w-[17vh]";
const H_FOCUS = "h-[19vh]";
const W_FOCUS = "w-[19vh]";
const W_HALF = "w-[8.5vh]";

type Props = {
  providers: WatchProviderListItem[];
  loading?: boolean;
  region: string;
};

export default function TvProviderRow({
  providers,
  loading = false,
  region,
}: Props) {
  // Focused index survives unmount/remount so back-navigation restores the
  // row to the card the user left from.
  const { focusedIndex, setFocusedIndex, hasLooped, setHasLooped } =
    useRowFocusMemory("providers");
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
    const wellKnown = providers.filter((p) =>
      WELL_KNOWN_PROVIDER_IDS.has(p.provider_id)
    );
    const rest = providers.filter(
      (p) => !WELL_KNOWN_PROVIDER_IDS.has(p.provider_id)
    );
    return [...wellKnown, ...rest].slice(0, MAX_PROVIDERS);
  }, [providers]);

  if (loading) {
    return (
      <div data-tv-row className="px-page mt-8">
        <TitleMid>Streaming Services</TitleMid>
        <div className="flex gap-4 overflow-hidden items-center">
          {Array.from({ length: FULL_CARDS }).map((_, i) => (
            <div key={i} className={`${i === 0 ? W_FOCUS : W_CARD} shrink-0`}>
              <div className={`${i === 0 ? H_FOCUS : H} w-full rounded-2xl bg-white/5 animate-pulse`} />
              <div className="h-4 w-3/4 mt-2 mx-auto rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  // One virtual entry past the providers: the "View all" card.
  const total = items.length + 1;
  const focus = Math.min(focusedIndex, total - 1);
  // The row loops forward: past the "View all" card it continues with the
  // first provider instead of ending. The very start renders clean — no
  // wrapped peek card left of the first item — but once the row has looped
  // once, the left edge wraps as well, so Left on the first card jumps to
  // "View all". Loops only when the list fills the whole window (peek +
  // focused + full cards + upcoming) — fewer items than slots would render
  // the same card twice.
  const loop = total >= FULL_CARDS + 2;
  const start =
    loop && focus === 0 && hasLooped ? total - 1 : Math.max(focus - 1, 0);
  const size = loop
    ? FULL_CARDS + 2 - (focus === start ? 1 : 0)
    : Math.min(focus + FULL_CARDS, total - 1) - start + 1;
  const focusSlot = focus === start ? 0 : 1;
  const indices = Array.from({ length: size }, (_, j) => (start + j) % total);

  return (
    <div data-tv-row className="px-page mt-8">
      <TitleMid>Streaming Services</TitleMid>
      <div className="flex gap-4 overflow-hidden items-center px-3 py-3 -mx-3">
        {indices.map((index, j) => {
          const role =
            j < focusSlot
              ? "peek"
              : j === focusSlot
                ? "focused"
                : j > focusSlot + FULL_CARDS - 1
                  ? "upcoming"
                  : "full";
          const isEdge = role === "peek" || role === "upcoming";
          const width =
            role === "focused" ? W_FOCUS : isEdge ? W_HALF : W_CARD;
          const height = role === "focused" ? H_FOCUS : H;
          const edgeMask =
            role === "peek"
              ? "[mask-image:linear-gradient(to_left,black_20%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_left,black_20%,transparent_95%)]"
              : role === "upcoming"
                ? "[mask-image:linear-gradient(to_right,black_20%,transparent_95%)] [-webkit-mask-image:linear-gradient(to_right,black_20%,transparent_95%)]"
                : "";

          if (index === items.length) {
            return (
              <button
                key="view-all"
                type="button"
                onClick={() => setShowAll(true)}
                onFocus={() => {
                  // A last → first transition means the row just looped; from
                  // then on the left edge wraps as well.
                  if (focus === total - 1 && index === 0) {
                    setHasLooped(true);
                  }
                  setFocusedIndex(index);
                }}
                aria-label="View all providers"
                className={`group flex flex-col shrink-0 ${width} cursor-pointer`}
              >
                <div
                  className={`focus-ring-target relative w-full ${height} rounded-2xl overflow-hidden
                    border border-[var(--border)] bg-[var(--component-primary)] shadow-lg
                    flex items-center justify-center ${edgeMask}`}
                >
                  <LayoutGrid className={`size-[30px] text-gray-300 ${isEdge ? "opacity-60" : ""}`} />
                </div>
                {!isEdge && (
                  <p className="mt-2 text-sm text-gray-300 font-medium text-center truncate w-full">
                    View all
                  </p>
                )}
              </button>
            );
          }

          const provider = items[index];
          return (
            <Link
              key={provider.provider_id}
              to={`${providerUrl(provider.provider_id, provider.provider_name)}?region=${region}`}
              onFocus={() => {
                // A last → first transition means the row just looped; from
                // then on the left edge wraps as well.
                if (focus === total - 1 && index === 0) {
                  setHasLooped(true);
                }
                setFocusedIndex(index);
              }}
              aria-label={provider.provider_name}
              className={`group flex flex-col shrink-0 ${width}`}
            >
              <div
                className={`focus-ring-target relative w-full ${height} rounded-2xl overflow-hidden
                  border border-[var(--border)] bg-[var(--component-primary)] shadow-lg
                  ${edgeMask}`}
              >
                <img
                  src={`${TMDB_IMG}${provider.logo_path}`}
                  alt={provider.provider_name}
                  className={`w-full h-full object-cover ${
                    isEdge
                      ? `blur-sm opacity-60 scale-110 ${
                          role === "peek" ? "object-right" : "object-left"
                        }`
                      : ""
                  }`}
                  loading="eager"
                  decoding="async"
                />
              </div>
              {!isEdge && (
                <p className="mt-2 text-sm text-gray-300 font-medium text-center truncate w-full">
                  {provider.provider_name}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <AllProvidersModal
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        providers={providers}
        region={region}
      />
    </div>
  );
}
