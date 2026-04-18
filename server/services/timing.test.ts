import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getPlatformSchedules: vi.fn().mockResolvedValue([
    { id: 1, brandId: 1, platform: "linkedin", timezone: "Australia/Sydney", enabled: true, bestPushTime: "09:00", cadenceType: "weekly", cadenceDays: [1, 3, 5], cadenceDayOfMonth: 1, cadenceIntervalDays: 7, autoSchedule: false, createdAt: new Date(), updatedAt: new Date() },
  ]),
}));

import { getOptimalPostingTime, getOptimalPostingTimeForBrand } from "./timing";

describe("getOptimalPostingTime", () => {
  it("returns an ISO string for optimal_time", () => {
    const result = getOptimalPostingTime({ platform: "linkedin", timezone: "UTC" });
    expect(() => new Date(result.optimal_time)).not.toThrow();
    expect(result.optimal_time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("optimal_time is always at least 2 hours in the future", () => {
    const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
    for (const platform of ["linkedin", "x", "webflow", "reddit", "email"]) {
      const result = getOptimalPostingTime({ platform, timezone: "UTC" });
      expect(new Date(result.optimal_time).getTime()).toBeGreaterThanOrEqual(twoHoursFromNow - 1000);
    }
  });

  it("returns the provided timezone", () => {
    const result = getOptimalPostingTime({ platform: "linkedin", timezone: "Asia/Tokyo" });
    expect(result.timezone).toBe("Asia/Tokyo");
  });

  it("works for unknown platforms with a fallback schedule", () => {
    const result = getOptimalPostingTime({ platform: "unknown_platform", timezone: "UTC" });
    expect(result.optimal_time).toBeTruthy();
    expect(new Date(result.optimal_time).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("getOptimalPostingTimeForBrand", () => {
  it("resolves timezone from stored brand schedule", async () => {
    const result = await getOptimalPostingTimeForBrand({ brandId: 1, platform: "linkedin" });
    expect(result.timezone).toBe("Australia/Sydney");
  });

  it("falls back to UTC when no schedule exists", async () => {
    const { getPlatformSchedules } = await import("../db");
    vi.mocked(getPlatformSchedules).mockResolvedValueOnce([]);

    const result = await getOptimalPostingTimeForBrand({ brandId: 1, platform: "webflow" });
    expect(result.timezone).toBe("UTC");
  });

  it("optimal_time is in the future", async () => {
    const result = await getOptimalPostingTimeForBrand({ brandId: 1, platform: "linkedin" });
    expect(new Date(result.optimal_time).getTime()).toBeGreaterThan(Date.now());
  });
});
