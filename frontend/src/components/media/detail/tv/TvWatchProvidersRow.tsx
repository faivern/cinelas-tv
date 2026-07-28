import { useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import {
  useWatchProviders,
  useWatchProviderRegions,
} from "../../../../hooks/media/useWatchProviders";
import { setWatchRegion, useWatchRegion } from "../../../../utils/watchRegion";
import { launchProvider } from "../../../../lib/tv/providerApps";
import type { MediaType, WatchProvider } from "../../../../types/tmdb";
import TitleMid from "../../title/TitleMid";
import TvRegionPicker from "../../../layout/TvRegionPicker";
import TvConfirmDialog from "../../../ui/TvConfirmDialog";

type Props = {
  mediaType: MediaType;
  mediaId: number;
  mediaTitle: string;
};

type ProviderTile = WatchProvider & { tags: string[] };

type GroupKey = "flatrate" | "rent" | "buy" | "ads";

const GROUP_LABELS: Array<[GroupKey, string]> = [
  ["flatrate", "Stream"],
  ["rent", "Rent"],
  ["buy", "Buy"],
  ["ads", "Free with Ads"],
];

type GroupSet = {
  link?: string;
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  ads?: WatchProvider[];
};

export default function TvWatchProvidersRow({ mediaType, mediaId, mediaTitle }: Props) {
  const region = useWatchRegion();
  const regionChipRef = useRef<HTMLButtonElement>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<ProviderTile | null>(null);
  const providerTriggerRef = useRef<HTMLElement | null>(null);

  const { data: regionsData } = useWatchProviderRegions();
  const sortedRegions = useMemo(() => {
    const list = regionsData?.results ?? [];
    return [...list].sort((a, b) =>
      a.english_name.localeCompare(b.english_name)
    );
  }, [regionsData]);
  const regionName = useMemo(() => {
    const fromList = sortedRegions.find(
      (r) => r.iso_3166_1 === region
    )?.english_name;
    if (fromList) return fromList;
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(region) ?? region;
    } catch {
      return region;
    }
  }, [sortedRegions, region]);

  const { data, isLoading } = useWatchProviders(mediaType, mediaId);
  const countryProviders = data?.results?.[region] as GroupSet | undefined;

  // One provider can appear under several groups (e.g. rent + buy); show a
  // single tile with combined tags instead of duplicates.
  const tiles = useMemo(() => {
    const byId = new Map<number, ProviderTile>();
    for (const [key, label] of GROUP_LABELS) {
      for (const p of countryProviders?.[key] ?? []) {
        const existing = byId.get(p.provider_id);
        if (existing) existing.tags.push(label);
        else byId.set(p.provider_id, { ...p, tags: [label] });
      }
    }
    return Array.from(byId.values());
  }, [countryProviders]);

  // Never leave Cinelas straight from a tile click — always confirm first.
  const requestProvider = (p: ProviderTile) => {
    providerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPendingProvider(p);
  };

  const cancelProvider = () => {
    setPendingProvider(null);
    providerTriggerRef.current?.focus();
  };

  const confirmProvider = async () => {
    const p = pendingProvider;
    if (!p) return;
    setPendingProvider(null);
    const result = await launchProvider(
      p.provider_id,
      { mediaType, tmdbId: mediaId, title: mediaTitle },
      countryProviders?.link,
    );
    if (result === "failed") {
      toast.error(`Couldn't open ${p.provider_name} — app not installed`);
      providerTriggerRef.current?.focus();
    }
  };

  function pickRegion(code: string) {
    setWatchRegion(code);
    closeRegionPicker();
  }

  function closeRegionPicker() {
    regionChipRef.current?.focus();
    setRegionPickerOpen(false);
  }

  return (
    <section className="px-page mt-8">
      <TitleMid className="flex items-center gap-3">
        Where to Watch
        <button
          ref={regionChipRef}
          type="button"
          onClick={() => setRegionPickerOpen(true)}
          aria-label={`Change region, currently ${regionName}`}
          className="focus-fill flex items-center gap-2 rounded-full border border-outline
            bg-component-primary/80 px-3 py-1 text-sm font-medium text-subtle
            transition-colors hover:bg-white hover:text-neutral-900
            focus-visible:bg-white focus-visible:text-neutral-900"
        >
          <span
            aria-hidden="true"
            className={`fi fi-${region.toLowerCase()} shrink-0 rounded-xs`}
          />
          {regionName}
          <ChevronDown className="size-4 shrink-0 opacity-60" />
        </button>
      </TitleMid>

      {isLoading ? (
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[17vh]">
              <div className="h-[17vh] w-full animate-pulse rounded-2xl bg-white/5" />
              <div className="h-4 w-3/4 mt-2 mx-auto rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      ) : tiles.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto px-3 py-3 -mx-3">
            {tiles.map((p) => (
              <button
                key={p.provider_id}
                type="button"
                onClick={() => requestProvider(p)}
                aria-label={`${p.provider_name} (${p.tags.join(", ")})`}
                className="group flex w-[17vh] shrink-0 flex-col"
              >
                <div
                  className="focus-ring-target relative w-full h-[17vh] rounded-2xl overflow-hidden
                    border border-[var(--border)] bg-[var(--component-primary)] shadow-lg"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w154${p.logo_path}`}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-300 font-medium text-center truncate w-full">
                  {p.provider_name}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">Streaming data provided by JustWatch</p>
        </>
      ) : (
        <p className="text-gray-400">No streaming information available for {regionName}.</p>
      )}

      {pendingProvider && (
        <TvConfirmDialog
          title={`Open ${pendingProvider.provider_name}?`}
          body={`Cinelas will close and launch ${pendingProvider.provider_name}.`}
          confirmLabel="Open"
          onConfirm={() => void confirmProvider()}
          onCancel={cancelProvider}
        />
      )}

      {regionPickerOpen && (
        <TvRegionPicker
          regions={sortedRegions}
          selected={region}
          onSelect={pickRegion}
          onClose={closeRegionPicker}
        />
      )}
    </section>
  );
}
