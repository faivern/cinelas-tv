// Built-in profile avatars. The SVGs live in public/avatars and are served
// same-origin by nginx, so the stored avatarUrl works directly as an <img src>
// everywhere a profile picture is rendered.
export const AVATAR_URLS = [
  "/avatars/teal.svg",
  "/avatars/sunset.svg",
  "/avatars/grape.svg",
  "/avatars/ocean.svg",
  "/avatars/lime.svg",
  "/avatars/ember.svg",
  "/avatars/blossom.svg",
  "/avatars/gold.svg",
  "/avatars/frost.svg",
  "/avatars/midnight.svg",
] as const;
