import { describe, it, expect, vi, beforeEach } from "vitest";

describe("config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("defaults to relative URLs when no env vars are set", async () => {
    vi.stubEnv("VITE_API_URL", "");

    const config = await import("./config");

    expect(config.API_URL).toBe("");
    expect(config.PROFILES_URL).toBe("/api/auth/profiles");
    expect(config.LOGIN_URL).toBe("/api/auth/login");
    expect(config.LOGOUT_URL).toBe("/api/auth/logout");
    expect(config.ME_URL).toBe("/api/auth/me");
  });

  it("prefixes all auth URLs with VITE_API_URL when set", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.example.com");

    const config = await import("./config");

    expect(config.API_URL).toBe("https://api.example.com");
    expect(config.PROFILES_URL).toBe("https://api.example.com/api/auth/profiles");
    expect(config.LOGIN_URL).toBe("https://api.example.com/api/auth/login");
    expect(config.LOGOUT_URL).toBe("https://api.example.com/api/auth/logout");
    expect(config.ME_URL).toBe("https://api.example.com/api/auth/me");
  });
});
