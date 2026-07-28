import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createWrapper } from "../../test/queryWrapper";
import type { Profile, User } from "../../types/user";

const mocks = vi.hoisted(() => ({
  getProfiles: vi.fn(),
  loginProfile: vi.fn(),
  getUserCredentials: vi.fn(),
  postLogoutUser: vi.fn(),
  createProfile: vi.fn(),
  renameProfile: vi.fn(),
}));
vi.mock("../../api/user.api", () => mocks);
vi.mock("../../api/trending.api", () => ({ getTrendingMedia: vi.fn().mockResolvedValue([]) }));
vi.mock("@capacitor/app", () => ({ App: { exitApp: vi.fn(), addListener: vi.fn() } }));

const anna: Profile = { id: "anna", name: "Anna" };
const bob: Profile = { id: "bob", name: "Bob" };
const annaUser: User = { id: "anna", name: "Anna" };
const bobUser: User = { id: "bob", name: "Bob" };

// The gate opens once per app session (module flag), so each test gets a
// fresh module instance.
let TvProfileGate: React.ComponentType;

beforeEach(async () => {
  vi.resetModules();
  ({ default: TvProfileGate } = await import("./TvProfileGate"));
  mocks.getProfiles.mockResolvedValue([anna, bob]);
  mocks.getUserCredentials.mockResolvedValue(null);
  mocks.loginProfile.mockResolvedValue(bobUser);
  mocks.createProfile.mockResolvedValue({ id: "cara", name: "Cara" });
  mocks.renameProfile.mockResolvedValue({ id: "anna", name: "Annie" });
  document.documentElement.classList.add("tv");
});

afterEach(() => {
  document.documentElement.classList.remove("tv");
  vi.clearAllMocks();
});

function renderGate() {
  return render(<TvProfileGate />, { wrapper: createWrapper() });
}

describe("TvProfileGate", () => {
  it("renders nothing outside TV mode", () => {
    document.documentElement.classList.remove("tv");
    renderGate();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows Who's watching? with all profiles", async () => {
    renderGate();
    expect(screen.getByText("Who's watching?")).toBeInTheDocument();
    expect(await screen.findByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("dismisses without login when picking the signed-in profile", async () => {
    mocks.getUserCredentials.mockResolvedValue(annaUser);
    renderGate();
    await userEvent.click(await screen.findByLabelText("Watch as Anna"));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.loginProfile).not.toHaveBeenCalled();
  });

  it("logs in immediately when picking a profile without a session", async () => {
    renderGate();
    await userEvent.click(await screen.findByLabelText("Watch as Bob"));
    await waitFor(() =>
      expect(mocks.loginProfile).toHaveBeenCalledWith("bob")
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("fails open when profiles cannot be loaded", async () => {
    mocks.getProfiles.mockRejectedValue(new Error("down"));
    renderGate();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("creates a profile from the create action", async () => {
    renderGate();
    await userEvent.click(await screen.findByRole("button", { name: "Create profile" }));
    const input = await screen.findByLabelText("Profile name");
    await userEvent.type(input, "Cara");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(mocks.createProfile).toHaveBeenCalledWith("Cara", null)
    );
  });

  it("creates a profile with a picked avatar", async () => {
    renderGate();
    await userEvent.click(await screen.findByRole("button", { name: "Create profile" }));
    await userEvent.type(await screen.findByLabelText("Profile name"), "Cara");
    await userEvent.click(screen.getByRole("radio", { name: "Avatar teal" }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(mocks.createProfile).toHaveBeenCalledWith("Cara", "/avatars/teal.svg")
    );
  });

  it("renames a profile with the prefilled name", async () => {
    renderGate();
    await userEvent.click(await screen.findByLabelText("Edit Anna"));
    const input = await screen.findByLabelText("Profile name");
    expect(input).toHaveValue("Anna");
    await userEvent.clear(input);
    await userEvent.type(input, "Annie");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(mocks.renameProfile).toHaveBeenCalledWith("anna", "Annie", null)
    );
  });

  it("prefills and saves an existing avatar on edit", async () => {
    mocks.getProfiles.mockResolvedValue([
      { ...anna, avatarUrl: "/avatars/gold.svg" },
      bob,
    ]);
    renderGate();
    await userEvent.click(await screen.findByLabelText("Edit Anna"));
    expect(
      await screen.findByRole("radio", { name: "Avatar gold" })
    ).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByRole("radio", { name: "Avatar frost" }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() =>
      expect(mocks.renameProfile).toHaveBeenCalledWith(
        "anna",
        "Anna",
        "/avatars/frost.svg"
      )
    );
  });

  it("blocks saving a name shorter than two characters", async () => {
    renderGate();
    await userEvent.click(await screen.findByRole("button", { name: "Create profile" }));
    const input = await screen.findByLabelText("Profile name");
    await userEvent.type(input, "A");
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });
});
