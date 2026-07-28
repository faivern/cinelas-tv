/** Append the YouTube embed params for chrome-less autoplay to a trailer URL. */
export function autoplayTrailerUrl(videoUrl: string): string {
  const separator = videoUrl.includes("?") ? "&" : "?";
  return `${videoUrl}${separator}autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&disablekb=0&enablejsapi=1`;
}
