import Pill from "./Pill";
import { Star } from "lucide-react";
type Props = {
  rating?: number;
  count?: number;
  className?: string;
  showOutOfTen?: boolean;
};

export default function RatingPillUser({
  rating,
  count,
  className = "",
  showOutOfTen = true,
}: Props) {
  const pillClass = `font-medium ${!rating ? "invisible" : ""} ${className}`;
  return (
    <Pill
      className={pillClass}
      icon={
        <Star className="text-accent-primary mr-1" />
      }
      title="Your average rating"
    >
      {rating ? (
        <>
          <span className="font-bold">{rating.toFixed(1)}</span>
          {showOutOfTen && <span>/10</span>}
          {count != null && (
            <span className="ml-1 text-xs text-gray-400">
              ({count.toLocaleString()})
            </span>
          )}
        </>
      ) : (
        "No rating"
      )}
    </Pill>
  );
}
