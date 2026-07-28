import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWrapper } from "../../test/queryWrapper";
import type { User } from "../../types/user";

const mocks = vi.hoisted(() => ({
  getUserCredentials: vi.fn(),
  postLogoutUser: vi.fn(),
  getWatchProviderRegions: vi.fn(),
  openTvProfileGate: vi.fn(),
  exitApp: vi.fn(),
  isNativePlatform: vi.fn().mockReturnValue(false),
}));

vi.mock("../../api/user.api", () => ({
  getUserCredentials: mocks.getUserCredentials,
  postLogoutUser: mocks.postLogoutUser,
}));
vi.mock("../../api/watchProviders.api", () => ({
  getWatchProviderRegions: mocks.getWatchProviderRegions,
  getWatchProviders: vi.fn(),
}));
vi.mock("../auth/TvProfileGate", () => ({
  openTvProfileGate: mocks.openTvProfileGate,
  default: () => null,
}));
vi.mock("@capacitor/app", () => ({ App: { exitApp: mocks.exitApp, addListener: vi.fn() } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: mocks.isNativePlatform } }));

const annaUser: User = { id: "anna", name: "Anna" };

let TvProfileDropdown: React.ComponentType;

beforeEach(async () => {
  vi.resetModules();
  ({ default: TvProfileDropdown } = await import("./TvProfileDropdown"));
  mocks.getUserCredentials.mockResolvedValue(annaUser);
  mocks.getWatchProviderRegions.mockResolvedValue({
    results: [
      { iso_3166_1: "SE", english_name: "Sweden", native_name: "Sverige" },
      { iso_3166_1: "US", english_name: "United States", native_name: "United States" },
    ],
  });
  localStorage.clear();
  document.documentElement.classList.add("tv");
});

afterEach(() => {
  document.documentElement.classList.remove("tv");
  vi.clearAllMocks();
});

function renderDropdown() {
  return render(<TvProfileDropdown />, { wrapper: createWrapper() });
}

async function openMenu() {
  await userEvent.click(await screen.findByLabelText("Profile menu"));
  await screen.findByRole("dialog", { name: "Profile options" });
}

describe("TvProfileDropdown", () => {
  it("opens on focus and shows the menu items", async () => {
    renderDropdown();
    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: "Switch profile" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /Region/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Exit Cinelas" })
    ).toBeInTheDocument();
  });

  it("opens the profile gate from 'Switch profile'", async () => {
    renderDropdown();
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Switch profile" }));

    expect(mocks.openTvProfileGate).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Profile options" })).toBeNull()
    );
  });

  it("picks a region through the full-screen picker", async () => {
    renderDropdown();
    await openMenu();
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /Region/ })).toBeInTheDocument()
    );
    await userEvent.click(screen.getByRole("menuitem", { name: /Region/ }));

    const picker = await screen.findByRole("dialog", { name: "Select region" });
    expect(picker).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: /United States/ }));

    expect(localStorage.getItem("watchProviders_selectedCountry")).toBe("US");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Select region" })).toBeNull()
    );
    expect(
      screen.getByRole("menuitem", { name: /United States/ })
    ).toBeInTheDocument();
  });

  it("exits the app when 'Exit Cinelas' is selected on a native platform", async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    renderDropdown();
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Exit Cinelas" }));

    expect(mocks.exitApp).toHaveBeenCalled();
  });
});
