import { useEffect, useState } from "react";
import WatchProviderCard from "../cards/WatchProviderCard";
import AllProvidersModal from "../AllProvidersModal";
import "../../../style/TitleHover.css";
import TitleMid from "../title/TitleMid";
import type { WatchProviderListItem } from "../../../types/tmdb";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

type Props = {
  providers: WatchProviderListItem[];
  loading?: boolean;
  region: string;
};

const MAX_PROVIDERS = 24;

export default function WatchProviderCarousel({
  providers,
  loading = false,
  region,
}: Props) {
  // Limit to top providers
  const displayProviders = providers.slice(0, MAX_PROVIDERS);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: true,
  });

  const [showAll, setShowAll] = useState(false);
  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(true);
  const [selectedSnap, setSelectedSnap] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      setPrevEnabled(emblaApi.canScrollPrev());
      setNextEnabled(emblaApi.canScrollNext());
    };
    emblaApi.on("select", update);
    emblaApi.on("init", update);
    update();
    return () => {
      emblaApi.off("select", update);
      emblaApi.off("init", update);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelectedSnap(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    emblaApi.on("init", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("init", onSelect);
    };
  }, [emblaApi]);

  const renderItems: WatchProviderListItem[] = loading
    ? Array.from({ length: 17 }).map((_, i) => ({
        provider_id: i,
        provider_name: "",
        logo_path: "",
        display_priority: i,
        display_priorities: {},
      }))
    : displayProviders;

  if (!providers.length && !loading) return null;

  return (
    <section className="px-page mt-8">
      <TitleMid>Streaming Services</TitleMid>

      <div className="relative -my-3 -mx-3">
        <div
          ref={emblaRef}
          className="overflow-hidden py-3 px-3    rounded-lg"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
            if (e.key === "ArrowRight") emblaApi?.scrollNext();
          }}
          role="region"
          aria-label="Streaming services carousel"
        >
          <div className="flex gap-6">
            {renderItems.map((provider: WatchProviderListItem, index: number) => (
              <div
                key={provider.provider_id}
                onFocus={() => emblaApi?.scrollTo(index)}
                className="flex-none"
              >
                {loading ? (
                  <div className="flex flex-col items-center">
                    <div className="h-28 w-28 rounded-2xl bg-white/10 animate-pulse" />
                    <div className="h-4 w-3/4 mt-2 rounded bg-white/10 animate-pulse" />
                  </div>
                ) : (
                  <WatchProviderCard
                    providerId={provider.provider_id}
                    providerName={provider.provider_name}
                    logoPath={provider.logo_path}
                    region={region}
                  />
                )}
              </div>
            ))}
            {!loading && (
              <div
                className="flex-none"
                onFocus={() => emblaApi?.scrollTo(renderItems.length)}
              >
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  aria-label="View all providers"
                  className="group flex flex-col items-center gap-2 cursor-pointer"
                >
                  <div
                    className="aspect-square w-28 rounded-2xl border border-[var(--border)]
                               bg-[var(--component-primary)] shadow-lg
                               flex items-center justify-center
                               transition-all duration-300
                               group-hover:scale-105 group-hover:border-accent-primary/75"
                  >
                    <LayoutGrid className="size-6 text-gray-300 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <p className="text-center text-xs text-gray-300 font-medium w-28">
                    View all
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>

        {prevEnabled && (
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="absolute left-0 inset-y-0 hidden lg:flex items-center justify-start pl-2 z-10 w-20
                       bg-gradient-to-r from-background via-background/60 to-transparent
                       text-white/60 hover:text-white
                       transition-all duration-300 cursor-pointer"
            aria-label="Previous"
          >
            <span className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
              <ChevronLeft className="size-5" />
            </span>
          </button>
        )}
        {nextEnabled && (
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="absolute right-0 inset-y-0 hidden lg:flex items-center justify-end pr-2 z-10 w-20
                       bg-gradient-to-l from-background via-background/60 to-transparent
                       text-white/60 hover:text-white
                       transition-all duration-300 cursor-pointer"
            aria-label="Next"
          >
            <span className="drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
              <ChevronRight className="size-5" />
            </span>
          </button>
        )}

        {scrollSnaps.length > 0 && scrollSnaps.length <= 10 && (
          <div className="hidden lg:block">
            <div className="flex items-center justify-center gap-2">
              {scrollSnaps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => emblaApi?.scrollTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === selectedSnap ? "bg-accent-primary w-6" : "bg-gray-500/50 w-2"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <AllProvidersModal
        isOpen={showAll}
        onClose={() => setShowAll(false)}
        providers={providers}
        region={region}
      />
    </section>
  );
}
