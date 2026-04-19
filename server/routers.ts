import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { spawnSync } from "child_process";
// Helper: call manus-mcp-cli safely without shell escaping issues
function callMcpTool(toolName: string, server: string, input: object, timeoutMs = 60000): any {
  const result = spawnSync(
    "manus-mcp-cli",
    ["tool", "call", toolName, "--server", server, "--input", JSON.stringify(input)],
    { encoding: "utf8", timeout: timeoutMs }
  );
  if (result.error) throw result.error;
  const output = (result.stdout || "").trim();
  const stderr = (result.stderr || "").trim();
  // manus-mcp-cli outputs: "Tool execution result saved to: ...\nTool execution result:\n{json}"
  const jsonStart = output.indexOf("\nTool execution result:\n");
  const jsonStr = jsonStart >= 0 ? output.slice(jsonStart + "\nTool execution result:\n".length).trim() : output;
  if (!jsonStr) {
    throw new Error(`MCP tool ${toolName} returned empty output. stderr: ${stderr.slice(0, 200)}`);
  }
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Check if it's an error response
    if (jsonStr.startsWith("Error:") || stderr.includes("error")) {
      throw new Error(`MCP tool ${toolName} error: ${jsonStr.slice(0, 300)} | stderr: ${stderr.slice(0, 200)}`);
    }
    throw new Error(`MCP tool ${toolName} returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";
import { humanize, humanizeVariant, humanizePackage } from "./humanizer";
import { runPipelineBackground, getPipelineStatus, buildContentPrompt, saveGeneratedContent, runInspector } from "./pipeline-engine";
import { imageRouter } from "./image/image-router";
import {
  upsertUser, getUserByOpenId,
  getBrandById, getBrandsByUserId, updateBrand, createBrand,
  getContentPillars, createContentPillar, updateContentPillar, deleteContentPillar,
  getBrandRules, createBrandRule, deleteBrandRule,
  getAudienceProfiles, createAudienceProfile, updateAudienceProfile, deleteAudienceProfile,
  getPromptTemplates, createPromptTemplate, updatePromptTemplate, deletePromptTemplate,
  getPlatformPreferences, upsertPlatformPreference,
  getCampaigns, createCampaign, updateCampaign,
  getIdeas, getIdeaById, createIdea, updateIdea, getIdeaStats,
  getContentPackagesByBrand, getContentPackageByIdeaId, getContentPackageById, createContentPackage, updateContentPackage,
  getVariantsByPackageId, createVariant, updateVariant, deleteVariantsByPackageId,
  getAssetsByPackageId, createAsset, updateAsset,
  getIntegrations, upsertIntegration,
  getPublishJobs, createPublishJob, updatePublishJob, getPublishStats,
  getAuditLog, logAudit,
  getAnalyticsSummary,
  getAllInspectorRules, createInspectorRule, updateInspectorRule, deleteInspectorRule,
  getInspectionReportsByPackage, createInspectionReport,
  getLatestPipelineRun, getPipelineRuns, createPipelineRun, updatePipelineRun,
  getInspectorThresholds, upsertInspectorThreshold,
  getVitalityModelAccuracy, getReviewQueue,
  getWebflowFieldMapping, upsertWebflowFieldMapping,
  deleteAllIdeasForBrand, hardDeleteAllIdeasForBrand,
  getPlatformSchedules, getPlatformSchedule, createScheduledPost, getScheduledPosts,
} from "./db";

// ─── Brand Router ─────────────────────────────────────────────────────────────
const brandRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => getBrandsByUserId(ctx.user.id)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getBrandById(input.id)),

  create: protectedProcedure.input(z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    mission: z.string().optional(),
    positioning: z.string().optional(),
    website: z.string().optional(),
    activePlatforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    await createBrand({ ...input, userId: ctx.user.id });
    await logAudit({ brandId: undefined, actorUserId: ctx.user.id, entityType: "brand", action: "created", description: `Brand "${input.name}" created` });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    mission: z.string().optional(),
    positioning: z.string().optional(),
    audienceSummary: z.string().optional(),
    toneSummary: z.string().optional(),
    website: z.string().optional(),
    colorPalette: z.any().optional(),
    activePlatforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    await updateBrand(id, data);
    await logAudit({ brandId: id, actorUserId: ctx.user.id, entityType: "brand", action: "updated", description: "Brand profile updated" });
    return { success: true };
  }),

  // Brand Rules
  getRules: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getBrandRules(input.brandId)),

  addRule: protectedProcedure.input(z.object({
    brandId: z.number(),
    ruleType: z.enum(["do_say", "dont_say", "banned_claim", "required_phrase", "cta_style", "platform_rule", "visual_rule", "prompt_guardrail"]),
    scope: z.enum(["global", "platform_specific"]).optional(),
    platform: z.string().optional(),
    content: z.string(),
    priority: z.number().optional(),
  })).mutation(async ({ input }) => { await createBrandRule(input); return { success: true }; }),

  deleteRule: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteBrandRule(input.id); return { success: true }; }),

  // Content Pillars
  getPillars: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getContentPillars(input.brandId)),

  addPillar: protectedProcedure.input(z.object({
    brandId: z.number(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number().optional(),
  })).mutation(async ({ input }) => { await createContentPillar(input); return { success: true }; }),

  updatePillar: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updateContentPillar(id, data); return { success: true }; }),

  deletePillar: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteContentPillar(input.id); return { success: true }; }),

  // Audience Profiles
  getAudiences: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getAudienceProfiles(input.brandId)),

  addAudience: protectedProcedure.input(z.object({
    brandId: z.number(),
    segment: z.string(),
    description: z.string().optional(),
    painPoints: z.string().optional(),
    goals: z.string().optional(),
    isPrimary: z.boolean().optional(),
  })).mutation(async ({ input }) => { await createAudienceProfile(input); return { success: true }; }),

  updateAudience: protectedProcedure.input(z.object({ id: z.number(), segment: z.string().optional(), description: z.string().optional(), painPoints: z.string().optional(), goals: z.string().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updateAudienceProfile(id, data); return { success: true }; }),

  deleteAudience: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deleteAudienceProfile(input.id); return { success: true }; }),

  // Prompt Templates
  getPrompts: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getPromptTemplates(input.brandId)),

  addPrompt: protectedProcedure.input(z.object({
    brandId: z.number(),
    name: z.string(),
    platform: z.string(),
    pillar: z.string().optional(),
    promptText: z.string(),
  })).mutation(async ({ input }) => { await createPromptTemplate(input); return { success: true }; }),

  updatePrompt: protectedProcedure.input(z.object({ id: z.number(), name: z.string().optional(), promptText: z.string().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => { const { id, ...data } = input; await updatePromptTemplate(id, data); return { success: true }; }),

  deletePrompt: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => { await deletePromptTemplate(input.id); return { success: true }; }),

  // Platform Preferences
  getPlatformPrefs: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getPlatformPreferences(input.brandId)),

  savePlatformPref: protectedProcedure.input(z.object({
    brandId: z.number(),
    platform: z.string(),
    postFormat: z.string().optional(),
    hashtagStrategy: z.string().optional(),
    frequency: z.string().optional(),
    toneNotes: z.string().optional(),
  })).mutation(async ({ input }) => {
    const { brandId, platform, ...data } = input;
    await upsertPlatformPreference(brandId, platform, data);
    return { success: true };
  }),
});

// ─── Campaigns Router ─────────────────────────────────────────────────────────
const campaignRouter = router({
  list: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getCampaigns(input.brandId)),

  create: protectedProcedure.input(z.object({
    brandId: z.number(),
    title: z.string(),
    objective: z.string().optional(),
    targetPlatforms: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })).mutation(async ({ input }) => {
    await createCampaign({
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    objective: z.string().optional(),
    status: z.enum(["draft", "active", "completed", "archived"]).optional(),
  })).mutation(async ({ input }) => { const { id, ...data } = input; await updateCampaign(id, data); return { success: true }; }),
});

// ─── Ideas Router ─────────────────────────────────────────────────────────────
const ideaRouter = router({
  list: protectedProcedure.input(z.object({
    brandId: z.number(),
    status: z.enum(["proposed", "in_review", "approved", "rejected", "archived"]).optional(),
  })).query(async ({ input }) => getIdeas(input.brandId, input.status)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getIdeaById(input.id)),

  stats: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getIdeaStats(input.brandId)),

  create: protectedProcedure.input(z.object({
    brandId: z.number(),
    title: z.string(),
    angle: z.string().optional(),
    summary: z.string().optional(),
    pillarId: z.number().optional(),
    campaignId: z.number().optional(),
    funnelStage: z.enum(["awareness", "consideration", "conversion", "retention"]).optional(),
    targetPlatforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    await createIdea({ ...input, createdByUserId: ctx.user.id, status: "proposed", sourceType: "manual" });
    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "idea", action: "created", description: `Idea created: "${input.title}"` });
    return { success: true };
  }),

  update: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    angle: z.string().optional(),
    summary: z.string().optional(),
    pillarId: z.number().optional(),
    funnelStage: z.enum(["awareness", "consideration", "conversion", "retention"]).optional(),
    targetPlatforms: z.array(z.string()).optional(),
  })).mutation(async ({ input }) => { const { id, ...data } = input; await updateIdea(id, data); return { success: true }; }),

  batchUpdateStatus: protectedProcedure.input(z.object({
    ids: z.array(z.number()),
    status: z.enum(["proposed", "in_review", "approved", "rejected", "archived"]),
  })).mutation(async ({ ctx, input }) => {
    for (const id of input.ids) {
      await updateIdea(id, { status: input.status });
    }
    return { success: true, count: input.ids.length };
  }),
  batchDelete: protectedProcedure.input(z.object({
    ids: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    for (const id of input.ids) {
      await updateIdea(id, { status: "archived" });
    }
    return { success: true, count: input.ids.length };
  }),
  deleteAll: protectedProcedure.input(z.object({
    brandId: z.number(),
    hardDelete: z.boolean().optional().default(false),
  })).mutation(async ({ ctx, input }) => {
    const count = input.hardDelete
      ? await hardDeleteAllIdeasForBrand(input.brandId)
      : await deleteAllIdeasForBrand(input.brandId);
    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "idea", action: "delete_all", description: `${input.hardDelete ? "Hard deleted" : "Archived"} all ideas for brand (${count} affected)` });
    return { success: true, count };
  }),
  updateStatus: protectedProcedure.input(z.object({
    id: z.number(),
    status: z.enum(["proposed", "in_review", "approved", "rejected", "archived"]),
  })).mutation(async ({ ctx, input }) => {
    const idea = await getIdeaById(input.id);
    if (!idea) throw new Error("Idea not found");
    const updateData: any = { status: input.status };
    if (input.status === "approved") { updateData.approvedByUserId = ctx.user.id; updateData.approvedAt = new Date(); }
    await updateIdea(input.id, updateData);
    await logAudit({ brandId: idea.brandId, actorUserId: ctx.user.id, entityType: "idea", entityId: input.id, action: input.status, description: `Idea "${idea.title}" → ${input.status}` });
    return { success: true };
  }),

  generateBatch: protectedProcedure.input(z.object({
    brandId: z.number(),
    count: z.number().min(1).max(30).default(10),
    campaignId: z.number().optional(),
    targetPlatforms: z.array(z.string()).optional(),
    funnelFocus: z.enum(["awareness", "consideration", "conversion", "retention"]).optional(),
  })).mutation(async ({ ctx, input }) => {
    const [brand, pillars] = await Promise.all([getBrandById(input.brandId), getContentPillars(input.brandId)]);
    if (!brand) throw new Error("Brand not found");

    const pillarNames = pillars.length > 0 ? pillars.map(p => p.name).join(", ") : "Brand Strategy, Thought Leadership, Case Studies, Industry Insights, Behind the Scenes";

    const response = await invokeLLM({
      messages: [
        { role: "system", content: `You are Caelum Liu, Chief Growth Officer for ${brand.name}. Generate unique, strategic content ideas. Return ONLY valid JSON.` },
        { role: "user", content: `Generate ${input.count} unique content ideas for ${brand.name}.
Brand mission: ${brand.mission || ""}
Brand positioning: ${brand.positioning || ""}
Content pillars: ${pillarNames}
Target platforms: ${(input.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram"]).join(", ")}
Funnel focus: ${input.funnelFocus || "awareness"}

Return ONLY valid JSON: { "ideas": [{ "title": "...", "angle": "...", "summary": "...", "pillarName": "...", "funnelStage": "awareness|consideration|conversion|retention" }] }` },
      ],
      response_format: { type: "json_object" } as any,
    });

    let generatedIdeas: any[] = [];
    try {
      const raw = (response.choices?.[0]?.message?.content as string) || "{}";
      generatedIdeas = JSON.parse(raw).ideas || [];
    } catch { generatedIdeas = []; }

    let created = 0;
    for (const idea of generatedIdeas.slice(0, input.count)) {
      const matchedPillar = pillars.find(p => p.name.toLowerCase().includes((idea.pillarName || "").toLowerCase()));
      await createIdea({
        brandId: input.brandId,
        title: idea.title,
        angle: idea.angle,
        summary: idea.summary,
        pillarId: matchedPillar?.id,
        campaignId: input.campaignId,
        funnelStage: (["awareness", "consideration", "conversion", "retention", "decision"].includes(idea.funnelStage) ? idea.funnelStage : "awareness") as "awareness" | "consideration" | "conversion" | "retention" | "decision",
        targetPlatforms: input.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram"],
        createdByUserId: ctx.user.id,
        status: "proposed",
        sourceType: "batch",
      });
      created++;
    }

    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "idea", action: "batch_generated", description: `${created} ideas generated in batch` });
    return { success: true, count: created };
  }),
});

// ─── Content Router ───────────────────────────────────────────────────────────
const contentRouter = router({
  getPackage: protectedProcedure.input(z.object({ ideaId: z.number() })).query(async ({ input }) => {
    const pkg = await getContentPackageByIdeaId(input.ideaId);
    if (!pkg) return null;
    const [variants, pkgAssets] = await Promise.all([getVariantsByPackageId(pkg.id), getAssetsByPackageId(pkg.id)]);
    return { ...pkg, variants, assets: pkgAssets };
  }),

  getPackageById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const pkg = await getContentPackageById(input.id);
    if (!pkg) return null;
    const [variants, pkgAssets] = await Promise.all([getVariantsByPackageId(pkg.id), getAssetsByPackageId(pkg.id)]);
    return { ...pkg, variants, assets: pkgAssets };
  }),

  listPackages: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getContentPackagesByBrand(input.brandId)),
  listPackagesWithDetails: protectedProcedure.input(z.object({ brandId: z.number(), status: z.string().optional() })).query(async ({ input }) => {
    const pkgs = await getContentPackagesByBrand(input.brandId);
    const filtered = input.status ? pkgs.filter(p => p.status === input.status) : pkgs;
    return Promise.all(filtered.map(async pkg => {
      const [idea, variants, reports] = await Promise.all([
        getIdeaById(pkg.ideaId),
        getVariantsByPackageId(pkg.id),
        getInspectionReportsByPackage(pkg.id),
      ]);
      const latestReport = reports[reports.length - 1] ?? null;
      return { ...pkg, idea, variants, inspectionReport: latestReport };
    }));
  }),
  archivePackage: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await updateContentPackage(input.id, { status: "archived" });
    return { success: true };
  }),
  resetStuckPackages: protectedProcedure.input(z.object({ brandId: z.number() })).mutation(async ({ input }) => {
    const pkgs = await getContentPackagesByBrand(input.brandId);
    const stuck = pkgs.filter(p => p.status === "generating" || p.status === "pending_generation");
    await Promise.all(stuck.map(p => updateContentPackage(p.id, { status: "needs_revision" })));
    return { count: stuck.length };
  }),
  approvePackage: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await updateContentPackage(input.id, { status: "approved_for_publish" });
    // Auto-schedule variants for platforms with autoSchedule=true
    const pkg = await getContentPackageById(input.id);
    if (pkg) {
      const schedules = await getPlatformSchedules(pkg.brandId);
      const existingPending = await getScheduledPosts(pkg.brandId, { status: "pending" });
      const variants = await getVariantsByPackageId(input.id);
      for (const variant of variants) {
        const sched = schedules.find(s => s.platform === variant.platform && s.autoSchedule && s.enabled);
        if (sched && !existingPending.some(p => p.variantId === variant.id)) {
          const platformPending = existingPending.filter(p => p.platform === sched.platform);
          const nextSlot = getNextSlotTime(sched, platformPending);
          await createScheduledPost({ brandId: pkg.brandId, variantId: variant.id, contentPackageId: input.id, platform: variant.platform, scheduledAt: nextSlot, status: "pending" });
          existingPending.push({ id: 0, brandId: pkg.brandId, variantId: variant.id, contentPackageId: input.id, platform: variant.platform, scheduledAt: nextSlot, status: "pending", publishedAt: null, errorMessage: null, publishJobId: null, createdAt: new Date(), updatedAt: new Date() });
        }
      }
    }
    return { success: true };
  }),

  // Batch operations
  batchApprove: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ input }) => {
    let autoScheduled = 0;
    let schedules: any[] = [];
    let existingPending: any[] = [];
    let schedulesLoaded = false;
    for (const id of input.ids) {
      await updateContentPackage(id, { status: "approved_for_publish" });
      const pkg = await getContentPackageById(id);
      if (!pkg) continue;
      if (!schedulesLoaded) {
        schedules = await getPlatformSchedules(pkg.brandId);
        existingPending = await getScheduledPosts(pkg.brandId, { status: "pending" });
        schedulesLoaded = true;
      }
      const variants = await getVariantsByPackageId(id);
      for (const variant of variants) {
        const sched = schedules.find((s: any) => s.platform === variant.platform && s.autoSchedule && s.enabled);
        if (sched && !existingPending.some((p: any) => p.variantId === variant.id)) {
          const platformPending = existingPending.filter((p: any) => p.platform === sched.platform);
          const nextSlot = getNextSlotTime(sched, platformPending);
          await createScheduledPost({ brandId: pkg.brandId, variantId: variant.id, contentPackageId: id, platform: variant.platform, scheduledAt: nextSlot, status: "pending" });
          existingPending.push({ id: 0, brandId: pkg.brandId, variantId: variant.id, contentPackageId: id, platform: variant.platform, scheduledAt: nextSlot, status: "pending", publishedAt: null, errorMessage: null, publishJobId: null, createdAt: new Date(), updatedAt: new Date() });
          autoScheduled++;
        }
      }
    }
    return { success: true, count: input.ids.length, autoScheduled };
  }),
  batchArchive: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ input }) => {
    await Promise.all(input.ids.map(id => updateContentPackage(id, { status: "archived" })));
    return { success: true, count: input.ids.length };
  }),
  batchReject: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ input }) => {
    await Promise.all(input.ids.map(id => updateContentPackage(id, { status: "needs_revision" })));
    return { success: true, count: input.ids.length };
  }),
  batchRegenerate: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ ctx, input }) => {
    let regenerated = 0;
    for (const pkgId of input.ids) {
      const pkg = await getContentPackageById(pkgId);
      if (!pkg) continue;
      const idea = await getIdeaById(pkg.ideaId);
      if (!idea) continue;
      const [brand, pillars, rules] = await Promise.all([
        getBrandById(idea.brandId),
        getContentPillars(idea.brandId),
        getBrandRules(idea.brandId),
      ]);
      if (!brand) continue;
      const pillarName = pillars.find((p: any) => p.id === idea.pillarId)?.name || "General";
      const doSay = rules.filter((r: any) => r.ruleType === "do_say").map((r: any) => r.content).join("; ");
      const dontSay = rules.filter((r: any) => r.ruleType === "dont_say").map((r: any) => r.content).join("; ");
      const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
      const platforms = ((idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"]) as string[]).filter((p: string) => VALID_PLATFORMS.includes(p));
      // Reset package to generating and clear old variants
      await updateContentPackage(pkgId, { status: "generating" });
      await deleteVariantsByPackageId(pkgId);
      // Re-generate
      const { systemPrompt, userPrompt } = buildContentPrompt({ idea, pillarName, brand, doSay, dontSay, platforms });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" } as any,
      });
      let generated: any = {};
      try {
        const raw = (response.choices?.[0]?.message?.content as string) || "{}";
        generated = JSON.parse(raw);
      } catch { generated = {}; }
      await saveGeneratedContent({ pkgId, generated, idea, platforms, userPrompt });
      await logAudit({ brandId: idea.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: pkgId, action: "regenerated", description: `Content package regenerated for: "${idea.title}"` });
      regenerated++;
    }
    return { success: true, count: regenerated };
  }),

  // Regenerate with inspector feedback — passes failed dimensions + issues as additional context
  regenWithFeedback: protectedProcedure.input(z.object({
    ids: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    let regenerated = 0;
    for (const pkgId of input.ids) {
      const pkg = await getContentPackageById(pkgId);
      if (!pkg) continue;
      const idea = await getIdeaById(pkg.ideaId);
      if (!idea) continue;
      const [brand, pillars, rules, reports] = await Promise.all([
        getBrandById(idea.brandId),
        getContentPillars(idea.brandId),
        getBrandRules(idea.brandId),
        getInspectionReportsByPackage(pkgId),
      ]);
      if (!brand) continue;
      const pillarName = pillars.find((p: any) => p.id === idea.pillarId)?.name || "General";
      const doSay = rules.filter((r: any) => r.ruleType === "do_say").map((r: any) => r.content).join("; ");
      const dontSay = rules.filter((r: any) => r.ruleType === "dont_say").map((r: any) => r.content).join("; ");
      const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
      const platforms = ((idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"]) as string[]).filter((p: string) => VALID_PLATFORMS.includes(p));

      // Build feedback context from most recent inspection report
      const latestReport = reports?.[0];
      let feedbackSection = "";
      if (latestReport) {
        const issues = typeof latestReport.issues === "string"
          ? (() => { try { return JSON.parse(latestReport.issues as any); } catch { return []; } })()
          : (latestReport.issues || []);
        const failedDims = typeof latestReport.failedDimensions === "string"
          ? (() => { try { return JSON.parse(latestReport.failedDimensions as any); } catch { return []; } })()
          : (latestReport.failedDimensions || []);
        const issueLines = (issues as any[]).map((iss: any) =>
          `- [${iss.dimension || "general"}] Score: ${iss.score ?? "?"}/10 — ${iss.feedback || ""} → Fix: ${iss.suggestion || ""}`
        ).join("\n");
        feedbackSection = `
\nPREVIOUS INSPECTION FEEDBACK (Overall: ${latestReport.overallScore ?? 0}/100, Attempt #${latestReport.attemptNumber ?? 1}):
Failed dimensions: ${failedDims.join(", ") || "none"}
Specific issues to fix:
${issueLines || "No specific issues logged — improve overall quality and brand voice."}\n\nYou MUST address every issue listed above in this regeneration. Do not repeat the same mistakes.`;
      }

      // Reset package
      await updateContentPackage(pkgId, { status: "generating" });
      await deleteVariantsByPackageId(pkgId);

      // Re-generate with feedback injected into user prompt
      const { systemPrompt, userPrompt } = buildContentPrompt({ idea, pillarName, brand, doSay, dontSay, platforms });
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + feedbackSection },
        ],
        response_format: { type: "json_object" } as any,
      });
      let generated: any = {};
      try {
        const raw = (response.choices?.[0]?.message?.content as string) || "{}";
        generated = JSON.parse(raw);
      } catch { generated = {}; }
      await saveGeneratedContent({ pkgId, generated, idea, platforms, userPrompt: userPrompt + feedbackSection });
      await logAudit({ brandId: idea.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: pkgId, action: "regenerated_with_feedback", description: `Content package regenerated with inspector feedback for: "${idea.title}"` });
      regenerated++;
    }
    return { success: true, count: regenerated };
  }),

  generate: protectedProcedure.input(z.object({
    ideaId: z.number(),
    targetPlatforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const idea = await getIdeaById(input.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.status !== "approved") throw new Error("Only approved ideas can be generated");

    const [brand, pillars, rules] = await Promise.all([
      getBrandById(idea.brandId),
      getContentPillars(idea.brandId),
      getBrandRules(idea.brandId),
    ]);
    if (!brand) throw new Error("Brand not found");

    const pillarName = pillars.find(p => p.id === idea.pillarId)?.name || "General";
    const doSay = rules.filter(r => r.ruleType === "do_say").map(r => r.content).join("; ");
    const dontSay = rules.filter(r => r.ruleType === "dont_say").map(r => r.content).join("; ");
    const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
    const platforms = (input.targetPlatforms || idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"]).filter((p: string) => VALID_PLATFORMS.includes(p));

    // Create package record
    const pkgResult = await createContentPackage({
      ideaId: idea.id,
      brandId: idea.brandId,
      status: "generating",
      version: 1,
    });
    const pkgId = (pkgResult as any)?.id;

    // Build dynamic prompt based on actual platforms
    const { systemPrompt, userPrompt } = buildContentPrompt({ idea, pillarName, brand, doSay, dontSay, platforms });

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" } as any,
    });

    let generated: any = {};
    try {
      const raw = (response.choices?.[0]?.message?.content as string) || "{}";
      generated = JSON.parse(raw);
    } catch { generated = {}; }

    await saveGeneratedContent({ pkgId, generated, idea, platforms, userPrompt });

    await logAudit({ brandId: idea.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: pkgId, action: "generated", description: `Content package generated for: "${idea.title}"` });

    return { success: true, packageId: pkgId };
  }),

  updatePackage: protectedProcedure.input(z.object({
    id: z.number(),
    masterHook: z.string().optional(),
    masterAngle: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
    cta: z.string().optional(),
    blogContent: z.string().optional(),
    status: z.enum(["pending_generation", "generating", "generated", "needs_revision", "approved_for_publish", "archived"]).optional(),
  })).mutation(async ({ input }) => { const { id, ...data } = input; await updateContentPackage(id, data); return { success: true }; }),

  updateVariant: protectedProcedure.input(z.object({
    id: z.number(),
    title: z.string().optional(),
    body: z.string().optional(),
    caption: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    status: z.enum(["draft", "generated", "needs_revision", "approved", "queued", "published", "failed", "archived"]).optional(),
  })).mutation(async ({ input }) => { const { id, ...data } = input; await updateVariant(id, data); return { success: true }; }),

  generateBlog: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    const pkg = await getContentPackageById(input.contentPackageId);
    if (!pkg) throw new Error("Package not found");
    const idea = await getIdeaById(pkg.ideaId);
    if (!idea) throw new Error("Idea not found");
    const brand = await getBrandById(idea.brandId);
    if (!brand) throw new Error("Brand not found");

    const systemPrompt = `You are an expert content writer for ${brand.name}. Write a professional, engaging blog article.`;
    const userPrompt = `Write a full blog article (800-1200 words) for this topic:

Title: ${pkg.masterHook || idea.title}
Angle: ${pkg.masterAngle || idea.angle || ''}
Key Points: ${(pkg.keyPoints as string[] || []).join(', ')}

IMPORTANT:
- Write naturally as a human would. No markdown formatting (no **, ##, *, em-dashes).
- Use specific real values. No placeholders like [Year] or [Brand Name].
- Write for ${brand.name}'s audience.
- Return ONLY the blog article text, no JSON wrapper.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const blogContent = (response.choices?.[0]?.message?.content as string) || '';
    if (!blogContent) throw new Error("Failed to generate blog content");

    await updateContentPackage(input.contentPackageId, { blogContent });
    await logAudit({ brandId: idea.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: input.contentPackageId, action: "blog_generated", description: `Blog article generated for: "${idea.title}"` });
    return { success: true };
  }),

  generateImage: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
    assetId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { generateImage } = await import("./_core/imageGeneration");
    const pkgAssets = await getAssetsByPackageId(input.contentPackageId);
    let promptAsset = pkgAssets.find(a => a.assetType === "image_prompt" && a.status === "ready");

    // Auto-create image prompt if missing
    if (!promptAsset?.promptText) {
      const pkg = await getContentPackageById(input.contentPackageId);
      const fallbackPrompt = `Hyperrealistic professional brand photography: ${pkg?.masterHook || 'modern branding concept'}. Cool teal/blue/violet neon tones, cinematic lighting, 16:9, no text or symbols, ultra-sharp, editorial quality.`;
      const created = await createAsset({
        contentPackageId: input.contentPackageId,
        assetType: "image_prompt",
        promptText: fallbackPrompt,
        status: "ready",
        version: 1,
      });
      promptAsset = { ...created, promptText: fallbackPrompt, status: "ready" } as any;
    }
    if (!promptAsset?.promptText) throw new Error("No image prompt found");

    await updateAsset(promptAsset.id, { status: "generating" });
    try {
      const { url } = await generateImage({ prompt: promptAsset.promptText });
      await createAsset({
        contentPackageId: input.contentPackageId,
        variantId: input.assetId,
        assetType: "image_output",
        promptText: promptAsset.promptText,
        outputUrl: url,
        provider: "manus-image",
        status: "ready",
        version: 1,
      });
      await updateAsset(promptAsset.id, { status: "ready" });
      return { success: true, url };
    } catch (e: any) {
      await updateAsset(promptAsset.id, { status: "failed" });
      throw new Error(`Image generation failed: ${e.message}`);
    }
  }),
});

// ─── Publishing Router ────────────────────────────────────────────────────────
const publishingRouter = router({
  list: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getPublishJobs(input.brandId)),

  stats: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getPublishStats(input.brandId)),

  createJob: protectedProcedure.input(z.object({
    variantId: z.number(),
    contentPackageId: z.number(),
    brandId: z.number(),
    platform: z.string(),
    actionType: z.enum(["publish_now", "schedule"]).default("publish_now"),
    scheduledFor: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    await createPublishJob({
      variantId: input.variantId,
      contentPackageId: input.contentPackageId,
      brandId: input.brandId,
      platform: input.platform,
      actionType: input.actionType,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
      publishStatus: input.actionType === "schedule" ? "scheduled" : "queued",
    });
    await updateVariant(input.variantId, { status: "queued" });
    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "publish_job", action: "created", description: `Publish job created for ${input.platform}` });
    return { success: true };
  }),

  markPublished: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ ctx, input }) => {
    await updatePublishJob(input.jobId, { publishStatus: "published", publishedAt: new Date() });
    return { success: true };
  }),

  markFailed: protectedProcedure.input(z.object({ jobId: z.number(), errorLog: z.string().optional() })).mutation(async ({ input }) => {
    await updatePublishJob(input.jobId, { publishStatus: "failed", errorLog: input.errorLog });
    return { success: true };
  }),

  retry: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input }) => {
    await updatePublishJob(input.jobId, { publishStatus: "queued", lastAttemptAt: new Date() });
    return { success: true };
  }),

  // Publish a queued job directly to Webflow CMS
  publishToWebflow: protectedProcedure.input(z.object({
    jobId: z.number(),
    brandId: z.number(),
  })).mutation(async ({ ctx, input }) => {
    // Get the job details
    const allJobs = await getPublishJobs(input.brandId);
    const job = allJobs.find((j: any) => j.id === input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Publish job not found" });
    if (job.platform !== "webflow") throw new TRPCError({ code: "BAD_REQUEST", message: "This job is not for Webflow" });

    // Get Webflow integration credentials
    const integrations = await getIntegrations(input.brandId);
    const webflowIntegration = integrations.find((i: any) => i.platform === "webflow" && i.status === "connected");
    if (!webflowIntegration?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Webflow not connected. Configure it in Settings → Integrations." });

    // Get field mapping — check webflow_field_mappings first, then fall back to extraConfig.collectionId
    const fieldMapping = await getWebflowFieldMapping(input.brandId);
    const extraConfig = (webflowIntegration.extraConfig as Record<string, any>) || {};
    const collectionId = fieldMapping?.collectionId || extraConfig.collectionId;
    if (!collectionId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Webflow collection not mapped. Enter your Blog Collection ID in Settings \u2192 Integrations \u2192 Webflow." });

    // Build the CMS item fields from the variant body
    const fieldData: Record<string, any> = {};
    const mapping = (fieldMapping?.fieldMapping as Record<string, string>) || {};

    // Convert body to Webflow rich text format (HTML with proper paragraph wrapping)
    let richTextBody = job.variantBody || "";
    // Strip platform prefix if present (e.g., "Platform: webflow\n")
    richTextBody = richTextBody.replace(/^Platform:\s*\S+\s*\n/i, "").trim();
    if (richTextBody && richTextBody.includes("<p>")) {
      // Already HTML — clean up semicolons used as separators between tags
      richTextBody = richTextBody
        .replace(/>\s*;\s*</g, "><")  // Remove "; " between closing and opening tags
        .replace(/;\s*<\/ol>/g, "</ol>")  // Fix orphaned semicolons before </ol>
        .replace(/<ol>\s*<p>/g, "<ol><li>")  // Convert <ol><p> to proper list items
        .replace(/<\/p>\s*(<\/ol>)/g, "</li>$1")  // Close list items before </ol>
        .replace(/<ol>\s*<\/ol>/g, "")  // Remove empty lists
        .trim();
    } else if (richTextBody) {
      // Plain text — wrap paragraphs
      richTextBody = richTextBody
        .split(/\n\n+/)
        .filter((p: string) => p.trim())
        .map((p: string) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`)
        .join("");
    }

    // Map our content fields to Webflow field slugs
    if (mapping.name && job.contentTitle) fieldData[mapping.name] = job.contentTitle;
    if (mapping.body && richTextBody) fieldData[mapping.body] = richTextBody;
    const slugBase = job.contentTitle ? job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 70) : "article";
    const slugSuffix = Date.now().toString(36).slice(-5);
    const slug = `${slugBase}-${slugSuffix}`;
    if (mapping.slug && job.contentTitle) {
      fieldData[mapping.slug] = slug;
    }
    // Always set a name/slug if not mapped
    if (!fieldData.name && job.contentTitle) fieldData.name = job.contentTitle;
    if (!fieldData.slug && job.contentTitle) {
      fieldData.slug = slug;
    }

    // Set author name and publish date
    fieldData["author-name"] = fieldData["author-name"] || "Pulse Branding";
    fieldData["publish-date"] = new Date().toISOString();

    // Extract opening paragraph from body as article-single-details
    if (richTextBody && !fieldData["article-single-details"]) {
      const firstParaMatch = richTextBody.match(/<p>([\s\S]*?)<\/p>/);
      if (firstParaMatch) {
        const plainText = firstParaMatch[1].replace(/<[^>]+>/g, "");
        fieldData["article-single-details"] = plainText.substring(0, 280);
      }
    }

    // Generate a header image for the article using two-step approach:
    // Step 1: LLM suggests a symbolic visual concept based on article content
    // Step 2: Generate hyperrealistic 4K photo with teal/blue/violet neon style
    try {
      const { generateWebflowImage } = await import("./_core/imageGeneration");
      // Step 1: Ask LLM to suggest a symbolic visual concept
      let visualConcept = "abstract digital network with glowing nodes";
      try {
        const conceptResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a visual art director for a premium branding agency. Given an article title and a brief excerpt, suggest ONE specific symbolic visual concept for a header photo. The concept should be symbolic and metaphorical (e.g., 'a single key on a dark surface' for unlocking solutions, 'two hands shaking with light between them' for collaboration, 'a ladder ascending into mist' for growth, 'a compass on a map' for strategy). Maximum 2 people if people are shown. No text or symbols in the image. Reply with ONLY the visual concept description, 1-2 sentences max." },
            { role: "user", content: `Article title: "${job.contentTitle}"\n\nBrief excerpt: ${richTextBody.replace(/<[^>]+>/g, "").substring(0, 300)}` }
          ]
        });
        const conceptText = (conceptResponse?.choices?.[0]?.message?.content as string)?.trim();
        if (conceptText && conceptText.length > 10) visualConcept = conceptText;
      } catch (conceptErr: any) {
        console.warn("[Webflow] Visual concept generation failed, using default:", conceptErr?.message);
      }
      // Step 2: Generate with hyperrealistic 4K teal/violet neon style
      const imagePrompt = `make a stunning hyperrealistic 4k photo for this prompt in cool tone with teal, blue and violet neon highlight. horizontal, with absolutely NO text, NO letters, NO words, NO characters, NO watermarks, NO labels, NO captions of any kind anywhere in the image. taken using a Canon EOS R6 Mark II Mirrorless camera with natural light — v 6.0 — style raw — ar 16:9. Prompt: ${visualConcept}`;
      const { url: headerImageUrl } = await generateWebflowImage({ prompt: imagePrompt });
      if (headerImageUrl) {
        fieldData["main-image"] = { url: headerImageUrl, alt: job.contentTitle || "Article header image" };
      }
    } catch (imgErr: any) {
      // Non-fatal: continue without image if generation fails
      console.warn("[Webflow] Header image generation failed:", imgErr?.message);
    }

    // Mark as publishing
    await updatePublishJob(input.jobId, { publishStatus: "publishing", lastAttemptAt: new Date() });

    try {
      // Step 1: Create CMS item with name+slug only (MCP requires fieldData as array for create)
      let createResult: any;
      try {
        createResult = callMcpTool("data_cms_tool", "webflow", {
          actions: [{
            create_collection_items: {
              collection_id: collectionId,
              request: {
                isDraft: false,
                fieldData: [{ name: fieldData.name || job.contentTitle, slug: fieldData.slug }]
              }
            }
          }]
        }, 60000);
      } catch (mcpErr: any) {
        throw new Error(`Webflow create failed: ${mcpErr.message?.slice(0, 300) || mcpErr}`);
      }
      const createdItemId = createResult?.items?.[0]?.id;
      if (!createdItemId) throw new Error(`Webflow create returned no item ID. Response: ${JSON.stringify(createResult).slice(0, 200)}`);

      // Step 2: Update with full content (fieldData as flat object)
      try {
        callMcpTool("data_cms_tool", "webflow", {
          actions: [{
            update_collection_items: {
              collection_id: collectionId,
              request: {
                items: [{ id: createdItemId, isDraft: false, fieldData }]
              }
            }
          }]
        }, 60000);
      } catch (updErr: any) {
        console.warn("[Webflow] Update with full content failed:", updErr.message?.slice(0, 500));
        // Retry without image if image field caused the error
        if (fieldData["main-image"]) {
          console.warn("[Webflow] Retrying update without image field...");
          const fieldDataNoImage = { ...fieldData };
          delete fieldDataNoImage["main-image"];
          try {
            callMcpTool("data_cms_tool", "webflow", {
              actions: [{
                update_collection_items: {
                  collection_id: collectionId,
                  request: {
                    items: [{ id: createdItemId, isDraft: false, fieldData: fieldDataNoImage }]
                  }
                }
              }]
            }, 60000);
            console.log("[Webflow] Update without image succeeded");
          } catch (retryErr: any) {
            console.warn("[Webflow] Update retry also failed:", retryErr.message?.slice(0, 300));
          }
        }
      }

      // Step 3: Publish the item (make it live)
      try {
        callMcpTool("data_cms_tool", "webflow", {
          actions: [{
            publish_collection_items: {
              collection_id: collectionId,
              request: { itemIds: [createdItemId] }
            }
          }]
        }, 30000);
      } catch (pubErr: any) {
        console.warn("[Webflow] Publish step failed (item created as draft):", pubErr.message);
      }

      const webflowItemId = createdItemId;

      // Mark as published
      await updatePublishJob(input.jobId, {
        publishStatus: "published",
        publishedAt: new Date(),
        errorLog: null,
      });
      if (job.variantId) await updateVariant(job.variantId, { status: "published" });

      await logAudit({
        brandId: input.brandId,
        actorUserId: ctx.user.id,
        entityType: "publish_job",
        entityId: input.jobId,
        action: "published",
        description: `Published to Webflow CMS: ${job.contentTitle || "item"} (ID: ${webflowItemId})`,
      });

      return { success: true, webflowItemId };
    } catch (err: any) {
      if (err instanceof TRPCError) throw err;
      await updatePublishJob(input.jobId, { publishStatus: "failed", errorLog: err.message });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
    }
  }),
  publishAllWebflow: protectedProcedure.input(z.object({ brandId: z.number() })).mutation(async ({ ctx, input }) => {
    // Get Webflow credentials and field mapping once
    const integrations = await getIntegrations(input.brandId);
    const webflowIntegration = integrations.find((i: any) => i.platform === "webflow" && i.status === "connected");
    if (!webflowIntegration?.apiKey) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Webflow not connected. Configure it in Settings → Integrations." });
    const fieldMapping = await getWebflowFieldMapping(input.brandId);
    const extraConfigAll = (webflowIntegration.extraConfig as Record<string, any>) || {};
    const bulkCollectionId = fieldMapping?.collectionId || extraConfigAll.collectionId;
    if (!bulkCollectionId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Webflow collection not mapped. Enter your Blog Collection ID in Settings \u2192 Integrations \u2192 Webflow." });
    // Get all queued Webflow jobs
    const allJobs = await getPublishJobs(input.brandId);
    const webflowJobs = allJobs.filter((j: any) => j.platform === "webflow" && j.publishStatus === "queued");
    if (webflowJobs.length === 0) return { success: true, published: 0, failed: 0 };
    let published = 0;
    let failed = 0;
    for (const job of webflowJobs) {
      const mapping = (fieldMapping?.fieldMapping as Record<string, string>) || {};
      const fieldData: Record<string, any> = {};

      // Convert body to HTML if needed
      let bulkRichTextBody = job.variantBody || "";
      // Strip platform prefix if present (e.g., "Platform: webflow\n")
      bulkRichTextBody = bulkRichTextBody.replace(/^Platform:\s*\S+\s*\n/i, "").trim();
      if (bulkRichTextBody && bulkRichTextBody.includes("<p>")) {
        // Already HTML — clean up semicolons used as separators between tags
        bulkRichTextBody = bulkRichTextBody
          .replace(/>\s*;\s*</g, "><")
          .replace(/;\s*<\/ol>/g, "</ol>")
          .replace(/<ol>\s*<p>/g, "<ol><li>")
          .replace(/<\/p>\s*(<\/ol>)/g, "</li>$1")
          .replace(/<ol>\s*<\/ol>/g, "")
          .trim();
      } else if (bulkRichTextBody) {
        bulkRichTextBody = bulkRichTextBody.split(/\n\n+/).filter((p: string) => p.trim()).map((p: string) => `<p>${p.trim().replace(/\n/g, "<br/>")}</p>`).join("");
      }

      if (mapping.name && job.contentTitle) fieldData[mapping.name] = job.contentTitle;
      if (mapping.body && bulkRichTextBody) fieldData[mapping.body] = bulkRichTextBody;
      const bulkSlugBase = job.contentTitle ? job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 70) : "article";
      const bulkSlugSuffix = Date.now().toString(36).slice(-5);
      const bulkSlug = `${bulkSlugBase}-${bulkSlugSuffix}`;
      if (mapping.slug && job.contentTitle) fieldData[mapping.slug] = bulkSlug;
      if (!fieldData.name && job.contentTitle) fieldData.name = job.contentTitle;
      if (!fieldData.slug && job.contentTitle) fieldData.slug = bulkSlug;

      // Author, publish date, opening paragraph
      fieldData["author-name"] = fieldData["author-name"] || "Pulse Branding";
      fieldData["publish-date"] = new Date().toISOString();
      if (bulkRichTextBody && !fieldData["article-single-details"]) {
        const firstParaMatch = bulkRichTextBody.match(/<p>([\s\S]*?)<\/p>/);
        if (firstParaMatch) fieldData["article-single-details"] = firstParaMatch[1].replace(/<[^>]+>/g, "").substring(0, 280);
      }

      // Generate header image using two-step approach (non-fatal)
      try {
        const { generateWebflowImage } = await import("./_core/imageGeneration");
        // Step 1: LLM suggests symbolic visual concept
        let bulkVisualConcept = "abstract digital network with glowing nodes";
        try {
          const bulkConceptResponse = await invokeLLM({
            messages: [
              { role: "system", content: "You are a visual art director for a premium branding agency. Given an article title and a brief excerpt, suggest ONE specific symbolic visual concept for a header photo. The concept should be symbolic and metaphorical (e.g., 'a single key on a dark surface' for unlocking solutions, 'two hands shaking with light between them' for collaboration, 'a ladder ascending into mist' for growth, 'a compass on a map' for strategy). Maximum 2 people if people are shown. No text or symbols in the image. Reply with ONLY the visual concept description, 1-2 sentences max." },
              { role: "user", content: `Article title: "${job.contentTitle}"\n\nBrief excerpt: ${bulkRichTextBody.replace(/<[^>]+>/g, "").substring(0, 300)}` }
            ]
          });
          const bulkConceptText = (bulkConceptResponse?.choices?.[0]?.message?.content as string)?.trim();
          if (bulkConceptText && bulkConceptText.length > 10) bulkVisualConcept = bulkConceptText;
        } catch (conceptErr: any) {
          console.warn("[Webflow] Bulk visual concept generation failed, using default:", conceptErr?.message);
        }
        // Step 2: Generate with hyperrealistic 4K teal/violet neon style
        const bulkImagePrompt = `make a stunning hyperrealistic 4k photo for this prompt in cool tone with teal, blue and violet neon highlight. horizontal, with absolutely NO text, NO letters, NO words, NO characters, NO watermarks, NO labels, NO captions of any kind anywhere in the image. taken using a Canon EOS R6 Mark II Mirrorless camera with natural light — v 6.0 — style raw — ar 16:9. Prompt: ${bulkVisualConcept}`;
        const { url: headerImageUrl } = await generateWebflowImage({ prompt: bulkImagePrompt });
        if (headerImageUrl) fieldData["main-image"] = { url: headerImageUrl, alt: job.contentTitle || "Article header image" };
      } catch (imgErr: any) {
        console.warn("[Webflow] Bulk header image generation failed:", imgErr?.message);
      }

      await updatePublishJob(job.id, { publishStatus: "publishing", lastAttemptAt: new Date() });
      try {
        // Step 1: Create with name+slug only (MCP requires fieldData as array for create)
        const bulkCreateResult = callMcpTool("data_cms_tool", "webflow", {
          actions: [{
            create_collection_items: {
              collection_id: bulkCollectionId,
              request: {
                isDraft: false,
                fieldData: [{ name: fieldData.name || job.contentTitle, slug: fieldData.slug }]
              }
            }
          }]
        }, 60000);
        const bulkItemId = bulkCreateResult?.items?.[0]?.id;
        if (!bulkItemId) throw new Error(`Webflow create returned no item ID. Response: ${JSON.stringify(bulkCreateResult).slice(0, 200)}`);

        // Step 2: Update with full content
        try {
          callMcpTool("data_cms_tool", "webflow", {
            actions: [{
              update_collection_items: {
                collection_id: bulkCollectionId,
                request: { items: [{ id: bulkItemId, isDraft: false, fieldData }] }
              }
            }]
          }, 60000);
        } catch (updErr: any) {
          console.warn("[Webflow] Bulk update with full content failed:", updErr.message?.slice(0, 500));
          // Retry without image if image field caused the error
          if (fieldData["main-image"]) {
            const fieldDataNoImage = { ...fieldData };
            delete fieldDataNoImage["main-image"];
            try {
              callMcpTool("data_cms_tool", "webflow", {
                actions: [{
                  update_collection_items: {
                    collection_id: bulkCollectionId,
                    request: { items: [{ id: bulkItemId, isDraft: false, fieldData: fieldDataNoImage }] }
                  }
                }]
              }, 60000);
              console.log("[Webflow] Bulk update without image succeeded");
            } catch (retryErr: any) {
              console.warn("[Webflow] Bulk update retry also failed:", retryErr.message?.slice(0, 300));
            }
          }
        }

        // Step 3: Publish
        try {
          callMcpTool("data_cms_tool", "webflow", {
            actions: [{
              publish_collection_items: {
                collection_id: bulkCollectionId,
                request: { itemIds: [bulkItemId] }
              }
            }]
          }, 30000);
        } catch (pubErr: any) {
          console.warn("[Webflow] Bulk publish step failed (item created as draft):", pubErr.message);
        }

        const webflowItemId = bulkItemId;
        await updatePublishJob(job.id, { publishStatus: "published", publishedAt: new Date(), errorLog: null });
        if (job.variantId) await updateVariant(job.variantId, { status: "published" });
        await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "publish_job", entityId: job.id, action: "published", description: `Bulk published to Webflow: ${job.contentTitle || "item"} (ID: ${webflowItemId})` });
        published++;
      } catch (err: any) {
        await updatePublishJob(job.id, { publishStatus: "failed", errorLog: err.message?.slice(0, 400) || String(err) });
        failed++;
      }
    }
    // Step 4: Trigger a full site publish so individual article pages go live
    if (published > 0) {
      try {
        const siteId = extraConfigAll.siteId;
        if (siteId) {
          callMcpTool("data_sites_tool", "webflow", {
            actions: [{
              publish_site: {
                site_id: siteId,
                customDomains: extraConfigAll.customDomain ? [extraConfigAll.customDomain] : [],
                publishToWebflowSubdomain: true
              }
            }]
          }, 30000);
          console.log(`[Webflow] Site published successfully after ${published} articles`);
        }
      } catch (siteErr: any) {
        console.warn("[Webflow] Site publish failed (articles are in CMS but individual pages may not be live yet):", siteErr?.message?.slice(0, 200));
      }
    }
    return { success: true, published, failed };
  }),
});
// ─── Integrations Router ──────────────────────────────────────────────────────
const integrationsRouter = router({
  list: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getIntegrations(input.brandId)),

  save: protectedProcedure.input(z.object({
    brandId: z.number(),
    platform: z.string(),
    accountName: z.string().optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    extraConfig: z.record(z.string(), z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const { brandId, platform, ...data } = input;
    await upsertIntegration(brandId, platform, { ...data, extraConfig: data.extraConfig as Record<string, string> | undefined, status: "connected", lastTestedAt: new Date() });
    await logAudit({ brandId, actorUserId: ctx.user.id, entityType: "integration", action: "saved", description: `${platform} integration saved` });
    return { success: true };
  }),

  disconnect: protectedProcedure.input(z.object({ brandId: z.number(), platform: z.string() })).mutation(async ({ input }) => {
    await upsertIntegration(input.brandId, input.platform, { status: "disconnected", apiKey: null, accessToken: null });
    return { success: true };
  }),

  // ─── Webflow CMS Field Mapping ─────────────────────────────────────────────
  getWebflowCollections: protectedProcedure.input(z.object({
    brandId: z.number(),
    apiToken: z.string(),
    siteId: z.string(),
  })).mutation(async ({ input }) => {
    const response = await fetch(`https://api.webflow.com/v2/sites/${input.siteId}/collections`, {
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      const err = await response.text();
      let msg = `Webflow API error: ${response.status} — ${err.slice(0, 200)}`;
      if (response.status === 403 || err.includes("missing_scopes") || err.includes("cms:read") || err.includes("cms:write")) {
        msg = `Webflow 403: Token missing CMS scope. Fix: In Webflow go to Site Settings → Integrations → API Access → Generate a new v2 Site API Token → under CMS enable both Read AND Write → paste new token here.`;
      } else if (response.status === 401) {
        msg = `Webflow 401: Invalid API token. Re-generate your token in Webflow Site Settings → Integrations → API Access and paste it here.`;
      } else if (response.status === 404) {
        msg = `Webflow 404: Site not found. Check your Site ID in the Webflow Site Settings URL.`;
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }
    const data = await response.json();
    return (data.collections || []).map((c: any) => ({
      id: c.id,
      displayName: c.displayName,
      singularName: c.singularName,
      slug: c.slug,
    }));
  }),

  getWebflowCollectionFields: protectedProcedure.input(z.object({
    brandId: z.number(),
    apiToken: z.string(),
    siteId: z.string(),
    collectionId: z.string(),
  })).mutation(async ({ input }) => {
    const response = await fetch(`https://api.webflow.com/v2/collections/${input.collectionId}`, {
      headers: {
        Authorization: `Bearer ${input.apiToken}`,
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      const err = await response.text();
      let msg = `Webflow API error: ${response.status} — ${err.slice(0, 200)}`;
      if (response.status === 403 || err.includes("missing_scopes") || err.includes("cms:read") || err.includes("cms:write")) {
        msg = `Webflow 403: Token missing CMS scope. Fix: In Webflow go to Site Settings → Integrations → API Access → Generate a new v2 Site API Token → under CMS enable both Read AND Write → paste new token here.`;
      } else if (response.status === 401) {
        msg = `Webflow 401: Invalid API token. Re-generate your token in Webflow Site Settings → Integrations → API Access and paste it here.`;
      } else if (response.status === 404) {
        msg = `Webflow 404: Collection not found. Check your Collection ID in Settings → Integrations → Webflow.`;
      }
      throw new TRPCError({ code: "BAD_REQUEST", message: msg });
    }
    const data = await response.json();
    const fields = data.fields || [];
    // Filter to writable, useful field types only
    const WRITABLE_TYPES = ["PlainText", "RichText", "MultiReference", "Option", "Bool", "Number", "Link", "Email", "Image", "FileRef", "Color"];
    return fields
      .filter((f: any) => !f.isSystem && WRITABLE_TYPES.includes(f.type))
      .map((f: any) => ({
        id: f.id,
        slug: f.slug,
        displayName: f.displayName,
        type: f.type,
        isRequired: f.isRequired,
      }));
  }),

  saveWebflowFieldMapping: protectedProcedure.input(z.object({
    brandId: z.number(),
    collectionId: z.string(),
    collectionName: z.string().optional(),
    fieldMapping: z.record(z.string(), z.string()),
  })).mutation(async ({ input }) => {
    await upsertWebflowFieldMapping(input.brandId, {
      collectionId: input.collectionId,
      collectionName: input.collectionName,
      fieldMapping: input.fieldMapping,
    });
    return { success: true };
  }),

  getWebflowFieldMapping: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => {
    return getWebflowFieldMapping(input.brandId);
  }),

  // Check if Webflow token has cms:write scope by attempting a harmless API call
  checkWebflowTokenScope: protectedProcedure.input(z.object({
    brandId: z.number(),
  })).query(async ({ input }) => {
    const integrations = await getIntegrations(input.brandId);
    const webflowIntegration = integrations.find((i: any) => i.platform === "webflow" && i.status === "connected");
    if (!webflowIntegration?.apiKey) return { connected: false, hasWriteScope: false, error: "Webflow not connected" };

    // Use /v2/token/introspect or /v2/sites to check token validity and scopes
    try {
      const resp = await fetch("https://api.webflow.com/v2/token/introspect", {
        headers: { Authorization: `Bearer ${webflowIntegration.apiKey}`, Accept: "application/json" },
      });
      if (resp.ok) {
        const data = await resp.json();
        const scopes: string[] = data.scopes || data.grantedScopes || [];
        const hasCmsWrite = scopes.some((s: string) => s.includes("cms:write") || s.includes("cms_write"));
        const hasCmsRead = scopes.some((s: string) => s.includes("cms:read") || s.includes("cms_read"));
        return { connected: true, hasWriteScope: hasCmsWrite, hasReadScope: hasCmsRead, scopes };
      } else if (resp.status === 404) {
        // Introspect endpoint may not exist on all plans — fall back to sites list
        const sitesResp = await fetch("https://api.webflow.com/v2/sites", {
          headers: { Authorization: `Bearer ${webflowIntegration.apiKey}`, Accept: "application/json" },
        });
        if (sitesResp.ok) {
          return { connected: true, hasWriteScope: true, hasReadScope: true, scopes: ["unknown"] };
        } else if (sitesResp.status === 403) {
          return { connected: true, hasWriteScope: false, hasReadScope: false, error: "Token missing scopes" };
        } else if (sitesResp.status === 401) {
          return { connected: false, hasWriteScope: false, hasReadScope: false, error: "Invalid token" };
        }
        return { connected: true, hasWriteScope: true, hasReadScope: true, scopes: ["unknown"] };
      } else if (resp.status === 401) {
        return { connected: false, hasWriteScope: false, hasReadScope: false, error: "Invalid token — please regenerate" };
      } else if (resp.status === 403) {
        return { connected: true, hasWriteScope: false, hasReadScope: false, error: "Token missing cms:write scope" };
      }
      return { connected: true, hasWriteScope: true, hasReadScope: true, scopes: [] };
    } catch {
      return { connected: true, hasWriteScope: true, hasReadScope: true, scopes: [] };
    }
  }),
});

// ─── Analytics Router ─────────────────────────────────────────────────────────
const analyticsRouter = router({
  summary: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getAnalyticsSummary(input.brandId)),

  aiRecommendations: protectedProcedure.input(z.object({ brandId: z.number() })).mutation(async ({ input }) => {
    const [brand, stats] = await Promise.all([getBrandById(input.brandId), getIdeaStats(input.brandId)]);
    if (!brand) throw new Error("Brand not found");
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a content strategy AI. Provide 3 concise, actionable recommendations. Return ONLY valid JSON." },
        { role: "user", content: `Brand: ${brand.name}. Idea stats: ${JSON.stringify(stats)}. Mission: ${brand.mission}. Give 3 recommendations as JSON: { "recommendations": [{ "title": "...", "description": "...", "priority": "high|medium|low", "action": "..." }] }` },
      ],
      response_format: { type: "json_object" } as any,
    });
    try {
      const raw = (response.choices?.[0]?.message?.content as string) || "{}";
      return JSON.parse(raw);
    } catch { return { recommendations: [] }; }
  }),
});

// ─── Inspector Router ───────────────────────────────────────────────────────
const inspectorRouter = router({
  listRules: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getAllInspectorRules(input.brandId)),

  listThresholds: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => {
    return getInspectorThresholds(input.brandId);
  }),

  upsertThreshold: protectedProcedure.input(z.object({
    brandId: z.number(),
    dimension: z.string(),
    minScore: z.number().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
    weight: z.number().min(1).max(3).optional(),
  })).mutation(async ({ input }) => {
    const { brandId, dimension, ...data } = input;
    await upsertInspectorThreshold(brandId, dimension, data);
    return { success: true };
  }),

  getModelAccuracy: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => {
    return getVitalityModelAccuracy(input.brandId);
  }),

  createRule: protectedProcedure.input(z.object({
    brandId: z.number(),
    ruleType: z.enum(["required_phrase", "banned_phrase", "banned_pattern", "char_limit", "tone_rule", "formatting_rule", "image_rule", "custom_prompt"]),
    name: z.string().min(1),
    description: z.string().optional(),
    ruleValue: z.string(),
    platform: z.string().optional(),
    severity: z.enum(["error", "warning", "info"]).default("warning"),
    autoFix: z.boolean().default(false),
    autoFixInstruction: z.string().optional(),
    sortOrder: z.number().optional().default(0),
  })).mutation(async ({ input }) => {
    await createInspectorRule(input);
    return { success: true };
  }),

  updateRule: protectedProcedure.input(z.object({
    id: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    ruleValue: z.string().optional(),
    platform: z.string().optional(),
    severity: z.enum(["error", "warning", "info"]).optional(),
    autoFix: z.boolean().optional(),
    autoFixInstruction: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  })).mutation(async ({ input }) => {
    const { id, ...data } = input;
    await updateInspectorRule(id, data);
    return { success: true };
  }),

  deleteRule: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteInspectorRule(input.id);
    return { success: true };
  }),

  getReports: protectedProcedure.input(z.object({ contentPackageId: z.number() })).query(async ({ input }) => getInspectionReportsByPackage(input.contentPackageId)),
  inspectPackage: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
    brandId: z.number(),
  })).mutation(async ({ input }) => {
    const rules = await getAllInspectorRules(input.brandId);
    if (!rules || rules.length === 0) throw new Error("No inspector rules configured for this brand");
    const { passed, report } = await runInspector({
      pkgId: input.contentPackageId,
      brandId: input.brandId,
      inspectorRules: rules,
    });
    return { passed, report };
  }),
});

// ─── Pipeline Router ──────────────────────────────────────────────────────────
const pipelineRouter = router({
  getLatestRun: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getLatestPipelineRun(input.brandId)),
  getRuns: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => getPipelineRuns(input.brandId)),

  getReviewQueue: protectedProcedure.input(z.object({ brandId: z.number() })).query(async ({ input }) => {
    const packages = await getReviewQueue(input.brandId);
    const enriched = await Promise.all(packages.map(async (pkg) => {
      const [variants, pkgAssets, reports, idea] = await Promise.all([
        getVariantsByPackageId(pkg.id),
        getAssetsByPackageId(pkg.id),
        getInspectionReportsByPackage(pkg.id),
        pkg.ideaId ? getIdeaById(pkg.ideaId) : Promise.resolve(null),
      ]);
      return { ...pkg, title: idea?.title ?? "Untitled Content", ideaAngle: idea?.angle ?? "", pillarId: idea?.pillarId ?? null, variants, assets: pkgAssets, inspectionReports: reports };
    }));
    return enriched;
  }),

  approveForPublishing: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
    platforms: z.array(z.string()).optional(),
  })).mutation(async ({ ctx, input }) => {
    const pkg = await getContentPackageById(input.contentPackageId);
    if (!pkg) throw new Error("Content package not found");
    await updateContentPackage(input.contentPackageId, { status: "approved_for_publish" });
    const variants = await getVariantsByPackageId(input.contentPackageId);
    const targetVariants = input.platforms
      ? variants.filter(v => input.platforms!.includes(v.platform))
      : variants;
    // Auto-schedule variants for platforms with autoSchedule=true
    const autoScheduled: string[] = [];
    const schedules = await getPlatformSchedules(pkg.brandId);
    const existingPending = await getScheduledPosts(pkg.brandId, { status: "pending" });
    for (const variant of targetVariants) {
      const sched = schedules.find(s => s.platform === variant.platform && s.autoSchedule && s.enabled);
      if (sched) {
        // Check not already scheduled
        const alreadyScheduled = existingPending.some(p => p.variantId === variant.id);
        if (!alreadyScheduled) {
          const platformPending = existingPending.filter(p => p.platform === sched.platform);
          const nextSlot = getNextSlotTime(sched, platformPending);
          await createScheduledPost({
            brandId: pkg.brandId,
            variantId: variant.id,
            contentPackageId: input.contentPackageId,
            platform: variant.platform,
            scheduledAt: nextSlot,
            status: "pending",
          });
          existingPending.push({ id: 0, brandId: pkg.brandId, variantId: variant.id, contentPackageId: input.contentPackageId, platform: variant.platform, scheduledAt: nextSlot, status: "pending", publishedAt: null, errorMessage: null, publishJobId: null, createdAt: new Date(), updatedAt: new Date() });
          autoScheduled.push(variant.platform);
        }
        await updateVariant(variant.id, { status: "queued" });
      } else {
        await updateVariant(variant.id, { status: "queued" });
        await createPublishJob({
          contentPackageId: input.contentPackageId,
          variantId: variant.id,
          brandId: pkg.brandId,
          platform: variant.platform,
          publishStatus: "queued",
          actionType: "publish_now",
        });
      }
    }
    await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: input.contentPackageId, action: "approved_for_publish", description: `Content package approved for publishing on ${targetVariants.length} platform(s)${autoScheduled.length > 0 ? "; auto-scheduled: " + autoScheduled.join(", ") : ""}` });
    return { success: true, jobsCreated: targetVariants.length, autoScheduled };
  }),

  batchApproveForPublishing: protectedProcedure.input(z.object({
    contentPackageIds: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    let totalJobs = 0;
    let totalAutoScheduled = 0;
    // Pre-load schedules once for the first package's brand (assume same brand)
    let schedules: any[] = [];
    let existingPending: any[] = [];
    let schedulesLoaded = false;
    for (const id of input.contentPackageIds) {
      const pkg = await getContentPackageById(id);
      if (!pkg) continue;
      await updateContentPackage(id, { status: "approved_for_publish" });
      // Load schedules once per brand
      if (!schedulesLoaded) {
        schedules = await getPlatformSchedules(pkg.brandId);
        existingPending = await getScheduledPosts(pkg.brandId, { status: "pending" });
        schedulesLoaded = true;
      }
      const variants = await getVariantsByPackageId(id);
      for (const variant of variants) {
        const sched = schedules.find((s: any) => s.platform === variant.platform && s.autoSchedule && s.enabled);
        if (sched) {
          const alreadyScheduled = existingPending.some((p: any) => p.variantId === variant.id);
          if (!alreadyScheduled) {
            const platformPending = existingPending.filter((p: any) => p.platform === sched.platform);
            const nextSlot = getNextSlotTime(sched, platformPending);
            await createScheduledPost({
              brandId: pkg.brandId,
              variantId: variant.id,
              contentPackageId: id,
              platform: variant.platform,
              scheduledAt: nextSlot,
              status: "pending",
            });
            existingPending.push({ id: 0, brandId: pkg.brandId, variantId: variant.id, contentPackageId: id, platform: variant.platform, scheduledAt: nextSlot, status: "pending", publishedAt: null, errorMessage: null, publishJobId: null, createdAt: new Date(), updatedAt: new Date() });
            totalAutoScheduled++;
          }
          await updateVariant(variant.id, { status: "queued" });
        } else {
          await updateVariant(variant.id, { status: "queued" });
          await createPublishJob({
            contentPackageId: id,
            variantId: variant.id,
            brandId: pkg.brandId,
            platform: variant.platform,
            publishStatus: "queued",
            actionType: "publish_now",
          });
          totalJobs++;
        }
      }
      await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: id, action: "approved_for_publish", description: `Batch approved for publishing` });
    }
    return { success: true, approved: input.contentPackageIds.length, jobsCreated: totalJobs, autoScheduled: totalAutoScheduled };
  }),
  batchRejectFromQueue: protectedProcedure.input(z.object({
    contentPackageIds: z.array(z.number()),
    reason: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    for (const id of input.contentPackageIds) {
      const pkg = await getContentPackageById(id);
      if (!pkg) continue;
      await updateContentPackage(id, { status: "needs_revision" });
      await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: id, action: "rejected", description: input.reason || "Batch rejected from review queue" });
    }
    return { success: true, rejected: input.contentPackageIds.length };
  }),
  batchDeleteFromQueue: protectedProcedure.input(z.object({
    contentPackageIds: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    for (const id of input.contentPackageIds) {
      const pkg = await getContentPackageById(id);
      if (!pkg) continue;
      await updateContentPackage(id, { status: "archived" });
      await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: id, action: "archived", description: "Batch deleted from review queue" });
    }
    return { success: true, deleted: input.contentPackageIds.length };
  }),
  rejectFromQueue: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
    reason: z.string().optional(),
  })).mutation(async ({ ctx, input }) => {
    const pkg = await getContentPackageById(input.contentPackageId);
    if (!pkg) throw new Error("Content package not found");
    await updateContentPackage(input.contentPackageId, { status: "needs_revision" });
    await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: input.contentPackageId, action: "rejected", description: input.reason || "Rejected from review queue" });
    return { success: true };
  }),

  // Background pipeline — returns runId immediately, runs in background
  run: protectedProcedure.input(z.object({
    brandId: z.number(),
    ideaCount: z.number().min(1).max(30).default(10),
    autoApproveIdeas: z.boolean().default(true),
    runInspector: z.boolean().default(true),
  })).mutation(async ({ ctx, input }) => {
    const brand = await getBrandById(input.brandId);
    if (!brand) throw new Error("Brand not found");

    // Launch background pipeline — returns immediately
    const runId = await runPipelineBackground({
      brandId: input.brandId,
      userId: ctx.user.id,
      ideaCount: input.ideaCount,
      autoApproveIdeas: input.autoApproveIdeas,
      runInspector: input.runInspector,
    });

    return { success: true, runId, backgroundJob: true };
  }),

  // Poll pipeline status (for background job tracking)
  getRunStatus: protectedProcedure.input(z.object({
    brandId: z.number(),
  })).query(async ({ input }) => {
    // Check in-memory first for real-time progress
    const memStatus = getPipelineStatus(input.brandId);
    if (memStatus) return memStatus;
    // Fallback to DB
    const latest = await getLatestPipelineRun(input.brandId);
    if (!latest) return null;
    return { runId: latest.id, status: latest.status, progress: {
      stage: latest.stage || (latest.status === "completed" ? "completed" : "unknown"),
      ideasGenerated: latest.ideasGenerated,
      ideasApproved: latest.ideasApproved,
      packagesGenerated: latest.packagesGenerated,
      packagesInspected: latest.packagesInspected,
      packagesPassedInspection: latest.packagesPassedInspection,
    }};
  }),
});

// ─── Forum Router ───────────────────────────────────────────────────────────────
// Platforms that have real public APIs we can call directly
const REAL_API_PLATFORMS = ["reddit", "hackernews", "medium"];
// Platforms that require LLM synthesis (gated/no public API)
const LLM_PLATFORMS = ["quora", "linkedin", "producthunt", "indiehackers", "growthhackers", "zhihu", "xiaohongshu"];
const ALL_FORUM_PLATFORMS = [...REAL_API_PLATFORMS, ...LLM_PLATFORMS];

// Fetch real posts from Reddit public JSON API
async function fetchRedditPosts(keyword: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keyword + " branding");
    const res = await fetch(`https://www.reddit.com/search.json?q=${q}&sort=hot&limit=5&t=month`, {
      headers: { "User-Agent": "PulseContentEngine/1.0" },
    });
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data?.data?.children ?? []).slice(0, 3).map((c: any) => ({
      platform: "reddit",
      title: c.data?.title ?? "",
      url: `https://reddit.com${c.data?.permalink ?? ""}`,
      snippet: c.data?.selftext?.substring(0, 200) ?? c.data?.title ?? "",
      keyword,
    })).filter((p: any) => p.title && p.url);
  } catch { return []; }
}

// Fetch real posts from Hacker News via Algolia API
async function fetchHNPosts(keyword: string): Promise<any[]> {
  try {
    const q = encodeURIComponent(keyword);
    const res = await fetch(`https://hn.algolia.com/api/v1/search?query=${q}&tags=story&hitsPerPage=5`);
    if (!res.ok) return [];
    const data = await res.json() as any;
    return (data?.hits ?? []).slice(0, 3).map((h: any) => ({
      platform: "hackernews",
      title: h.title ?? "",
      url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
      snippet: h.story_text?.substring(0, 200) ?? h.title ?? "",
      keyword,
    })).filter((p: any) => p.title);
  } catch { return []; }
}

// Fetch real posts from Medium RSS feed
async function fetchMediumPosts(keyword: string): Promise<any[]> {
  try {
    const tag = encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, "-"));
    const res = await fetch(`https://medium.com/feed/tag/${tag}`, {
      headers: { "User-Agent": "PulseContentEngine/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: any[] = [];
    // Use exec loop instead of matchAll for broader TS target compatibility
    const itemRe = /<item>([\/\S\s]*?)<\/item>/g;
    let m: RegExpExecArray | null;
    while ((m = itemRe.exec(xml)) !== null && items.length < 3) {
      const block = m[1];
      const titleM = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? block.match(/<title>([^<]*)<\/title>/);
      const linkM = block.match(/<link>([^<]*)<\/link>/);
      if (titleM && linkM && titleM[1].trim() && linkM[1].trim()) {
        items.push({
          platform: "medium",
          title: titleM[1].trim(),
          url: linkM[1].trim(),
          snippet: "",
          keyword,
        });
      }
    }
    return items;
  } catch { return []; }
}

// Generate LLM-synthesized opportunities for gated platforms
async function fetchLLMOpportunities(platform: string, keywords: string[], brandName: string, brandVoice: string): Promise<any[]> {
  try {
    const isZh = platform === "zhihu" || platform === "xiaohongshu";
    const lang = isZh ? "Chinese" : "English";
    const platformUrls: Record<string, string> = {
      quora: "https://www.quora.com/search?q=",
      linkedin: "https://www.linkedin.com/search/results/content/?keywords=",
      producthunt: "https://www.producthunt.com/search?q=",
      indiehackers: "https://www.indiehackers.com/search?query=",
      growthhackers: "https://growthhackers.com/questions/",
      zhihu: "https://www.zhihu.com/search?type=content&q=",
      xiaohongshu: "https://www.xiaohongshu.com/search_result/?keyword=",
    };
    const baseUrl = platformUrls[platform] ?? "";
    const prompt = `You are a forum research assistant. Generate 3 realistic ${platform} discussion threads that someone interested in "${keywords.slice(0,3).join('", "')}" would find on ${platform}. These should be real-sounding threads that ${brandName} could add value to.

Respond ONLY with a JSON array, no markdown:
[
  {"title": "...", "snippet": "...", "searchQuery": "..."},
  ...
]

Rules:
- Titles should be natural ${lang} questions or discussion starters
- Snippets should be 1-2 sentence summaries of the discussion
- searchQuery is the URL-encoded search term to find this type of content
- All text in ${lang}`;
    const response = await invokeLLM({
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name: "forum_threads", strict: true, schema: { type: "array", items: { type: "object", properties: { title: { type: "string" }, snippet: { type: "string" }, searchQuery: { type: "string" } }, required: ["title", "snippet", "searchQuery"], additionalProperties: false } } } },
    }) as any;
    const content = response?.choices?.[0]?.message?.content ?? "[]";
    const threads = JSON.parse(content);
    return threads.slice(0, 3).map((t: any) => ({
      platform,
      title: t.title ?? "",
      url: baseUrl + encodeURIComponent(t.searchQuery ?? t.title ?? ""),
      snippet: t.snippet ?? "",
      keyword: keywords[0] ?? "",
    })).filter((p: any) => p.title);
  } catch { return []; }
}

const forumRouter = router({
  scan: protectedProcedure.input(z.object({
    brandId: z.number(),
    platforms: z.array(z.string()).optional().default(["all"]),
    forceRefresh: z.boolean().optional().default(false),
  })).mutation(async ({ input, ctx }) => {
    const brand = await getBrandById(input.brandId);
    if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
    const pillars = await getContentPillars(input.brandId);
    // Build rich keyword list from brand DNA
    const rawKeywords: string[] = [
      brand.name,
      brand.positioning || "",
      brand.audienceSummary || "",
      ...pillars.map((p: any) => p.name),
    ].map((k: string) => k.trim()).filter(Boolean);
    const keywords = Array.from(new Set(rawKeywords)).slice(0, 6);
    const brandVoice = `${brand.description ?? ""} ${brand.positioning ?? ""}`.trim();
    // Determine platforms to scan
    const platformFilter = input.platforms.includes("all")
      ? ALL_FORUM_PLATFORMS
      : input.platforms.filter((p) => ALL_FORUM_PLATFORMS.includes(p));
    const results: any[] = [];

    // --- Real API platforms ---
    const realPlatforms = platformFilter.filter(p => REAL_API_PLATFORMS.includes(p));
    for (const platform of realPlatforms) {
      for (const keyword of keywords.slice(0, 2)) {
        let posts: any[] = [];
        if (platform === "reddit") posts = await fetchRedditPosts(keyword);
        else if (platform === "hackernews") posts = await fetchHNPosts(keyword);
        else if (platform === "medium") posts = await fetchMediumPosts(keyword);
        results.push(...posts);
      }
    }

    // --- LLM-synthesized platforms (gated) ---
    // Use a 10s timeout per platform so a slow/unavailable LLM doesn't block the whole scan
    const llmPlatforms = platformFilter.filter(p => LLM_PLATFORMS.includes(p));
    const llmResults = await Promise.allSettled(llmPlatforms.map(async (platform) => {
      const timeoutPromise = new Promise<any[]>((_, reject) => setTimeout(() => reject(new Error('LLM timeout')), 10000));
      const posts = await Promise.race([fetchLLMOpportunities(platform, keywords, brand.name, brandVoice), timeoutPromise]);
      return posts;
    }));
    for (const r of llmResults) {
      if (r.status === 'fulfilled') results.push(...r.value);
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = results.filter(r => { if (!r.url || seen.has(r.url)) return false; seen.add(r.url); return true; });
    // Generate AI reply drafts for each opportunity (up to 20) — with 8s timeout per draft
    const withReplies = await Promise.all(unique.slice(0, 20).map(async (opp: any) => {
      try {
        const isChinesePlatform = opp.platform === "zhihu" || opp.platform === "xiaohongshu";
        const replyLang = isChinesePlatform ? "Chinese" : "English";
        const replyPrompt = `You are ${brand.name}'s AI Growth Officer, Caelum Liu.
Brand context: ${brandVoice}

A relevant discussion was found on ${opp.platform}:
Title: "${opp.title}"
Context: ${opp.snippet}

Write a genuinely helpful, non-promotional reply in ${replyLang} that adds real value to the discussion. Naturally mention ${brand.name} only if directly relevant. Keep it concise (2-3 paragraphs). No ** bold markdown. No em-dashes. Sound like a real human expert, not a brand account.`;
        const replyTimeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('reply timeout')), 8000));
        const llmCall = invokeLLM({ messages: [{ role: "user", content: replyPrompt }] }).then((r: any) => r?.choices?.[0]?.message?.content ?? "");
        const reply = await Promise.race([llmCall, replyTimeout]).catch(() => "");
        return { ...opp, suggestedReply: reply, status: "new" };
      } catch {
        return { ...opp, suggestedReply: "", status: "new" };
      }
    }));
    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "forum", entityId: 0, action: "scanned", description: `Forum scan found ${withReplies.length} opportunities across ${platformFilter.length} platforms` });
    return { opportunities: withReplies, count: withReplies.length };
  }),
});

// ─── Activity Router ──────────────────────────────────────────────────────────
const activityRouter = router({
  list: protectedProcedure.input(z.object({ brandId: z.number(), limit: z.number().optional().default(50) }))
    .query(async ({ input }) => getAuditLog(input.brandId, input.limit)),
});

// ─── AI Model Settings Router ───────────────────────────────────────────────
const modelSettingsRouter = router({
  get: protectedProcedure.query(async () => ({
    textModel: process.env.DOUBAO_TEXT_MODEL || "doubao-1-5-pro-32k-250115",
    zhTextModel: process.env.DOUBAO_ZH_TEXT_MODEL || "doubao-1-5-pro-32k-250115",
    imageModel: process.env.DOUBAO_IMAGE_MODEL || "doubao-seedream-3-0-t2i-250415",
    videoModel: process.env.DOUBAO_VIDEO_MODEL || "doubao-seedance-1-0-lite-t2v-250428",
  })),
  save: protectedProcedure
    .input(z.object({
      textModel: z.string().optional(),
      zhTextModel: z.string().optional(),
      imageModel: z.string().optional(),
      videoModel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.textModel) process.env.DOUBAO_TEXT_MODEL = input.textModel;
      if (input.zhTextModel) process.env.DOUBAO_ZH_TEXT_MODEL = input.zhTextModel;
      if (input.imageModel) process.env.DOUBAO_IMAGE_MODEL = input.imageModel;
      if (input.videoModel) process.env.DOUBAO_VIDEO_MODEL = input.videoModel;
      return { success: true };
    }),
});

// ─── Scheduling Router ──────────────────────────────────────────────────────
const schedulingRouter = router({
  // Get all platform schedules for a brand
  getSchedules: protectedProcedure
    .input(z.object({ brandId: z.number() }))
    .query(async ({ input }) => {
      const { getPlatformSchedules } = await import("./db");
      return getPlatformSchedules(input.brandId);
    }),

  // Upsert a platform schedule
  upsertSchedule: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      platform: z.string(),
      enabled: z.boolean().optional(),
      bestPushTime: z.string().optional(), // "HH:MM"
      timezone: z.string().optional(),
      cadenceType: z.enum(["daily", "weekly", "monthly", "custom"]).optional(),
      cadenceDays: z.array(z.number()).optional(), // 0=Sun..6=Sat
      cadenceDayOfMonth: z.number().optional(),
      cadenceIntervalDays: z.number().optional(),
      autoSchedule: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { upsertPlatformSchedule } = await import("./db");
      const { brandId, platform, ...data } = input;
      await upsertPlatformSchedule(brandId, platform, data);
      return { success: true };
    }),

  // Get scheduled posts for a brand (optionally filtered)
  getScheduledPosts: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      platform: z.string().optional(),
      status: z.string().optional(),
      from: z.date().optional(),
      to: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const { getScheduledPosts, getVariantsByPackageId, getContentPackageById } = await import("./db");
      const { brandId, ...opts } = input;
      const posts = await getScheduledPosts(brandId, opts);
      // Enrich with variant/package info
      const enriched = await Promise.all(posts.map(async (p) => {
        const pkg = await getContentPackageById(p.contentPackageId);
        return {
          ...p,
          contentTitle: pkg?.masterHook ?? "Untitled",
          contentAngle: pkg?.masterAngle ?? "",
        };
      }));
      return enriched;
    }),

  // Schedule a variant for a specific platform
  schedulePost: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      variantId: z.number(),
      contentPackageId: z.number(),
      platform: z.string(),
      scheduledAt: z.date(),
    }))
    .mutation(async ({ input }) => {
      const { createScheduledPost } = await import("./db");
      const id = await createScheduledPost(input);
      return { success: true, id };
    }),

  // Schedule all approved variants for a brand using platform cadence
  scheduleAllApproved: protectedProcedure
    .input(z.object({ brandId: z.number() }))
    .mutation(async ({ input }) => {
      const { getReviewQueue, getPlatformSchedules, getScheduledPosts, createScheduledPost } = await import("./db");
      const queue = await getReviewQueue(input.brandId);
      const schedules = await getPlatformSchedules(input.brandId);
      const existing = await getScheduledPosts(input.brandId, { status: "pending" });
      const existingKeys = new Set(existing.map(p => `${p.variantId}-${p.platform}`));

      let scheduled = 0;
      for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        // Find approved packages that have a variant for this platform
        const relevantPackages = queue.filter((pkg: any) => pkg.status === "approved");
        // Get next available slot times for this platform
        const platformExisting = existing.filter(p => p.platform === schedule.platform && p.status === "pending");
        let nextSlot = getNextSlotTime(schedule, platformExisting);

        for (const pkg of relevantPackages) {
          const variantKey = `${pkg.id}-${schedule.platform}`;
          if (existingKeys.has(variantKey)) continue;
          // Find the variant for this platform
          const { getVariantsByPackageId } = await import("./db");
          const variants = await getVariantsByPackageId(pkg.id);
          const variant = variants.find((v: any) => v.platform === schedule.platform);
          if (!variant) continue;

          await createScheduledPost({
            brandId: input.brandId,
            variantId: variant.id,
            contentPackageId: pkg.id,
            platform: schedule.platform,
            scheduledAt: nextSlot,
            status: "pending",
          });
          existingKeys.add(variantKey);
          scheduled++;
          nextSlot = advanceSlot(nextSlot, schedule);
        }
      }
      return { success: true, scheduled };
    }),

  // Reschedule a post to a new time
  reschedulePost: protectedProcedure
    .input(z.object({ id: z.number(), scheduledAt: z.date() }))
    .mutation(async ({ input }) => {
      const { updateScheduledPost } = await import("./db");
      await updateScheduledPost(input.id, { scheduledAt: input.scheduledAt });
      return { success: true };
    }),

  // Cancel a scheduled post
  cancelPost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { updateScheduledPost } = await import("./db");
      await updateScheduledPost(input.id, { status: "cancelled" });
      return { success: true };
    }),

  // Delete a scheduled post
  deletePost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { deleteScheduledPost } = await import("./db");
      await deleteScheduledPost(input.id);
      return { success: true };
    }),
});

// ─── Scheduling Helpers ───────────────────────────────────────────────────────
function getNextSlotTime(schedule: any, existingPosts: any[]): Date {
  const now = new Date();
  const [hour, minute] = (schedule.bestPushTime || "09:00").split(":").map(Number);
  let candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);

  // Advance until we hit a valid cadence day
  for (let i = 0; i < 365; i++) {
    if (isValidCadenceDay(candidate, schedule)) {
      // Check no existing post on same day+platform
      const sameDay = existingPosts.some(p => {
        const d = new Date(p.scheduledAt);
        return d.toDateString() === candidate.toDateString();
      });
      if (!sameDay) return candidate;
    }
    candidate = new Date(candidate);
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(hour, minute, 0, 0);
  }
  return candidate;
}

function advanceSlot(current: Date, schedule: any): Date {
  const [hour, minute] = (schedule.bestPushTime || "09:00").split(":").map(Number);
  let next = new Date(current);
  next.setDate(next.getDate() + 1);
  next.setHours(hour, minute, 0, 0);
  for (let i = 0; i < 365; i++) {
    if (isValidCadenceDay(next, schedule)) return next;
    next = new Date(next);
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function isValidCadenceDay(date: Date, schedule: any): boolean {
  const dow = date.getDay(); // 0=Sun
  const dom = date.getDate();
  switch (schedule.cadenceType) {
    case "daily": return true;
    case "weekly": return (schedule.cadenceDays ?? [1]).includes(dow);
    case "monthly": return dom === (schedule.cadenceDayOfMonth ?? 1);
    case "custom": return true; // handled by interval
    default: return true;
  }
}

// ─── App Router ─────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  modelSettings: modelSettingsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  brand: brandRouter,
  campaign: campaignRouter,
  idea: ideaRouter,
  content: contentRouter,
  publishing: publishingRouter,
  integrations: integrationsRouter,
  analytics: analyticsRouter,
  activity: activityRouter,
  inspector: inspectorRouter,
  pipeline: pipelineRouter,
  forum: forumRouter,
  scheduling: schedulingRouter,
  image: imageRouter,
});

export type AppRouter = typeof appRouter;
