import RatingPill from "../../ui/RatingPill";
import RuntimePill from "../../ui/RuntimePill";
import DatePill from "../../ui/DatePill";
import GenrePill from "../../ui/GenrePill";

type Props = {
  vote_average: number;
  vote_count?: number;
  runtime: number;
  release_date: string;
  media_type?: "movie" | "tv";
  number_of_seasons?: number;
  genre_ids: number[];
};
export default function MediaMetaChips({
  vote_average,
  vote_count,
  runtime,
  release_date,
  media_type,
  number_of_seasons,
  genre_ids = [],
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
      <RatingPill rating={vote_average} count={vote_count} showWhenEmpty />
      <RuntimePill
        mediaType={media_type ?? "movie"}
        runtimeMin={runtime}
        seasons={number_of_seasons}
      />
      <DatePill date={release_date} longDate={false} />
      <div className="basis-full flex flex-wrap gap-2 mt-1">
        {genre_ids.map((id) => (
          <GenrePill key={id} id={id} className="" />
        ))}
      </div>
    </div>
  );
}
