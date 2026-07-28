import { useEffect, useMemo, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { ChevronRight, LogOut, User, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { openTvProfileGate } from "../auth/TvProfileGate";
import { useUser } from "../../hooks/user/useUser";
import { useWatchProviderRegions } from "../../hooks/media/useWatchProviders";
import { setWatchRegion, useWatchRegion } from "../../utils/watchRegion";
import TvRegionPicker from "./TvRegionPicker";

export default function TvProfileDropdown() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const regionRowRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

  const { data: user } = useUser();

  const { data: regionsData } = useWatchProviderRegions();
  const selectedRegion = useWatchRegion();
  const sortedRegions = useMemo(() => {
    const list = regionsData?.results ?? [];
    return [...list].sort((a, b) =>
      a.english_name.localeCompare(b.english_name)
    );
  }, [regionsData]);
  const selectedRegionName = useMemo(
    () =>
      sortedRegions.find((r) => r.iso_3166_1 === selectedRegion)?.english_name ??
      selectedRegion,
    [sortedRegions, selectedRegion]
  );

  // Close the dropdown on Escape (TV remote BACK is handled by backButton.ts
  // only when a dialog/modal is present, so we also treat the menu as a dialog
  // via role="dialog" while it is open). While the region picker is on top it
  // owns Escape, so leave the dropdown untouched underneath it.
  useEffect(() => {
    if (!open || regionPickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        const trigger = wrapperRef.current?.querySelector("button");
        (trigger as HTMLElement | null)?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, regionPickerOpen]);

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!wrapperRef.current?.contains(e.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  function switchProfiles() {
    setOpen(false);
    openTvProfileGate();
  }

  function exitApp() {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.exitApp();
    } else {
      toast("Exit is only available in the TV app.");
    }
  }

  function pickRegion(code: string) {
    setWatchRegion(code);
    closeRegionPicker();
  }

  function closeRegionPicker() {
    // Refocus the region row before unmounting the picker so focus never
    // escapes the wrapper (handleBlur would otherwise close the dropdown).
    regionRowRef.current?.focus();
    setRegionPickerOpen(false);
  }

  // Shared menu-item styling. `focus-fill` suppresses the outer blue ring; the
  // white background fill carries the highlight instead. Colour is applied
  // per-item so the muted "Exit Cinelas" row can stay subtle.
  const itemBase =
    "focus-fill flex items-center gap-3 w-full px-3 py-2 text-left text-sm " +
    "hover:bg-white hover:text-neutral-900 focus-visible:bg-white focus-visible:text-neutral-900 " +
    "transition-colors disabled:opacity-50";
  const itemClasses = `${itemBase} text-text-h1`;
  const itemMutedClasses = `${itemBase} text-subtle`;

  return (
    <div
      ref={wrapperRef}
      className="absolute left-0 top-0 bottom-0 flex items-center"
      onBlur={handleBlur}
    >
      {/* Positioning parent for the dropdown: anchors `top-full` to the trigger's
          bottom edge (not the full-height wrapper's) so the two panels butt up
          with no gap and read as one card. */}
      <div className="relative">
        <button
          type="button"
          aria-label="Profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          className={`group flex items-center justify-start p-2 text-text-h1 focus-fill transition-all duration-300 border border-transparent ${
            open
              ? "w-60 rounded-t-xl rounded-b-none bg-component-primary/95 backdrop-blur-lg border-outline border-b-transparent"
              : "w-12 rounded-full focus-visible:bg-white focus-visible:text-neutral-900"
          }`}
        >
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <User className="size-5 shrink-0" />
          )}
          {user?.name && (
            <span
              className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${
                open ? "max-w-48 ml-2 mr-2 opacity-100" : "max-w-0 ml-0 mr-0 opacity-0"
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">
                {user.name}
              </span>
              <span className="block text-xs opacity-75 leading-tight">
                Profile menu
              </span>
            </span>
          )}
        </button>

        <div
          role={open ? "dialog" : undefined}
          aria-modal={open ? true : undefined}
          aria-label="Profile options"
          className={`
            absolute left-0 top-full w-60
            bg-component-primary/95 backdrop-blur-lg rounded-b-xl shadow-2xl
            py-2 z-(--z-dropdown) border border-outline border-t-transparent
            origin-top transition-all duration-200
            ${
              open
                ? "opacity-100 scale-y-100 pointer-events-auto"
                : "opacity-0 scale-y-95 pointer-events-none"
            }
          `}
        >
          <div role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={switchProfiles}
              className={itemClasses}
            >
              <Users className="size-4 shrink-0" />
              <span className="flex-1">Switch profile</span>
              <ChevronRight className="size-4 shrink-0 opacity-60" />
            </button>

            <button
              ref={regionRowRef}
              type="button"
              role="menuitem"
              onClick={() => setRegionPickerOpen(true)}
              className={itemClasses}
            >
              <span
                aria-hidden="true"
                className={`fi fi-${selectedRegion.toLowerCase()} shrink-0`}
              />
              <span className="flex-1 truncate">
                Region · {selectedRegionName}
              </span>
              <ChevronRight className="size-4 shrink-0 opacity-60" />
            </button>

            <div className="border-t border-white/15 mt-1 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={exitApp}
                className={itemMutedClasses}
              >
                <LogOut className="size-4" />
                Exit Cinelas
              </button>
            </div>
          </div>
        </div>

        {regionPickerOpen && (
          <TvRegionPicker
            regions={sortedRegions}
            selected={selectedRegion}
            onSelect={pickRegion}
            onClose={closeRegionPicker}
          />
        )}
      </div>
    </div>
  );
}
