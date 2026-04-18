import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies ──────────────────────────────────────────
vi.mock("../db", () => ({
  getBrandById: vi.fn(),
  getContentPackageById: vi.fn(),
  getIdeaById: vi.fn(),
  getVariantsByPackageId: vi.fn(),
  getBrandRules: vi.fn(),
}));

vi.mock("./enrichment", () => ({
  enrichPayload: vi.fn().mockResolvedValue({
    hashtags: ["branding", "marketing", "growth"],
    tags: ["manus_ai"],
    trending_score: 72,
  }),
}));

vi.mock("./timing", () => ({
  getOptimalPostingTimeForBrand: vi.fn().mockResolvedValue({
    optimal_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    timezone: "Australia/Sydney",
  }),
}));

import { composePayload } from "./payload-composer";
import * as db from "../db";

const mockBrand = { id: 1, name: "Pulse Branding", website: "https://pulse-branding.com", userId: 1, status: "active" as const, isDefault: true, createdAt: new Date(), updatedAt: new Date() };
const mockPkg = { id: 10, ideaId: 5, brandId: 1, masterHook: "Why branding matters", masterAngle: "ROI angle", cta: "Book a call", keyPoints: [], blogContent: "", status: "generated" as const, version: 1, generationModel: null, generationPrompt: null, createdAt: new Date(), updatedAt: new Date() };
const mockIdea = { id: 5, brandId: 1, title: "Branding ROI: What the numbers say", angle: "Data-backed angle", summary: null, funnelStage: "awareness" as const, targetPlatforms: ["linkedin", "webflow"], campaignId: null, pillarId: null, sourceType: "manual" as const, status: "approved" as const, createdByUserId: null, approvedByUserId: null, approvedAt: null, createdAt: new Date(), updatedAt: new Date() };
const mockVariants = [
  { id: 100, contentPackageId: 10, brandId: 1, platform: "linkedin" as const, formatType: "long_post" as const, title: "LinkedIn Title", body: "Full LinkedIn body text here.", caption: "Short caption", hashtags: [], script: null, status: "generated" as const, version: 1, createdAt: new Date(), updatedAt: new Date() },
];
const mockRules: any[] = [];

beforeEach(() => {
  vi.mocked(db.getBrandById).mockResolvedValue(mockBrand as any);
  vi.mocked(db.getContentPackageById).mockResolvedValue(mockPkg as any);
  vi.mocked(db.getIdeaById).mockResolvedValue(mockIdea as any);
  vi.mocked(db.getVariantsByPackageId).mockResolvedValue(mockVariants as any);
  vi.mocked(db.getBrandRules).mockResolvedValue(mockRules);
});

describe("composePayload", () => {
  it("returns a payload with all required top-level fields", async () => {
    const result = await composePayload({
      ideaId: 5,
      brandId: 1,
      platform: "linkedin",
      contentPackageId: 10,
    });

    expect(result).toHaveProperty("ideaId", 5);
    expect(result).toHaveProperty("platform", "linkedin");
    expect(result).toHaveProperty("status", "draft");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("metadata");
    expect(result).toHaveProperty("instructions");
  });

  it("content block contains body, caption, and headline", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    expect(result.content.body).toBeTruthy();
    expect(typeof result.content.caption).toBe("string");
    expect(result.content.headline).toBeTruthy();
  });

  it("metadata contains hashtags array", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    expect(Array.isArray(result.metadata.hashtags)).toBe(true);
    expect(result.metadata.hashtags.length).toBeGreaterThan(0);
  });

  it("metadata contains tags array", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    expect(Array.isArray(result.metadata.tags)).toBe(true);
  });

  it("metadata.optimal_time is a valid ISO string in the future", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    const t = new Date(result.metadata.optimal_time).getTime();
    expect(t).toBeGreaterThan(Date.now());
  });

  it("metadata.trending_score is within 1-100", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    expect(result.metadata.trending_score).toBeGreaterThanOrEqual(1);
    expect(result.metadata.trending_score).toBeLessThanOrEqual(100);
  });

  it("instructions block has all three fields populated", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 10 });

    expect(result.instructions.first_comment).toBeTruthy();
    expect(result.instructions.engagement_strategy).toBeTruthy();
    expect(result.instructions.follow_up_trigger).toBeTruthy();
  });

  it("throws when brand is not found", async () => {
    vi.mocked(db.getBrandById).mockResolvedValueOnce(undefined);

    await expect(
      composePayload({ ideaId: 5, brandId: 999, platform: "linkedin", contentPackageId: 10 }),
    ).rejects.toThrow("Brand 999 not found");
  });

  it("throws when content package is not found", async () => {
    vi.mocked(db.getContentPackageById).mockResolvedValueOnce(undefined);

    await expect(
      composePayload({ ideaId: 5, brandId: 1, platform: "linkedin", contentPackageId: 999 }),
    ).rejects.toThrow("Content package 999 not found");
  });

  it("works for webflow platform", async () => {
    const result = await composePayload({ ideaId: 5, brandId: 1, platform: "webflow", contentPackageId: 10 });
    expect(result.platform).toBe("webflow");
    expect(result.content.body).toBeTruthy();
  });
});
