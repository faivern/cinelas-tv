import { useEffect, useMemo, useRef, useState } from "react";

const TMDB_IMG = "https://image.tmdb.org/t/p";
const DEFAULT_INTERVAL_MS = 8000;
const FADE_DURATION_MS = 1500;

type Props = {
  paths: string[];
  intervalMs?: number;
  className?: string;
};

export default function RotatingBackdrop({
  paths,
  intervalMs = DEFAULT_INTERVAL_MS,
  className = "",
}: Props) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  const normalizedPaths = useMemo(
    () => paths.filter((p) => typeof p === "string" && p.length > 0),
    [paths]
  );

  // Reset when the underlying media changes (first path is the fingerprint).
  const firstPath = normalizedPaths[0];
  useEffect(() => {
    setIndex(0);
    setLoaded(new Set());
  }, [firstPath]);

  // Prefetch secondary backdrops after the first one has settled, so they don't
  // contend with the priority image on the initial connection.
  const startedPrefetch = useRef(false);
  useEffect(() => {
    if (startedPrefetch.current) return;
    if (normalizedPaths.length <= 1) return;
    if (!loaded.has(firstPath)) return;

    startedPrefetch.current = true;
    const controllers: Array<() => void> = [];

    normalizedPaths.slice(1).forEach((path, i) => {
      // Stagger slightly so decode work spreads across frames.
      const t = window.setTimeout(() => {
        const img = new Image();
        img.decoding = "async";
        img.src = `${TMDB_IMG}/original${path}`;
      }, i * 150);
      controllers.push(() => window.clearTimeout(t));
    });

    return () => {
      controllers.forEach((c) => c());
    };
  }, [normalizedPaths, firstPath, loaded]);

  // Reset the prefetch guard when the media changes.
  useEffect(() => {
    startedPrefetch.current = false;
  }, [firstPath]);

  // Only rotate through images that have finished loading, so a slow fetch
  // never fades to a blank frame.
  const loadedIndices = useMemo(
    () =>
      normalizedPaths.reduce<number[]>((acc, p, i) => {
        if (loaded.has(p)) acc.push(i);
        return acc;
      }, []),
    [normalizedPaths, loaded]
  );

  useEffect(() => {
    if (loadedIndices.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => {
        const pos = loadedIndices.indexOf(prev);
        const nextPos = (pos + 1) % loadedIndices.length;
        return loadedIndices[nextPos];
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [loadedIndices, intervalMs]);

  const handleLoaded = (path: string) => {
    setLoaded((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  };

  if (normalizedPaths.length === 0) return null;

  return (
    <div
      className={`absolute inset-0 isolate overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {normalizedPaths.map((path, i) => (
        <img
          key={path}
          src={`${TMDB_IMG}/original${path}`}
          alt=""
          decoding="async"
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          onLoad={() => handleLoaded(path)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
          style={{
            opacity: i === index && loaded.has(path) ? 1 : 0,
            transitionDuration: `${FADE_DURATION_MS}ms`,
            zIndex: i === index ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}
