/**
 * Netflix-style full-screen profile gate for the TV build. Shown once per app
 * session right after the welcome splash: "Who's watching?" with a D-pad
 * navigable column of profile tiles on the left over a slowly cross-fading
 * backdrop (the same trending artwork as the home hero). Picking a profile
 * signs in as that profile and dismisses the gate. The navbar profile button
 * reopens the gate as a switcher via openTvProfileGate().
 *
 * Profiles are user-managed here: each row can be edited (name + avatar from
 * a built-in set, see lib/avatars.ts), and a "Create profile" action adds one
 * (capped at MAX_PROFILES). Names are 2–16 chars.
 *
 * Rendered with role="dialog" + aria-modal so spatial navigation scopes focus
 * inside it, and so the hardware BACK button arrives here as a synthesized
 * Escape (see lib/tv/backButton.ts): while editing it cancels the editor,
 * otherwise close if already signed in, else exit the app (Netflix behavior).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Pencil, Plus, Check, X } from "lucide-react";
import {
  getProfiles,
  loginProfile,
  createProfile,
  renameProfile,
} from "../../api/user.api";
import { getTrendingMedia } from "../../api/trending.api";
import { useUser } from "../../hooks/user/useUser";
import { AVATAR_URLS } from "../../lib/avatars";
import { isTvMode } from "../../lib/tv/tvMode";
import BrandLogo from "../common/BrandLogo";
import type { Profile } from "../../types/user";

const OPEN_EVENT = "cinelas:tv-profile-gate-open";

const MAX_PROFILES = 5;
const NAME_MIN = 2;
const NAME_MAX = 16;

// Once per app session: relaunching the app shows the gate again, in-app
// route changes don't.
let dismissedThisSession = false;

/** Reopen the gate as a profile switcher (used by the TV navbar). */
export function openTvProfileGate(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX;
}

/** Slowly cross-fading backdrop wall reusing the home hero's trending artwork. */
function RotatingBackdrop({ enabled }: { enabled: boolean }) {
  const { data } = useQuery({
    // Same key as useTrendingMedia so the cache is shared with the home hero.
    queryKey: ["trending", "all", "day", 1, "en-US"],
    queryFn: () => getTrendingMedia("all", "day", 1, "en-US"),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const backdrops = useMemo(
    () =>
      (data ?? [])
        .map((m) => m.backdrop_path)
        .filter((p): p is string => Boolean(p))
        .slice(0, 12),
    [data]
  );

  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (backdrops.length <= 1) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % backdrops.length),
      9000
    );
    return () => window.clearInterval(timer);
  }, [backdrops.length]);

  const active = backdrops.length ? index % backdrops.length : 0;

  return (
    <div aria-hidden className="absolute inset-0 bg-background">
      {backdrops.map((path, i) => (
        <img
          key={path}
          src={`https://image.tmdb.org/t/p/w1280${path}`}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ease-in-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* Legibility scrim: darkest on the left where the profile list sits. */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
    </div>
  );
}

type EditState =
  | { mode: "create" }
  | { mode: "rename"; id: string }
  | null;

export default function TvProfileGate() {
  const [open, setOpen] = useState(() => isTvMode() && !dismissedThisSession);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const [edit, setEdit] = useState<EditState>(null);
  const [draft, setDraft] = useState("");
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: me, isLoading: meLoading } = useUser();
  const {
    data: profiles = [],
    isLoading: profilesLoading,
    isError: profilesError,
  } = useQuery({
    queryKey: ["profiles"],
    queryFn: getProfiles,
    enabled: open,
    staleTime: Infinity,
  });

  const dismiss = useCallback(() => {
    dismissedThisSession = true;
    setOpen(false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEdit(null);
    setDraft("");
    setAvatarDraft(null);
    setEditError(null);
  }, []);

  useEffect(() => {
    const reopen = () => {
      setSubmittingId(null);
      cancelEdit();
      setOpen(true);
      // Pull focus off the navbar so spatial nav's auto-focus lands on the
      // gate's autofocus tile instead of staying behind the overlay.
      (document.activeElement as HTMLElement | null)?.blur?.();
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, [cancelEdit]);

  // Fail open: a TV with no reachable profile service should still browse.
  // Never bail while mid-edit (creating the first profile would briefly read 0).
  const loading = profilesLoading || meLoading;
  useEffect(() => {
    if (edit) return;
    if (open && (profilesError || (!loading && profiles.length === 0))) {
      dismiss();
    }
  }, [open, profilesError, loading, profiles.length, dismiss, edit]);

  // BACK (synthesized Escape) / keyboard Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (edit) {
        cancelEdit();
      } else if (me) {
        dismiss();
      } else if (Capacitor.isNativePlatform()) {
        CapacitorApp.exitApp();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, me, dismiss, edit, cancelEdit]);

  async function pick(profile: Profile) {
    if (submittingId) return;
    if (me && me.id === profile.id) {
      dismiss();
      return;
    }
    setSubmittingId(profile.id);
    try {
      await loginProfile(profile.id);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      dismiss();
    } finally {
      setSubmittingId(null);
    }
  }

  function startCreate() {
    setEdit({ mode: "create" });
    setDraft("");
    setAvatarDraft(null);
    setEditError(null);
  }

  function startRename(profile: Profile) {
    setEdit({ mode: "rename", id: profile.id });
    setDraft(profile.name);
    setAvatarDraft(profile.avatarUrl ?? null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!edit || saving || !isValidName(draft)) return;
    const name = draft.trim();
    setSaving(true);
    setEditError(null);
    try {
      if (edit.mode === "create") {
        await createProfile(name, avatarDraft);
      } else {
        await renameProfile(edit.id, name, avatarDraft);
      }
      await queryClient.invalidateQueries({ queryKey: ["profiles"] });
      cancelEdit();
    } catch {
      setEditError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const autofocusId =
    me && profiles.some((p) => p.id === me.id) ? me.id : profiles[0]?.id;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Profile selection"
      className="fixed inset-0 z-[9990] overflow-hidden bg-background"
    >
      <RotatingBackdrop enabled={open} />

      {/* The edit screen's taller column would collide with the logo. */}
      {!edit && (
        <div className="absolute left-[4vw] top-[5vh] z-10">
          <BrandLogo className="scale-125 origin-left" />
        </div>
      )}

      <div className="relative z-10 flex h-full items-center">
        <div className="ml-[6vw] w-[34vw] min-w-[380px] max-w-[520px]">
          {edit ? (
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl font-light text-white">
                {edit.mode === "create" ? "Create profile" : "Edit profile"}
              </h1>
              <input
                type="text"
                value={draft}
                maxLength={NAME_MAX}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveEdit();
                  }
                }}
                aria-label="Profile name"
                placeholder="Profile name"
                className="w-full rounded-xl border border-white/15 bg-black/40 px-5 py-4 text-2xl text-white
                  outline-none placeholder:text-white/30 focus-visible:border-accent-primary"
              />
              <p
                className={`text-base ${editError ? "text-red-400" : "text-white/50"}`}
                aria-live="polite"
              >
                {editError ?? `${NAME_MIN}–${NAME_MAX} characters.`}
              </p>
              <div role="radiogroup" aria-label="Avatar" className="flex flex-col gap-3">
                <p className="text-base text-white/50">Avatar</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={avatarDraft === null}
                    aria-label="No avatar"
                    onClick={() => setAvatarDraft(null)}
                    data-tv-autofocus={avatarDraft === null ? "" : undefined}
                    className={`focus-ring-target flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg
                      bg-gradient-to-br from-accent-primary to-accent-secondary outline-none
                      transition-transform duration-200 focus-visible:scale-110
                      ${avatarDraft === null ? "ring-2 ring-white" : ""}`}
                  >
                    <span className="text-xl font-semibold text-white">
                      {draft.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                  </button>
                  {AVATAR_URLS.map((url) => (
                    <button
                      key={url}
                      type="button"
                      role="radio"
                      aria-checked={avatarDraft === url}
                      aria-label={`Avatar ${url.slice(url.lastIndexOf("/") + 1, -4)}`}
                      onClick={() => setAvatarDraft(url)}
                      data-tv-autofocus={avatarDraft === url ? "" : undefined}
                      className={`focus-ring-target size-12 shrink-0 overflow-hidden rounded-lg outline-none
                        transition-transform duration-200 focus-visible:scale-110
                        ${avatarDraft === url ? "ring-2 ring-white" : ""}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !isValidName(draft)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-primary to-accent-secondary
                    px-6 py-3 text-xl font-medium text-white outline-none transition
                    focus-visible:scale-105 disabled:opacity-40"
                >
                  <Check className="size-5" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-xl text-white
                    outline-none transition focus-visible:scale-105 hover:bg-white/15"
                >
                  <X className="size-5" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mb-[5vh] text-5xl font-light text-white">
                Who&apos;s watching?
              </h1>
              {loading ? (
                <div className="flex flex-col gap-4" aria-hidden>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-8 shrink-0" />
                      <span className="size-16 shrink-0 animate-pulse rounded-lg bg-white/5" />
                      <span className="h-6 w-32 animate-pulse rounded bg-white/5" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {profiles.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startRename(p)}
                        disabled={submittingId !== null}
                        aria-label={`Edit ${p.name}`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/40
                          outline-none transition-colors duration-200
                          hover:text-white focus-visible:text-white disabled:opacity-60"
                      >
                        <Pencil className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => pick(p)}
                        disabled={submittingId !== null}
                        data-tv-autofocus={p.id === autofocusId ? "" : undefined}
                        aria-label={`Watch as ${p.name}`}
                        className="group flex items-center gap-4 text-left outline-none disabled:opacity-60"
                      >
                        <span
                          className="focus-ring-target flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg
                            bg-gradient-to-br from-accent-primary to-accent-secondary
                            transition-transform duration-200 group-focus-visible:scale-105"
                        >
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-semibold text-white">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="max-w-[16rem] truncate text-2xl text-white/70 transition-colors duration-200 group-hover:text-white group-focus-visible:text-white">
                          {p.name}
                        </span>
                      </button>
                    </div>
                  ))}

                  {profiles.length < MAX_PROFILES && (
                    <div className="flex items-center gap-3">
                      <span className="w-8 shrink-0" />
                      <button
                        type="button"
                        onClick={startCreate}
                        disabled={submittingId !== null}
                        aria-label="Create profile"
                        className="group outline-none disabled:opacity-60"
                      >
                        <span className="focus-ring-target flex size-16 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/50 transition-transform duration-200 group-hover:text-white group-focus-visible:scale-105 group-focus-visible:text-white">
                          <Plus className="size-8" />
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
