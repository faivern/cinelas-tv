import { useState } from "react";
import { Star, StarHalf } from "lucide-react";

type StarRatingProps = {
  value: number | null;
  onChange?: (value: number) => void;
  maxStars?: number;
  maxValue?: number;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
  className?: string;
};

export default function StarRating({
  value,
  onChange,
  maxStars = 5,
  maxValue = 10,
  size = "md",
  readOnly = false,
  showValue = true,
  className = "",
}: StarRatingProps) {
  const [hoverValue] = useState<number | null>(null);

  // Convert the numeric value (0-maxValue) to star scale (0-maxStars)
  const starValue = value !== null ? (value / maxValue) * maxStars : 0;
  const displayValue = hoverValue !== null ? hoverValue : starValue;

  const sizeClasses = {
    sm: "gap-0.5",
    md: "gap-1",
    lg: "gap-1",
  };
  const iconSize = { sm: "size-3.5", md: "size-[18px]", lg: "size-6" }[size];

  const renderStar = (index: number) => {
    const fillAmount = displayValue - index;
    const filled = fillAmount >= 1;
    const half = !filled && fillAmount >= 0.5;
    const Icon = half ? StarHalf : Star;

    return (
      <span key={index} className="text-accent-primary">
        <Icon className={iconSize} fill={filled || half ? "currentColor" : "none"} />
      </span>
    );
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className={`flex items-center ${sizeClasses[size]}`}>
        <div className="flex">
          {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
        </div>
        {showValue && value !== null && (
          <span className="ml-2 text-[var(--subtle)] text-sm font-medium">
            {value.toFixed(1)}
          </span>
        )}
      </div>
      {!readOnly && (
        <input
          type="range"
          min={0}
          max={maxValue}
          step={0.1}
          value={value ?? 0}
          onChange={(e) => onChange && onChange(parseFloat(e.target.value))}
          className="w-full accent-accent-primary h-1 mt-1"
        />
      )}
    </div>
  );
}
