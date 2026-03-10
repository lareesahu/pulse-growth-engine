import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";
import { humanize, humanizeVariant, humanizePackage } from "./humanizer";
import { runPipelineBackground, getPipelineStatus, buildContentPrompt, saveGeneratedContent, runInspector } from "./pipeline-engine";
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
    return { success: true };
  }),

  // Batch operations
  batchApprove: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(async ({ input }) => {
    await Promise.all(input.ids.map(id => updateContentPackage(id, { status: "approved_for_publish" })));
    return { success: true, count: input.ids.length };
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

    // Map our content fields to Webflow field slugs
    if (mapping.name && job.contentTitle) fieldData[mapping.name] = job.contentTitle;
    if (mapping.body && job.variantBody) fieldData[mapping.body] = job.variantBody;
    if (mapping.slug && job.contentTitle) {
      fieldData[mapping.slug] = job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80);
    }
    // Always set a name/slug if not mapped
    if (!fieldData.name && job.contentTitle) fieldData.name = job.contentTitle;
    if (!fieldData.slug && job.contentTitle) {
      fieldData.slug = job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80) + "-" + Date.now().toString(36);
    }

    // Mark as publishing
    await updatePublishJob(input.jobId, { publishStatus: "publishing", lastAttemptAt: new Date() });

    try {
      // Create CMS item in Webflow
      const response = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${webflowIntegration.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ fieldData, isDraft: false }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let friendlyMsg = `Webflow API error ${response.status}: ${errText.slice(0, 300)}`;
        let throwMsg = `Webflow API error: ${response.status} — ${errText.slice(0, 200)}`;
        if (response.status === 403 || errText.includes("missing_scopes") || errText.includes("cms:write")) {
          friendlyMsg = `Webflow 403: Token missing cms:write scope. Fix: Webflow Site Settings → Integrations → API Access → Generate new token → under CMS enable both Read AND Write → paste new token in Settings → Integrations.`;
          throwMsg = `Webflow token is missing cms:write permission. Go to Webflow Site Settings → Integrations → API Access → generate a new v2 Site API Token with CMS Read + Write enabled, then update it in Settings → Integrations.`;
        } else if (response.status === 401) {
          friendlyMsg = `Webflow 401: Invalid API token. Re-generate your token in Webflow Site Settings → Integrations → API Access and update it in Settings → Integrations.`;
          throwMsg = friendlyMsg;
        } else if (response.status === 404) {
          friendlyMsg = `Webflow 404: Collection not found. Check your Collection ID in Settings → Integrations → Webflow.`;
          throwMsg = friendlyMsg;
        }
        await updatePublishJob(input.jobId, { publishStatus: "failed", errorLog: friendlyMsg });
        throw new TRPCError({ code: "BAD_REQUEST", message: throwMsg });
      }

      const data = await response.json();
      const webflowItemId = data.id || data.items?.[0]?.id || "created";

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
      if (mapping.name && job.contentTitle) fieldData[mapping.name] = job.contentTitle;
      if (mapping.body && job.variantBody) fieldData[mapping.body] = job.variantBody;
      if (mapping.slug && job.contentTitle) fieldData[mapping.slug] = job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80);
      if (!fieldData.name && job.contentTitle) fieldData.name = job.contentTitle;
      if (!fieldData.slug && job.contentTitle) fieldData.slug = job.contentTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80) + "-" + Date.now().toString(36);
      await updatePublishJob(job.id, { publishStatus: "publishing", lastAttemptAt: new Date() });
      try {
        const response = await fetch(`https://api.webflow.com/v2/collections/${bulkCollectionId}/items`, {
          method: "POST",
          headers: { Authorization: `Bearer ${webflowIntegration.apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ fieldData, isDraft: false }),
        });
        if (!response.ok) {
          const errText = await response.text();
          let bulkErrMsg = `Webflow API error ${response.status}: ${errText.slice(0, 300)}`;
          if (response.status === 403 || errText.includes("missing_scopes") || errText.includes("cms:write")) {
            bulkErrMsg = `Webflow 403: Token missing cms:write scope. Fix: Webflow Site Settings → Integrations → API Access → Generate new token with CMS Read + Write, then update in Settings → Integrations.`;
          } else if (response.status === 401) {
            bulkErrMsg = `Webflow 401: Invalid API token. Re-generate in Webflow Site Settings → Integrations → API Access.`;
          }
          await updatePublishJob(job.id, { publishStatus: "failed", errorLog: bulkErrMsg });
          failed++;
        } else {
          const data = await response.json();
          const webflowItemId = data.id || data.items?.[0]?.id || "created";
          await updatePublishJob(job.id, { publishStatus: "published", publishedAt: new Date(), errorLog: null });
          if (job.variantId) await updateVariant(job.variantId, { status: "published" });
          await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "publish_job", entityId: job.id, action: "published", description: `Bulk published to Webflow: ${job.contentTitle || "item"} (ID: ${webflowItemId})` });
          published++;
        }
      } catch (err: any) {
        await updatePublishJob(job.id, { publishStatus: "failed", errorLog: err.message });
        failed++;
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
      return { ...pkg, title: idea?.title ?? "Untitled Content", ideaAngle: idea?.angle ?? "", variants, assets: pkgAssets, inspectionReports: reports };
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
    for (const variant of targetVariants) {
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
    await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: input.contentPackageId, action: "approved_for_publish", description: `Content package approved for publishing on ${targetVariants.length} platform(s)` });
    return { success: true, jobsCreated: targetVariants.length };
  }),

  batchApproveForPublishing: protectedProcedure.input(z.object({
    contentPackageIds: z.array(z.number()),
  })).mutation(async ({ ctx, input }) => {
    let totalJobs = 0;
    for (const id of input.contentPackageIds) {
      const pkg = await getContentPackageById(id);
      if (!pkg) continue;
      await updateContentPackage(id, { status: "approved_for_publish" });
      const variants = await getVariantsByPackageId(id);
      for (const variant of variants) {
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
      await logAudit({ brandId: pkg.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: id, action: "approved_for_publish", description: `Batch approved for publishing` });
    }
    return { success: true, approved: input.contentPackageIds.length, jobsCreated: totalJobs };
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
});

export type AppRouter = typeof appRouter;
