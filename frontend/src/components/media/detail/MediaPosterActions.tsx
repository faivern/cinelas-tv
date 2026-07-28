import { Play } from "lucide-react";
import StatusPicker from "./StatusPicker";

type Props = {
  onWatchNow: () => void;
  mediaId: number;
  mediaType: string;
};

export default function MediaPosterActions({
  onWatchNow,
  mediaId,
  mediaType,
}: Props) {
  return (
    <div className="mt-3 md:mt-6 flex flex-col gap-2 md:gap-3">
      <button
        aria-label="Watch Now"
        title="Watch Now"
        onClick={onWatchNow}
        className="bg-gradient-to-b from-accent-primary to-accent-secondary
                   hover:from-accent-primary hover:to-accent-secondary
                   text-white py-2 md:py-4 px-2 rounded-lg md:rounded-xl font-semibold shadow-lg
                   transform transition-transform duration-200 hover:scale-103
                   hidden md:flex flex-col items-center justify-center gap-0.5 md:gap-1 cursor-pointer
                   md:flex-row md:gap-2"
      >
        <Play className="text-white size-4" />
        <span className="text-xs md:text-lg tracking-wide">Watch</span>
      </button>

      <StatusPicker mediaId={mediaId} mediaType={mediaType} variant="web" />
    </div>
  );
}
