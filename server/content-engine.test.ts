import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getBrandsByUserId: vi.fn().mockResolvedValue([
    { id: 1, name: "Pulse Branding", status: "active", isDefault: true },
  ]),
  getBrandById: vi.fn().mockResolvedValue({
    id: 1, name: "Pulse Branding", mission: "Build brands that resonate", status: "active",
  }),
  createBrand: vi.fn().mockResolvedValue({ id: 2, name: "New Brand" }),
  updateBrand: vi.fn().mockResolvedValue(undefined),
  getBrandRules: vi.fn().mockResolvedValue([]),
  createBrandRule: vi.fn().mockResolvedValue({ id: 1 }),
  deleteBrandRule: vi.fn().mockResolvedValue(undefined),
  getContentPillars: vi.fn().mockResolvedValue([
    { id: 1, brandId: 1, name: "Brand Strategy", description: "Strategy content", priority: 1 },
  ]),
  createContentPillar: vi.fn().mockResolvedValue({ id: 2 }),
  updateContentPillar: vi.fn().mockResolvedValue(undefined),
  deleteContentPillar: vi.fn().mockResolvedValue(undefined),
  getAudienceProfiles: vi.fn().mockResolvedValue([]),
  createAudienceProfile: vi.fn().mockResolvedValue({ id: 1 }),
  updateAudienceProfile: vi.fn().mockResolvedValue(undefined),
  deleteAudienceProfile: vi.fn().mockResolvedValue(undefined),
  getPromptTemplates: vi.fn().mockResolvedValue([
    { id: 1, brandId: 1, name: "LinkedIn Post", platform: "linkedin", isActive: true },
  ]),
  createPromptTemplate: vi.fn().mockResolvedValue({ id: 2 }),
  updatePromptTemplate: vi.fn().mockResolvedValue(undefined),
  deletePromptTemplate: vi.fn().mockResolvedValue(undefined),
  getPlatformPreferences: vi.fn().mockResolvedValue([]),
  upsertPlatformPreference: vi.fn().mockResolvedValue(undefined),
  getCampaigns: vi.fn().mockResolvedValue([]),
  createCampaign: vi.fn().mockResolvedValue({ id: 1 }),
  updateCampaign: vi.fn().mockResolvedValue(undefined),
  getIdeas: vi.fn().mockResolvedValue([
    { id: 1, brandId: 1, title: "Test Idea", status: "proposed", funnelStage: "awareness" },
  ]),
  getIdeaById: vi.fn().mockResolvedValue({ id: 1, brandId: 1, title: "Test Idea", status: "proposed" }),
  createIdea: vi.fn().mockResolvedValue({ id: 2, title: "New Idea" }),
  updateIdea: vi.fn().mockResolvedValue(undefined),
  getIdeaStats: vi.fn().mockResolvedValue({ proposed: 1, approved: 0, rejected: 0 }),
  getContentPackageByIdeaId: vi.fn().mockResolvedValue(null),
  getContentPackageById: vi.fn().mockResolvedValue({
    id: 1, brandId: 1, ideaId: 1, title: "Test Package", status: "draft",
  }),
  getContentPackagesByBrand: vi.fn().mockResolvedValue([]),
  createContentPackage: vi.fn().mockResolvedValue({ id: 1 }),
  updateContentPackage: vi.fn().mockResolvedValue(undefined),
  getVariantsByPackageId: vi.fn().mockResolvedValue([]),
  getVariantById: vi.fn().mockResolvedValue({ id: 1, platform: "linkedin", content: "Test content" }),
  createVariant: vi.fn().mockResolvedValue({ id: 1 }),
  updateVariant: vi.fn().mockResolvedValue(undefined),
  getAssetsByPackageId: vi.fn().mockResolvedValue([]),
  createAsset: vi.fn().mockResolvedValue({ id: 1 }),
  updateAsset: vi.fn().mockResolvedValue(undefined),
  getIntegrations: vi.fn().mockResolvedValue([]),
  upsertIntegration: vi.fn().mockResolvedValue(undefined),
  getWebflowFieldMapping: vi.fn().mockResolvedValue(null),
  upsertWebflowFieldMapping: vi.fn().mockResolvedValue(undefined),
  getPublishJobs: vi.fn().mockResolvedValue([]),
  createPublishJob: vi.fn().mockResolvedValue({ id: 1 }),
  updatePublishJob: vi.fn().mockResolvedValue(undefined),
  getPublishStats: vi.fn().mockResolvedValue({ total: 0, published: 0, failed: 0 }),
  logAudit: vi.fn().mockResolvedValue(undefined),
  getAuditLog: vi.fn().mockResolvedValue([
    { id: 1, brandId: 1, action: "created", description: "Brand created", createdAt: new Date() },
  ]),
  getAnalyticsSummary: vi.fn().mockResolvedValue({
    totalIdeas: 5, approvedIdeas: 2, totalPackages: 3, publishedPackages: 1,
    totalPublished: 4, platformBreakdown: { linkedin: 2, instagram: 2 },
    ideaStatusBreakdown: { proposed: 3, approved: 2, rejected: 0 },
  }),
  // Scheduling helpers
  getPlatformSchedules: vi.fn().mockResolvedValue([]),
  getPlatformSchedule: vi.fn().mockResolvedValue(null),
  getScheduledPosts: vi.fn().mockResolvedValue([]),
  createScheduledPost: vi.fn().mockResolvedValue(1),
  upsertPlatformSchedule: vi.fn().mockResolvedValue(undefined),
  updateScheduledPost: vi.fn().mockResolvedValue(undefined),
  deleteScheduledPost: vi.fn().mockResolvedValue(undefined),
  getDueScheduledPosts: vi.fn().mockResolvedValue([]),
  // Other helpers used by various routers
  getAllInspectorRules: vi.fn().mockResolvedValue([]),
  createInspectorRule: vi.fn().mockResolvedValue({ id: 1 }),
  updateInspectorRule: vi.fn().mockResolvedValue(undefined),
  deleteInspectorRule: vi.fn().mockResolvedValue(undefined),
  getInspectionReportsByPackage: vi.fn().mockResolvedValue([]),
  createInspectionReport: vi.fn().mockResolvedValue({ id: 1 }),
  getLatestPipelineRun: vi.fn().mockResolvedValue(null),
  getPipelineRuns: vi.fn().mockResolvedValue([]),
  createPipelineRun: vi.fn().mockResolvedValue({ id: 1 }),
  updatePipelineRun: vi.fn().mockResolvedValue(undefined),
  getInspectorThresholds: vi.fn().mockResolvedValue([]),
  upsertInspectorThreshold: vi.fn().mockResolvedValue(undefined),
  getVitalityModelAccuracy: vi.fn().mockResolvedValue(null),
  getReviewQueue: vi.fn().mockResolvedValue([]),
  deleteVariantsByPackageId: vi.fn().mockResolvedValue(undefined),
  deleteAllIdeasForBrand: vi.fn().mockResolvedValue(undefined),
  hardDeleteAllIdeasForBrand: vi.fn().mockResolvedValue(undefined),
}));

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ ideas: [{ title: "AI Idea", angle: "Test", pillar: "Brand Strategy", platform: "linkedin", funnelStage: "awareness" }] }) } }],
  }),
}));

vi.mock("./_core/imageGeneration.ts", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test-image.png" }),
}));

// ─── Auth context helper ──────────────────────────────────────────────────────
function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1, openId: "7RedJUFYBPmEdZaAxtvJH8", name: "Lareesa Hu",
      email: "lareesa@pulse-branding.com", loginMethod: "manus",
      role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Brand Router", () => {
  it("lists brands for authenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const brands = await caller.brand.list();
    expect(brands).toHaveLength(1);
    expect(brands[0].name).toBe("Pulse Branding");
  });

  it("gets a brand by id", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const brand = await caller.brand.get({ id: 1 });
    expect(brand?.name).toBe("Pulse Branding");
    expect(brand?.mission).toContain("resonate");
  });

  it("creates a new brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const brand = await caller.brand.create({ name: "New Brand", description: "Test brand" });
    expect(brand).toBeDefined();
  });
});

describe("Content Pillars Router", () => {
  it("lists content pillars for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const pillars = await caller.brand.getPillars({ brandId: 1 });
    expect(pillars).toHaveLength(1);
    expect(pillars[0].name).toBe("Brand Strategy");
  });

  it("creates a content pillar", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const pillar = await caller.brand.addPillar({ brandId: 1, name: "New Pillar", description: "Test" });
    expect(pillar).toBeDefined();
  });
});

describe("Ideas Router", () => {
  it("lists ideas for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const ideas = await caller.idea.list({ brandId: 1 });
    expect(ideas).toHaveLength(1);
    expect(ideas[0].title).toBe("Test Idea");
  });

  it("creates an idea", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const idea = await caller.idea.create({
      brandId: 1, title: "New Idea", angle: "Fresh perspective",
      funnelStage: "awareness",
    });
    expect(idea).toBeDefined();
  });

  it("updates idea status", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.idea.updateStatus({ id: 1, status: "approved" })).resolves.toBeDefined();
  });
});

describe("Prompt Templates Router", () => {
  it("lists prompt templates for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const templates = await caller.brand.getPrompts({ brandId: 1 });
    expect(templates).toHaveLength(1);
    expect(templates[0].platform).toBe("linkedin");
  });
});

describe("Activity Router", () => {
  it("lists audit events for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const events = await caller.activity.list({ brandId: 1 });
    expect(events).toHaveLength(1);
    expect(events[0].action).toBe("created");
  });
});

describe("Analytics Router", () => {
  it("returns analytics summary for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const summary = await caller.analytics.summary({ brandId: 1 });
    expect(summary?.totalIdeas).toBe(5);
    expect(summary?.approvedIdeas).toBe(2);
    expect(summary?.platformBreakdown).toHaveProperty("linkedin");
  });
});

describe("Integrations Router", () => {
  it("lists integrations for a brand", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const integrations = await caller.integrations.list({ brandId: 1 });
    expect(integrations).toEqual([]);
  });

  it("saves an integration", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.integrations.save({
      brandId: 1,
      platform: "linkedin",
      accessToken: "test-token",
    });
    expect(result.success).toBe(true);
  });
});

describe("Auth Router", () => {
  it("returns current user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const user = await caller.auth.me();
    expect(user?.name).toBe("Lareesa Hu");
    expect(user?.role).toBe("admin");
  });

  it("clears session cookie on logout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("Integrations Router - Webflow Field Mapping", () => {
  it("returns null when no field mapping exists", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const mapping = await caller.integrations.getWebflowFieldMapping({ brandId: 1 });
    expect(mapping).toBeNull();
  });

  it("saves a Webflow field mapping", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.integrations.saveWebflowFieldMapping({
      brandId: 1,
      collectionId: "abc123",
      collectionName: "Blog Posts",
      fieldMapping: { title: "name", body: "post-body", caption: "description" },
    });
    expect(result.success).toBe(true);
  });
});

describe("Pipeline Router - Batch Actions", () => {
  it("batch approves multiple packages", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pipeline.batchApproveForPublishing({
      contentPackageIds: [1, 2],
    });
    expect(result.success).toBe(true);
    expect(result.approved).toBe(2);
  });

  it("batch rejects multiple packages", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pipeline.batchRejectFromQueue({
      contentPackageIds: [1, 2],
      reason: "Not on brand",
    });
    expect(result.success).toBe(true);
    expect(result.rejected).toBe(2);
  });

  it("batch deletes multiple packages", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.pipeline.batchDeleteFromQueue({
      contentPackageIds: [1, 2],
    });
    expect(result.success).toBe(true);
    expect(result.deleted).toBe(2);
  });
});
