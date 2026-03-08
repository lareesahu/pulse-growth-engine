import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, brands, brandRules, contentPillars, audienceProfiles, promptTemplates,
  platformPreferences, campaigns, ideas, contentPackages, platformVariants,
  assets, integrationAccounts, publishJobs, auditEvents, performanceRecords,
  InsertUser, InsertBrand, InsertBrandRule, InsertContentPillar, InsertAudienceProfile,
  InsertPromptTemplate, InsertPlatformPreference, InsertCampaign, InsertIdea,
  InsertContentPackage, InsertPlatformVariant, InsertAsset, InsertIntegrationAccount,
  InsertPublishJob, InsertAuditEvent, InsertPerformanceRecord,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field]; if (value === undefined) return;
    const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Brands ───────────────────────────────────────────────────────────────────
export async function getBrandsByUserId(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(brands).where(and(eq(brands.userId, userId), eq(brands.status, "active"))).orderBy(desc(brands.createdAt));
}
export async function getBrandById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return result[0];
}
export async function createBrand(data: InsertBrand) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(brands).values(data);
}
export async function updateBrand(id: number, data: Partial<InsertBrand>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(brands).set(data).where(eq(brands.id, id));
}

// ─── Brand Rules ──────────────────────────────────────────────────────────────
export async function getBrandRules(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(brandRules).where(eq(brandRules.brandId, brandId)).orderBy(brandRules.priority);
}
export async function createBrandRule(data: InsertBrandRule) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(brandRules).values(data);
}
export async function deleteBrandRule(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.delete(brandRules).where(eq(brandRules.id, id));
}

// ─── Content Pillars ──────────────────────────────────────────────────────────
export async function getContentPillars(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(contentPillars).where(eq(contentPillars.brandId, brandId)).orderBy(contentPillars.priority);
}
export async function createContentPillar(data: InsertContentPillar) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(contentPillars).values(data);
}
export async function updateContentPillar(id: number, data: Partial<InsertContentPillar>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(contentPillars).set(data).where(eq(contentPillars.id, id));
}
export async function deleteContentPillar(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.delete(contentPillars).where(eq(contentPillars.id, id));
}

// ─── Audience Profiles ────────────────────────────────────────────────────────
export async function getAudienceProfiles(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(audienceProfiles).where(eq(audienceProfiles.brandId, brandId));
}
export async function createAudienceProfile(data: InsertAudienceProfile) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(audienceProfiles).values(data);
}
export async function updateAudienceProfile(id: number, data: Partial<InsertAudienceProfile>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(audienceProfiles).set(data).where(eq(audienceProfiles.id, id));
}
export async function deleteAudienceProfile(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.delete(audienceProfiles).where(eq(audienceProfiles.id, id));
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────
export async function getPromptTemplates(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(promptTemplates).where(eq(promptTemplates.brandId, brandId)).orderBy(desc(promptTemplates.createdAt));
}
export async function createPromptTemplate(data: InsertPromptTemplate) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(promptTemplates).values(data);
}
export async function updatePromptTemplate(id: number, data: Partial<InsertPromptTemplate>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(promptTemplates).set(data).where(eq(promptTemplates.id, id));
}
export async function deletePromptTemplate(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.delete(promptTemplates).where(eq(promptTemplates.id, id));
}

// ─── Platform Preferences ─────────────────────────────────────────────────────
export async function getPlatformPreferences(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformPreferences).where(eq(platformPreferences.brandId, brandId));
}
export async function upsertPlatformPreference(brandId: number, platform: string, data: Partial<InsertPlatformPreference>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(platformPreferences).where(and(eq(platformPreferences.brandId, brandId), eq(platformPreferences.platform, platform))).limit(1);
  if (existing.length > 0) return db.update(platformPreferences).set(data).where(eq(platformPreferences.id, existing[0].id));
  return db.insert(platformPreferences).values({ brandId, platform, ...data });
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaigns(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.brandId, brandId)).orderBy(desc(campaigns.createdAt));
}
export async function createCampaign(data: InsertCampaign) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(campaigns).values(data);
}
export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

// ─── Ideas ────────────────────────────────────────────────────────────────────
export async function getIdeas(brandId: number, status?: string) {
  const db = await getDb(); if (!db) return [];
  const cond = status
    ? and(eq(ideas.brandId, brandId), eq(ideas.status, status as any))
    : eq(ideas.brandId, brandId);
  return db.select().from(ideas).where(cond).orderBy(desc(ideas.createdAt));
}
export async function getIdeaById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(ideas).where(eq(ideas.id, id)).limit(1);
  return result[0];
}
export async function createIdea(data: InsertIdea) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(ideas).values(data);
  return result;
}
export async function updateIdea(id: number, data: Partial<InsertIdea>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(ideas).set(data).where(eq(ideas.id, id));
}
export async function getIdeaStats(brandId: number) {
  const db = await getDb(); if (!db) return { proposed: 0, in_review: 0, approved: 0, rejected: 0, archived: 0 };
  const all = await db.select().from(ideas).where(eq(ideas.brandId, brandId));
  return {
    proposed: all.filter(i => i.status === "proposed").length,
    in_review: all.filter(i => i.status === "in_review").length,
    approved: all.filter(i => i.status === "approved").length,
    rejected: all.filter(i => i.status === "rejected").length,
    archived: all.filter(i => i.status === "archived").length,
    total: all.length,
  };
}

// ─── Content Packages ─────────────────────────────────────────────────────────
export async function getContentPackageByIdeaId(ideaId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(contentPackages).where(eq(contentPackages.ideaId, ideaId)).orderBy(desc(contentPackages.version)).limit(1);
  return result[0];
}
export async function getContentPackageById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(contentPackages).where(eq(contentPackages.id, id)).limit(1);
  return result[0];
}
export async function getContentPackagesByBrand(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(contentPackages).where(eq(contentPackages.brandId, brandId)).orderBy(desc(contentPackages.createdAt));
}
export async function createContentPackage(data: InsertContentPackage) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(contentPackages).values(data);
}
export async function updateContentPackage(id: number, data: Partial<InsertContentPackage>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(contentPackages).set(data).where(eq(contentPackages.id, id));
}

// ─── Platform Variants ────────────────────────────────────────────────────────
export async function getVariantsByPackageId(contentPackageId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformVariants).where(eq(platformVariants.contentPackageId, contentPackageId));
}
export async function getVariantById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(platformVariants).where(eq(platformVariants.id, id)).limit(1);
  return result[0];
}
export async function createVariant(data: InsertPlatformVariant) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(platformVariants).values(data);
}
export async function updateVariant(id: number, data: Partial<InsertPlatformVariant>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(platformVariants).set(data).where(eq(platformVariants.id, id));
}

// ─── Assets ───────────────────────────────────────────────────────────────────
export async function getAssetsByPackageId(contentPackageId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(assets).where(eq(assets.contentPackageId, contentPackageId));
}
export async function createAsset(data: InsertAsset) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(assets).values(data);
}
export async function updateAsset(id: number, data: Partial<InsertAsset>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(assets).set(data).where(eq(assets.id, id));
}

// ─── Integration Accounts ─────────────────────────────────────────────────────
export async function getIntegrations(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(integrationAccounts).where(eq(integrationAccounts.brandId, brandId));
}
export async function upsertIntegration(brandId: number, platform: string, data: Partial<InsertIntegrationAccount>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const existing = await db.select().from(integrationAccounts).where(and(eq(integrationAccounts.brandId, brandId), eq(integrationAccounts.platform, platform))).limit(1);
  if (existing.length > 0) return db.update(integrationAccounts).set(data).where(eq(integrationAccounts.id, existing[0].id));
  return db.insert(integrationAccounts).values({ brandId, platform, ...data } as InsertIntegrationAccount);
}

// ─── Publish Jobs ─────────────────────────────────────────────────────────────
export async function getPublishJobs(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(publishJobs).where(eq(publishJobs.brandId, brandId)).orderBy(desc(publishJobs.createdAt));
}
export async function createPublishJob(data: InsertPublishJob) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.insert(publishJobs).values(data);
}
export async function updatePublishJob(id: number, data: Partial<InsertPublishJob>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(publishJobs).set(data).where(eq(publishJobs.id, id));
}
export async function getPublishStats(brandId: number) {
  const db = await getDb(); if (!db) return { queued: 0, scheduled: 0, published: 0, failed: 0 };
  const all = await db.select().from(publishJobs).where(eq(publishJobs.brandId, brandId));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    queued: all.filter(j => j.publishStatus === "queued").length,
    scheduled: all.filter(j => j.publishStatus === "scheduled").length,
    published: all.filter(j => j.publishStatus === "published").length,
    publishedToday: all.filter(j => j.publishStatus === "published" && j.publishedAt && j.publishedAt >= today).length,
    failed: all.filter(j => j.publishStatus === "failed").length,
    total: all.length,
  };
}

// ─── Audit Events ─────────────────────────────────────────────────────────────
export async function logAudit(data: InsertAuditEvent) {
  const db = await getDb(); if (!db) return;
  return db.insert(auditEvents).values(data);
}
export async function getAuditLog(brandId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(auditEvents).where(eq(auditEvents.brandId, brandId)).orderBy(desc(auditEvents.createdAt)).limit(limit);
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalyticsSummary(brandId: number) {
  const db = await getDb(); if (!db) return null;
  const [allIdeas, allPackages, allJobs] = await Promise.all([
    db.select().from(ideas).where(eq(ideas.brandId, brandId)),
    db.select().from(contentPackages).where(eq(contentPackages.brandId, brandId)),
    db.select().from(publishJobs).where(eq(publishJobs.brandId, brandId)),
  ]);
  const platformCounts: Record<string, number> = {};
  allJobs.filter(j => j.publishStatus === "published").forEach(j => { platformCounts[j.platform] = (platformCounts[j.platform] || 0) + 1; });
  const pillarCounts: Record<string, number> = {};
  allIdeas.forEach(i => { if (i.pillarId) pillarCounts[String(i.pillarId)] = (pillarCounts[String(i.pillarId)] || 0) + 1; });
  return {
    totalIdeas: allIdeas.length,
    approvedIdeas: allIdeas.filter(i => i.status === "approved").length,
    totalPackages: allPackages.length,
    publishedPackages: allPackages.filter(p => p.status === "approved_for_publish").length,
    totalPublished: allJobs.filter(j => j.publishStatus === "published").length,
    platformBreakdown: platformCounts,
    ideaStatusBreakdown: {
      proposed: allIdeas.filter(i => i.status === "proposed").length,
      approved: allIdeas.filter(i => i.status === "approved").length,
      rejected: allIdeas.filter(i => i.status === "rejected").length,
    },
  };
}
