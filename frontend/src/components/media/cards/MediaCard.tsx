import { Link } from "react-router-dom";
import Poster from "../../media/shared/Poster";
import RatingPill from "../../ui/RatingPill";
import MediaCardModal from "../modals/MediaCardModal";
import type { MediaType } from "../../../types/tmdb";
import { mediaUrl } from "../../../utils/urlBuilder";
import { useDelayHover } from "../../../hooks/useDelayHover";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from "@floating-ui/react";

type MediaCardProps = {
  id: number;
  media_type: MediaType;
  title: string;
  posterPath: string;
  overview?: string;
  releaseDate?: string;
  vote_average?: number;
  genre_ids?: number[];
  vote_count?: number;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  disableHoverModal?: boolean;
  onClick?: () => void;
};

export default function MediaCard(props: MediaCardProps) {
  const {
    id,
    title,
    posterPath,
    media_type,
    overview,
    releaseDate,
    vote_average,
    genre_ids,
    disableHoverModal = false,
    onClick,
  } = props;

  const { hovered, onEnter, onLeave, setHovered } = useDelayHover();

  const { refs, floatingStyles } = useFloating({
    placement: "right",
    middleware: disableHoverModal ? [] : [offset(6), flip(), shift()],
    whileElementsMounted: disableHoverModal ? undefined : autoUpdate,
  });

  return (
    <div
      ref={disableHoverModal ? undefined : refs.setReference}
      className="relative w-full mx-auto"
      onMouseEnter={disableHoverModal ? undefined : onEnter}
      onMouseLeave={disableHoverModal ? undefined : onLeave}
      onFocus={disableHoverModal ? undefined : () => setHovered(true)}
      onBlur={disableHoverModal ? undefined : () => setHovered(false)}
    >
      <div className={`group relative z-10 hover:z-30 ${hovered ? 'z-30' : ''} transition-transform duration-300 cursor-pointer`}>
        <div
          className="focus-ring-within bg-[var(--component-primary)]
  rounded-2xl border border-[var(--border)] overflow-hidden shadow-lg
  hover:shadow-xl hover:scale-105 hover:border-accent-primary/75
  focus-within:scale-105
  transition-all duration-500 ease-out relative group"
        >
          {(() => {
            const cardContent = (
              <>
                <RatingPill
                  rating={vote_average}
                  className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 ease-out z-10"
                />

                {/* Poster */}
                <Poster
                  path={posterPath}
                  alt={title}
                  className="w-full"
                  priority={false}
                />

                {/* Hover gradient overlay with title */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 ease-out">
                  <h3 className="text-sm font-semibold text-white truncate">
                    {title}
                  </h3>
                </div>
              </>
            );

            return onClick ? (
              <div
                onClick={onClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onClick();
                }}
              >
                {cardContent}
              </div>
            ) : (
              <Link to={mediaUrl(media_type, id, title)}>{cardContent}</Link>
            );
          })()}
        </div>

        {/* Floating hover modal — desktop only, zero-fetch */}
        {!disableHoverModal && hovered && (
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="hidden lg:block z-(--z-dropdown) pointer-events-none animate-[fadeIn_0.15s_ease-out]"
          >
            <MediaCardModal
              id={id}
              media_type={media_type}
              title={title}
              posterPath={posterPath}
              overview={overview}
              releaseDate={releaseDate}
              vote_average={vote_average}
              genre_ids={genre_ids}
              runtime={props.runtime}
              number_of_seasons={props.number_of_seasons}
              number_of_episodes={props.number_of_episodes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
