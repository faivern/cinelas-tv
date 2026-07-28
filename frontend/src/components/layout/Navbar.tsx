import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { House, List, Drama, Search, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import SearchBar from "../layout/SearchBar";
import "../../style/TitleHover.css";
import GenreList from "../filters/GenreList";
import { useSignInModal } from "../../context/SignInModalContext";
import { useUser } from "../../hooks/user/useUser";
import { useLogout } from "../../hooks/user/useLogout";
import { UserModal } from "./UserModal";
import { useGenres } from "../../hooks/genres/useGenres";
import BrandLogo from "../common/BrandLogo";
import { isTvMode } from "../../lib/tv/tvMode";
import TvProfileDropdown from "./TvProfileDropdown";

export default function Header() {
  const tv = isTvMode();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: genres = [] } = useGenres();
  const [showGenres, setShowGenres] = useState(false); // desktop hover dropdown
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileGenres, setShowMobileGenres] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();
  const { openSignInModal } = useSignInModal();
  const userPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close user panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        userPanelRef.current &&
        !userPanelRef.current.contains(e.target as Node)
      ) {
        setIsUserModalOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsUserModalOpen(false);
  };

  const handleMobileProfileTap = () => {
    if (user) {
      setIsUserModalOpen(true);
    } else {
      openSignInModal();
    }
  };

  // TV: media detail pages are full-screen (Netflix-style) — no chrome.
  // Search keeps the header so entering search doesn't feel like a page jump.
  if (tv && /^\/(movie|tv)\/[^/]+$/.test(location.pathname)) {
    return null;
  }

  // TV: minimal icon bar (profile / search / home / lists) — no burger, no genre nav.
  if (tv) {
    return (
      <header className="relative z-(--z-sticky) w-full bg-transparent">
        <div className="w-full px-4 lg:px-8 xl:px-12">
          <nav className="relative flex items-center justify-center py-3">
            {/* LEFT: profile switcher. Focusing the trigger opens a dropdown with
                the other household profiles and an "Exit Cinelas" option. */}
            <TvProfileDropdown />

            {/* CENTER: items keep the focused look when idle, just one step smaller. */}
            <div className="group flex items-center gap-4">
              <Link
                to="/search"
                aria-label="Search"
                data-tv-header-default
                className="p-2 rounded-full text-text-h1 focus-fill focus-visible:bg-white focus-visible:text-neutral-900
                  scale-90 group-focus-within:scale-100 transition duration-300"
              >
                <Search className="size-5" />
              </Link>
              <Link
                to="/"
                className="px-4 py-1.5 rounded-full text-sm font-semibold text-text-h1 focus-fill focus-visible:bg-white focus-visible:text-neutral-900
                  scale-90 group-focus-within:scale-100 transition duration-300"
              >
                Home
              </Link>
              <Link
                to="/lists"
                className="px-4 py-1.5 rounded-full text-sm font-semibold text-text-h1 focus-fill focus-visible:bg-white focus-visible:text-neutral-900
                  scale-90 group-focus-within:scale-100 transition duration-300"
              >
                My Cinelas
              </Link>
            </div>

            {/* RIGHT: logo is decorative on TV — not focusable, no navigation */}
            <div
              aria-hidden="true"
              className="absolute right-0 top-1/2 -translate-y-1/2"
            >
              <BrandLogo />
            </div>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <>
      <header
        className={`sticky top-0 z-(--z-sticky) w-full backdrop-blur-lg transition-colors duration-700 ease-in-out
        ${
          isScrolled
            ? "bg-gradient-to-b from-primary via-primary to-primary shadow-xl"
            : "bg-gradient-to-b from-primary/90 via-primary/60 to-transparent"
        }`}
      >
        {/* Full-width container - no max-width constraint */}
        <div className="w-full px-4 lg:px-8 xl:px-12">
          {/* Three-column grid layout with equal-width outer columns for true centering */}
          <nav className="grid grid-cols-[auto_1fr] md:grid-cols-[1fr_auto_1fr] items-center py-4 gap-4 xl:gap-8">
            {/* LEFT: Logo + Nav Links */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex-shrink-0 mr-4">
                <BrandLogo />
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden xl:flex items-center gap-6">
                <Link to="/">
                  <span className="underline-hover !text-base !font-semibold !mb-0 whitespace-nowrap flex items-center gap-2">
                    <House className="size-3.5" />
                    Home
                    <span className="underline-bar"></span>
                  </span>
                </Link>
                <Link to="/lists">
                  <span className="underline-hover !text-base !font-semibold !mb-0 whitespace-nowrap flex items-center gap-2">
                    <List className="size-3.5" />
                    Lists
                    <span className="underline-bar"></span>
                  </span>
                </Link>
                <div
                  className="relative"
                  onMouseEnter={() => setShowGenres(true)}
                  onMouseLeave={() => setShowGenres(false)}
                  onFocus={() => setShowGenres(true)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setShowGenres(false);
                    }
                  }}
                >
                  <button
                    type="button"
                    aria-haspopup="true"
                    aria-expanded={showGenres}
                    onClick={() => setShowGenres((v) => !v)}
                    className="underline-hover !text-base !font-semibold !mb-0 cursor-pointer flex items-center gap-2"
                  >
                    <Drama className="size-3.5" />
                    Genres
                    <span className="underline-bar"></span>
                  </button>

                  {showGenres && (
                    <div className="absolute left-0 top-full pt-2 z-(--z-drawer)">
                      <div className="w-96 bg-component-primary/95 backdrop-blur-lg border border-outline rounded-xl p-6 shadow-2xl">
                        <GenreList genres={genres} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER: Search Bar (hidden on mobile) */}
            <div className="hidden md:block w-2xl max-w-[min(42rem,calc(100vw-14rem))]">
              <SearchBar />
            </div>

            {/* RIGHT: User Actions */}
            <div className="flex items-center md:justify-end gap-4">
              {/* Mobile-only: Search pill + Profile — md:hidden */}
              <div className="flex items-center gap-3 flex-1 w-full md:hidden">
                {/* Search pill — tappable trigger (invisible on AI Discover to preserve layout) */}
                <button
                  aria-label="Open search"
                  onClick={() => setIsMobileSearchOpen(true)}
                  className="flex items-center gap-2 flex-1 bg-input border border-outline rounded-full px-4 py-2 text-subtle text-sm transition hover:border-accent-primary"
                >
                  <Search className="size-3.5" />
                  <span>Search</span>
                </button>

                {/* Profile — pushed to far right */}
                <button
                  aria-label="Open profile"
                  onClick={handleMobileProfileTap}
                  className="flex-shrink-0 p-2 text-text-h1 hover:text-accent-primary transition"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <User className="size-[18px]" />
                  )}
                </button>
              </div>

              {/* Hamburger — tablet only (md to xl) */}
              <div className="hidden md:block xl:hidden">
                <button
                  aria-label="Open menu"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-3 text-text-h1 hover:text-accent-primary transition"
                >
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              </div>

              {/* Login Button or User Profile Dropdown — hidden on mobile (<md) */}
              <div className="hidden md:block">
                {user ? (
                  <div className="relative" ref={userPanelRef}>
                    <button
                      onClick={() => setIsUserModalOpen(!isUserModalOpen)}
                      className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer"
                    >
                      {user.picture && (
                        <img
                          src={user.picture}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="hidden lg:inline text-sm font-medium text-text-h1">
                        {user.name}
                      </span>
                      <svg
                        className={`w-4 h-4 text-subtle transition-transform duration-300 ${
                          isUserModalOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    <UserModal
                      show={isUserModalOpen}
                      userName={user.name}
                      onLogout={handleLogout}
                      onClose={() => setIsUserModalOpen(false)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => openSignInModal()}
                    className="flex items-center bg-accent-secondary hover:bg-accent-primary text-white font-semibold px-4 lg:px-6 py-2 rounded-full transition cursor-pointer whitespace-nowrap"
                  >
                    <User className="mr-1 lg:mr-2 size-4" />
                    <span className="hidden sm:inline">Log in</span>
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile search overlay */}
      {isMobileSearchOpen && (
        <SearchBar
          isMobile={true}
          isExpanded={true}
          onToggle={() => setIsMobileSearchOpen(false)}
        />
      )}

      {/* Nav drawer — tablet range (md to xl) for genres/links */}
      <Transition.Root show={isMobileMenuOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-(--z-dialog)"
          onClose={() => setIsMobileMenuOpen(false)}
        >
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
          </Transition.Child>

          {/* Drawer panel */}
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-out duration-[250ms]"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transform transition ease-in duration-200"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel
              as="aside"
              className="fixed inset-y-0 left-0 w-72 max-w-[calc(100vw-3rem)] bg-component-primary/95 backdrop-blur-lg border-r border-border flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-text-h1">Menu</h2>
                <button
                  aria-label="Close menu"
                  autoFocus
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 text-subtle hover:text-text-h1 transition"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Home & Lists links — hidden on <md */}
                <div className="hidden md:block space-y-4">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full text-left text-base font-medium text-text-h1 hover:text-accent-primary transition"
                  >
                    <House className="size-5" />
                    Home
                  </Link>
                  <Link
                    to="/lists"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full text-left text-base font-medium text-text-h1 hover:text-accent-primary transition"
                  >
                    <List className="size-5" />
                    My Lists
                  </Link>
                </div>

                <div>
                  <button
                    onClick={() => setShowMobileGenres((p) => !p)}
                    className="flex items-center justify-between w-full text-left text-base font-medium text-text-h1 hover:text-accent-primary transition"
                    aria-expanded={showMobileGenres}
                    aria-controls="mobile-genres-panel"
                  >
                    <span className="flex items-center gap-3">
                      <Drama className="size-5" />
                      Genres
                    </span>
                    <svg
                      className={`w-5 h-5 transform transition ${
                        showMobileGenres ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showMobileGenres && (
                    <div
                      id="mobile-genres-panel"
                      className="mt-3 pr-1 space-y-1"
                    >
                      <GenreList genres={genres} />
                    </div>
                  )}
                </div>
              </nav>

              <div className="px-5 py-4 border-t border-border">
                {user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {user.picture && (
                        <img
                          src={user.picture}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <span className="text-green-500 font-medium">
                        {user.name}
                      </span>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-full transition"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); openSignInModal(); }}
                    className="w-full flex items-center justify-center bg-accent-secondary hover:bg-accent-primary text-white font-semibold px-4 py-2 rounded-full transition"
                  >
                    <User className="mr-2 size-4" />
                    Login
                  </button>
                )}
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition.Root>
    </>
  );
}
