import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, brands, brandRules, contentPillars, audienceProfiles, promptTemplates,
  platformPreferences, campaigns, ideas, contentPackages, platformVariants,
  assets, integrationAccounts, publishJobs, auditEvents, performanceRecords,
  inspectorRules, inspectionReports, pipelineRuns, inspectorThresholds, vitalityPredictions,
  webflowFieldMappings,
  InsertUser, InsertBrand, InsertBrandRule, InsertContentPillar, InsertAudienceProfile,
  InsertPromptTemplate, InsertPlatformPreference, InsertCampaign, InsertIdea,
  InsertContentPackage, InsertPlatformVariant, InsertAsset, InsertIntegrationAccount,
  InsertPublishJob, InsertAuditEvent, InsertPerformanceRecord,
  InsertInspectorRule, InsertInspectionReport, InsertPipelineRun,
  InsertInspectorThreshold, InsertVitalityPrediction, InsertWebflowFieldMapping,
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
  const [result] = await db.insert(ideas).values(data).$returningId();
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
  const [result] = await db.insert(contentPackages).values(data).$returningId();
  return result;
}
export async function updateContentPackage(id: number, data: Partial<InsertContentPackage>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  const safeData = { ...data } as any;
  if (safeData.keyPoints != null && typeof safeData.keyPoints !== 'string') safeData.keyPoints = JSON.stringify(safeData.keyPoints);
  return db.update(contentPackages).set(safeData).where(eq(contentPackages.id, id));
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
  // mysql2 driver cannot serialize JS arrays for JSON columns directly — must pre-stringify
  const safeData = {
    ...data,
    hashtags: data.hashtags != null ? (typeof data.hashtags === 'string' ? data.hashtags : JSON.stringify(data.hashtags)) as any : null,
  };
  return db.insert(platformVariants).values(safeData);
}
export async function updateVariant(id: number, data: Partial<InsertPlatformVariant>) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.update(platformVariants).set(data).where(eq(platformVariants.id, id));
}

export async function deleteVariantsByPackageId(contentPackageId: number) {
  const db = await getDb(); if (!db) throw new Error("DB not available");
  return db.delete(platformVariants).where(eq(platformVariants.contentPackageId, contentPackageId));
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
  const jobs = await db.select().from(publishJobs).where(eq(publishJobs.brandId, brandId)).orderBy(desc(publishJobs.createdAt));
  // Enrich with content title and variant body for display
  const enriched = await Promise.all(jobs.map(async (job) => {
    let contentTitle: string | null = null;
    let variantBody: string | null = null;
    if (job.contentPackageId) {
      const pkgs = await db!.select({ masterHook: contentPackages.masterHook, ideaId: contentPackages.ideaId }).from(contentPackages).where(eq(contentPackages.id, job.contentPackageId)).limit(1);
      if (pkgs[0]) {
        contentTitle = pkgs[0].masterHook || null;
        if (!contentTitle && pkgs[0].ideaId) {
          const ideaRows = await db!.select({ title: ideas.title }).from(ideas).where(eq(ideas.id, pkgs[0].ideaId)).limit(1);
          contentTitle = ideaRows[0]?.title || null;
        }
      }
    }
    if (job.variantId) {
      const vars = await db!.select({ body: platformVariants.body, caption: platformVariants.caption }).from(platformVariants).where(eq(platformVariants.id, job.variantId)).limit(1);
      if (vars[0]) variantBody = vars[0].body || vars[0].caption || null;
    }
    return { ...job, contentTitle, variantBody };
  }));
  return enriched;
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
  // Need pillar names — fetch them
  const db2 = await getDb();
  const pillarRows = db2 ? await db2.select().from(contentPillars).where(eq(contentPillars.brandId, brandId)) : [];
  const pillarNameMap: Record<number, string> = {};
  pillarRows.forEach(p => { pillarNameMap[p.id] = p.name; });
  allIdeas.forEach(i => {
    if (i.pillarId) {
      const name = pillarNameMap[i.pillarId] || `Pillar ${i.pillarId}`;
      pillarCounts[name] = (pillarCounts[name] || 0) + 1;
    }
  });
  return {
    totalIdeas: allIdeas.length,
    approvedIdeas: allIdeas.filter(i => i.status === "approved").length,
    totalPackages: allPackages.length,
    publishedPackages: allPackages.filter(p => p.status === "approved_for_publish").length,
    totalPublished: allJobs.filter(j => j.publishStatus === "published").length,
    platformBreakdown: platformCounts,
    pillarBreakdown: pillarCounts,
    ideaStatusBreakdown: {
      proposed: allIdeas.filter(i => i.status === "proposed").length,
      approved: allIdeas.filter(i => i.status === "approved").length,
      rejected: allIdeas.filter(i => i.status === "rejected").length,
    },
  };
}

// ─── Inspector Rules ──────────────────────────────────────────────────────────
export async function getInspectorRules(brandId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectorRules)
    .where(and(eq(inspectorRules.brandId, brandId), eq(inspectorRules.isActive, true)))
    .orderBy(inspectorRules.sortOrder, inspectorRules.createdAt);
}

export async function getAllInspectorRules(brandId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectorRules)
    .where(eq(inspectorRules.brandId, brandId))
    .orderBy(inspectorRules.sortOrder, inspectorRules.createdAt);
}

export async function createInspectorRule(data: InsertInspectorRule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(inspectorRules).values(data);
}

export async function updateInspectorRule(id: number, data: Partial<InsertInspectorRule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(inspectorRules).set(data).where(eq(inspectorRules.id, id));
}

export async function deleteInspectorRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(inspectorRules).where(eq(inspectorRules.id, id));
}

// ─── Inspection Reports ───────────────────────────────────────────────────────
export async function createInspectionReport(data: InsertInspectionReport) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const safeData = { ...data } as any;
  if (safeData.failedDimensions != null && typeof safeData.failedDimensions !== 'string') safeData.failedDimensions = JSON.stringify(safeData.failedDimensions);
  if (safeData.issues != null && typeof safeData.issues !== 'string') safeData.issues = JSON.stringify(safeData.issues);
  if (safeData.fixedContent != null && typeof safeData.fixedContent !== 'string') safeData.fixedContent = JSON.stringify(safeData.fixedContent);
  const [result] = await db.insert(inspectionReports).values(safeData).$returningId();
  return result;
}

export async function getInspectionReportsByPackage(contentPackageId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectionReports)
    .where(eq(inspectionReports.contentPackageId, contentPackageId))
    .orderBy(inspectionReports.createdAt);
}

// ─── Pipeline Runs ────────────────────────────────────────────────────────────
export async function createPipelineRun(data: InsertPipelineRun) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const [result] = await db.insert(pipelineRuns).values(data).$returningId();
  return result;
}

export async function updatePipelineRun(id: number, data: Partial<InsertPipelineRun>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(pipelineRuns).set(data).where(eq(pipelineRuns.id, id));
}

export async function getLatestPipelineRun(brandId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(pipelineRuns)
    .where(eq(pipelineRuns.brandId, brandId))
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(1);
  return results[0] ?? null;
}

export async function getPipelineRuns(brandId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineRuns)
    .where(eq(pipelineRuns.brandId, brandId))
    .orderBy(desc(pipelineRuns.startedAt))
    .limit(limit);
}

// ─── Review Queue ─────────────────────────────────────────────────────────────
export async function getReviewQueue(brandId: number) {
  const db = await getDb();
  if (!db) return [];
  // Packages that need review: generated (awaiting decision), approved_for_publish (approved), needs_revision (rejected)
  return db.select().from(contentPackages)
    .where(and(
      eq(contentPackages.brandId, brandId),
      inArray(contentPackages.status, ["generated", "approved_for_publish", "needs_revision"])
    ))
    .orderBy(desc(contentPackages.createdAt));
}

// ─── Inspector Thresholds ─────────────────────────────────────────────────────
export async function getInspectorThresholds(brandId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inspectorThresholds).where(eq(inspectorThresholds.brandId, brandId));
}

export async function upsertInspectorThreshold(brandId: number, dimension: string, data: { minScore?: number; isActive?: boolean; weight?: number }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(inspectorThresholds)
    .values({ brandId, dimension, minScore: data.minScore ?? 7, isActive: data.isActive ?? true, weight: data.weight ?? 1 })
    .onDuplicateKeyUpdate({ set: { ...data } });
}

export async function seedDefaultThresholds(brandId: number) {
  const dimensions = [
    { dimension: "humanisation", minScore: 7, weight: 2 },
    { dimension: "authenticity", minScore: 8, weight: 3 },
    { dimension: "accuracy", minScore: 8, weight: 3 },
    { dimension: "platformFit", minScore: 7, weight: 2 },
    { dimension: "originality", minScore: 7, weight: 2 },
    { dimension: "virality", minScore: 6, weight: 1 },
  ];
  for (const d of dimensions) {
    await upsertInspectorThreshold(brandId, d.dimension, { minScore: d.minScore, weight: d.weight });
  }
}

// ─── Virality Predictions ─────────────────────────────────────────────────────
export async function createVitalityPrediction(data: InsertVitalityPrediction) {
  const db = await getDb();
  if (!db) return;
  return db.insert(vitalityPredictions).values(data);
}

export async function getVitalityPredictions(brandId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vitalityPredictions)
    .where(eq(vitalityPredictions.brandId, brandId))
    .orderBy(desc(vitalityPredictions.createdAt))
    .limit(limit);
}

export async function updateVitalityPrediction(id: number, data: Partial<InsertVitalityPrediction>) {
  const db = await getDb();
  if (!db) return;
  return db.update(vitalityPredictions).set(data).where(eq(vitalityPredictions.id, id));
}

export async function getVitalityModelAccuracy(brandId: number) {
  const db = await getDb();
  if (!db) return { totalPredictions: 0, resolvedPredictions: 0, avgError: 0, accuracy: 0 };
  const records = await db.select().from(vitalityPredictions)
    .where(eq(vitalityPredictions.brandId, brandId));
  const resolved = records.filter(r => r.actualEngagement !== null && r.predictionError !== null);
  const avgError = resolved.length > 0
    ? resolved.reduce((sum, r) => sum + (r.predictionError ?? 0), 0) / resolved.length
    : 0;
  const accuracy = Math.max(0, Math.round(100 - avgError));
  return { totalPredictions: records.length, resolvedPredictions: resolved.length, avgError: Math.round(avgError), accuracy };
}

// ─── Webflow Field Mappings ───────────────────────────────────────────────────
export async function getWebflowFieldMapping(brandId: number) {
  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(webflowFieldMappings)
    .where(eq(webflowFieldMappings.brandId, brandId))
    .orderBy(desc(webflowFieldMappings.updatedAt))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertWebflowFieldMapping(brandId: number, data: {
  collectionId: string;
  collectionName?: string;
  fieldMapping: Record<string, string>;
}) {
  const db = await getDb(); if (!db) return;
  const existing = await getWebflowFieldMapping(brandId);
  if (existing) {
    await db.update(webflowFieldMappings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webflowFieldMappings.id, existing.id));
  } else {
    await db.insert(webflowFieldMappings).values({ brandId, ...data });
  }
}

// ─── Bulk Idea Deletion ───────────────────────────────────────────────────────
export async function deleteAllIdeasForBrand(brandId: number) {
  const db = await getDb(); if (!db) return 0;
  // Archive all non-archived ideas for the brand
  const result = await db.update(ideas)
    .set({ status: "archived" })
    .where(and(eq(ideas.brandId, brandId)));
  return (result as any)[0]?.affectedRows ?? 0;
}

export async function hardDeleteAllIdeasForBrand(brandId: number) {
  const db = await getDb(); if (!db) return 0;
  const result = await db.delete(ideas).where(eq(ideas.brandId, brandId));
  return (result as any)[0]?.affectedRows ?? 0;
}

// ─── Platform Schedules ───────────────────────────────────────────────────────
import { platformSchedules, scheduledPosts, InsertPlatformSchedule, InsertScheduledPost } from "../drizzle/schema";

export async function getPlatformSchedules(brandId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(platformSchedules).where(eq(platformSchedules.brandId, brandId));
}

export async function getPlatformSchedule(brandId: number, platform: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(platformSchedules)
    .where(and(eq(platformSchedules.brandId, brandId), eq(platformSchedules.platform, platform)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertPlatformSchedule(brandId: number, platform: string, data: Partial<InsertPlatformSchedule>) {
  const db = await getDb(); if (!db) return;
  const existing = await getPlatformSchedule(brandId, platform);
  if (existing) {
    await db.update(platformSchedules).set({ ...data, updatedAt: new Date() }).where(eq(platformSchedules.id, existing.id));
  } else {
    await db.insert(platformSchedules).values({ brandId, platform, ...data } as InsertPlatformSchedule);
  }
}

// ─── Scheduled Posts ──────────────────────────────────────────────────────────
export async function getScheduledPosts(brandId: number, opts?: { platform?: string; status?: string; from?: Date; to?: Date }) {
  const db = await getDb(); if (!db) return [];
  let q = db.select().from(scheduledPosts).where(eq(scheduledPosts.brandId, brandId));
  return (await q).filter(p => {
    if (opts?.platform && p.platform !== opts.platform) return false;
    if (opts?.status && p.status !== opts.status) return false;
    if (opts?.from && p.scheduledAt < opts.from) return false;
    if (opts?.to && p.scheduledAt > opts.to) return false;
    return true;
  }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

export async function createScheduledPost(data: InsertScheduledPost) {
  const db = await getDb(); if (!db) return null;
  const result = await db.insert(scheduledPosts).values(data);
  return (result as any)[0]?.insertId ?? null;
}

export async function updateScheduledPost(id: number, data: Partial<InsertScheduledPost>) {
  const db = await getDb(); if (!db) return;
  await db.update(scheduledPosts).set({ ...data, updatedAt: new Date() }).where(eq(scheduledPosts.id, id));
}

export async function deleteScheduledPost(id: number) {
  const db = await getDb(); if (!db) return;
  await db.delete(scheduledPosts).where(eq(scheduledPosts.id, id));
}

export async function getDueScheduledPosts() {
  const db = await getDb(); if (!db) return [];
  const now = new Date();
  const rows = await db.select().from(scheduledPosts).where(eq(scheduledPosts.status, "pending"));
  return rows.filter(p => p.scheduledAt <= now);
}
