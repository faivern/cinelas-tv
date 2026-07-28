// components/ui/RatingPill.tsx
type Props = {
  rating?: number;
  count?: number;
  className?: string;
  showWhenEmpty?: boolean;
};

export default function RatingPill({
  rating,
  count,
  className = "",
  showWhenEmpty = false,
}: Props) {
  const hasRating = rating != null && rating > 0;
  const visibilityClass = !hasRating && !showWhenEmpty ? "invisible" : "";
  const chipColors = hasRating
    ? "bg-amber-400/90 text-neutral-900"
    : "bg-white/10 text-gray-400";

  return (
    <span
      title={hasRating ? "Average TMDB rating" : "No rating available yet"}
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-bold [text-shadow:none]
        ${chipColors} ${visibilityClass} ${className}`}
    >
      {hasRating ? (
        <>
          {rating.toFixed(1)}
          {count != null && (
            <span className="ml-1 text-[0.65rem] font-normal text-neutral-900/60">
              ({count.toLocaleString()})
            </span>
          )}
        </>
      ) : (
        "—"
      )}
    </span>
  );
}
