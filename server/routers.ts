import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { callDataApi } from "./_core/dataApi";
import {
  upsertUser, getUserByOpenId,
  getBrandsByUserId, getBrandById, createBrand, updateBrand,
  getBrandRules, createBrandRule, deleteBrandRule,
  getContentPillars, createContentPillar, updateContentPillar, deleteContentPillar,
  getAudienceProfiles, createAudienceProfile, updateAudienceProfile, deleteAudienceProfile,
  getPromptTemplates, createPromptTemplate, updatePromptTemplate, deletePromptTemplate,
  getPlatformPreferences, upsertPlatformPreference,
  getCampaigns, createCampaign, updateCampaign,
  getIdeas, getIdeaById, createIdea, updateIdea, getIdeaStats,
  getContentPackageByIdeaId, getContentPackageById, getContentPackagesByBrand, createContentPackage, updateContentPackage,
  getVariantsByPackageId, getVariantById, createVariant, updateVariant,
  getAssetsByPackageId, createAsset, updateAsset,
  getIntegrations, upsertIntegration,
  getPublishJobs, createPublishJob, updatePublishJob, getPublishStats,
  logAudit, getAuditLog, getAnalyticsSummary,
  getInspectorRules, getAllInspectorRules, createInspectorRule, updateInspectorRule, deleteInspectorRule,
  createInspectionReport, getInspectionReportsByPackage,
  createPipelineRun, updatePipelineRun, getLatestPipelineRun, getPipelineRuns,
  getReviewQueue,
  getInspectorThresholds, upsertInspectorThreshold, seedDefaultThresholds,
  createVitalityPrediction, getVitalityPredictions, getVitalityModelAccuracy,
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
    const platforms = input.targetPlatforms || idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"];

    // Create package record
    const pkgResult = await createContentPackage({
      ideaId: idea.id,
      brandId: idea.brandId,
      status: "generating",
      version: 1,
    });

    const pkgId = (pkgResult as any)[0]?.insertId ?? (pkgResult as any).insertId;

    const systemPrompt = `You are Caelum Liu, Chief Growth Officer for ${brand.name}. You are a world-class brand content strategist. Generate high-quality, on-brand content packages. Always return ONLY valid JSON.`;

    const userPrompt = `Generate a complete content package for this approved idea:

Title: ${idea.title}
Angle: ${idea.angle || ""}
Summary: ${idea.summary || ""}
Content Pillar: ${pillarName}
Funnel Stage: ${idea.funnelStage || "awareness"}

Brand: ${brand.name}
Mission: ${brand.mission || ""}
Positioning: ${brand.positioning || ""}
Tone: ${brand.toneSummary || "authoritative, empathetic, forward-thinking"}
${doSay ? `Do say: ${doSay}` : ""}
${dontSay ? `Don't say: ${dontSay}` : ""}

Target platforms: ${platforms.join(", ")}

Return ONLY valid JSON with this structure:
{
  "masterHook": "Compelling one-line hook",
  "masterAngle": "Core strategic angle for this piece",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "cta": "Primary call to action",
  "blogContent": "Full blog article (800-1200 words, markdown formatted with ## subheadings)",
  "variants": {
    "linkedin": { "title": "...", "body": "LinkedIn post (1200-1800 chars, thought leadership, ends with engagement question)", "hashtags": ["tag1", "tag2"] },
    "instagram": { "caption": "Instagram caption (150-300 chars, strong hook, visual-first)", "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10"] },
    "webflow": { "title": "SEO article title", "body": "Full article for blog (same as blogContent but formatted for web)" },
    "wechat": { "title": "WeChat title", "body": "WeChat article (Chinese-friendly tone, 400-600 chars, warm and insightful)" }
  },
  "imagePrompt": "Detailed image generation prompt: hyperrealistic, 16:9, cool teal/blue/violet neon tones, professional, no text or symbols, cinematic lighting"
}`;

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

    // Update content package with generated content
    await updateContentPackage(pkgId, {
      masterHook: generated.masterHook || idea.title,
      masterAngle: generated.masterAngle || idea.angle || "",
      keyPoints: generated.keyPoints || [],
      cta: generated.cta || "",
      blogContent: generated.blogContent || "",
      status: "generated",
      generationModel: "gemini-2.5-flash",
      generationPrompt: userPrompt,
    });

    // Create platform variants
    const variantData = generated.variants || {};
    for (const platform of platforms) {
      const v = variantData[platform] || {};
      await createVariant({
        contentPackageId: pkgId,
        brandId: idea.brandId,
        platform: platform as any,
        formatType: platform === "webflow" ? "article" : platform === "linkedin" ? "long_post" : platform === "instagram" ? "caption" : "short_post",
        title: v.title || generated.masterHook || idea.title,
        body: v.body || "",
        caption: v.caption || "",
        hashtags: v.hashtags || [],
        status: "generated",
        version: 1,
      });
    }

    // Create image prompt asset
    if (generated.imagePrompt) {
      await createAsset({
        contentPackageId: pkgId,
        assetType: "image_prompt",
        promptText: generated.imagePrompt,
        status: "ready",
        version: 1,
      });
    }

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

  generateImage: protectedProcedure.input(z.object({
    contentPackageId: z.number(),
    assetId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const { generateImage } = await import("./_core/imageGeneration");
    const pkgAssets = await getAssetsByPackageId(input.contentPackageId);
    const promptAsset = pkgAssets.find(a => a.assetType === "image_prompt" && a.status === "ready");
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
    const jobs = await getPublishJobs(0); // We'll get by id differently
    await updatePublishJob(input.jobId, { publishStatus: "queued", lastAttemptAt: new Date() });
    return { success: true };
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

  run: protectedProcedure.input(z.object({
    brandId: z.number(),
    ideaCount: z.number().min(1).max(30).default(10),
    autoApproveIdeas: z.boolean().default(true),
    runInspector: z.boolean().default(true),
  })).mutation(async ({ ctx, input }) => {
    const brand = await getBrandById(input.brandId);
    if (!brand) throw new Error("Brand not found");

    // Create pipeline run record
    const runResult = await createPipelineRun({
      brandId: input.brandId,
      triggeredByUserId: ctx.user.id,
      status: "running",
      ideasGenerated: 0,
      ideasApproved: 0,
      packagesGenerated: 0,
      packagesInspected: 0,
      packagesPassedInspection: 0,
      startedAt: new Date(),
    });
    const runId = (runResult as any).id ?? (runResult as any)[0]?.insertId ?? (runResult as any).insertId;

    let ideasGenerated = 0;
    let ideasApproved = 0;
    let packagesGenerated = 0;
    let packagesInspected = 0;
    let packagesPassedInspection = 0;
    const errors: string[] = [];

    try {
      // STEP 1: Generate ideas
      const [pillars, rules, prompts, audiences] = await Promise.all([
        getContentPillars(input.brandId),
        getBrandRules(input.brandId),
        getPromptTemplates(input.brandId),
        getAudienceProfiles(input.brandId),
      ]);

      const pillarNames = pillars.map(p => p.name).join(", ");
      const doSay = rules.filter(r => r.ruleType === "do_say").map(r => r.content).join("; ");
      const dontSay = rules.filter(r => r.ruleType === "dont_say").map(r => r.content).join("; ");
      const audienceSummary = audiences.map(a => a.segment).join(", ");
      const promptExamples = prompts.slice(0, 3).map(p => p.promptText).join("\n");

      const ideaResponse = await invokeLLM({
        messages: [
          { role: "system", content: `You are Caelum Liu, CGO for ${brand.name}. Generate fresh, strategic content ideas. Return ONLY valid JSON.` },
          { role: "user", content: `Generate ${input.ideaCount} content ideas for ${brand.name}.\n\nMission: ${brand.mission || ""}\nPositioning: ${brand.positioning || ""}\nContent pillars: ${pillarNames}\nTarget audience: ${audienceSummary}\nTone: ${brand.toneSummary || "authoritative, empathetic"}\n${doSay ? `Do say: ${doSay}` : ""}\n${dontSay ? `Don't say: ${dontSay}` : ""}\n\nPrompt style examples:\n${promptExamples}\n\nReturn JSON: { "ideas": [{ "title": "...", "angle": "...", "pillar": "pillar name", "platforms": ["linkedin", "instagram", "webflow", "wechat", "blog"], "funnelStage": "awareness|consideration|conversion|retention", "summary": "2-sentence summary" }] }

IMPORTANT: platforms must only use these exact values: linkedin, instagram, webflow, wechat, blog, tiktok, facebook, medium, xiaohongshu, reddit, quora. Never use any other platform name.` },
        ],
        response_format: { type: "json_object" } as any,
      });

      let generatedIdeas: any[] = [];
      try {
        const raw = (ideaResponse.choices?.[0]?.message?.content as string) || "{}";
        generatedIdeas = JSON.parse(raw).ideas || [];
      } catch { generatedIdeas = []; }

      // STEP 2: Save ideas and auto-approve
      const approvedIdeaIds: number[] = [];
      for (const idea of generatedIdeas.slice(0, input.ideaCount)) {
        const pillar = pillars.find(p => p.name.toLowerCase() === (idea.pillar || "").toLowerCase());
        const ideaResult = await createIdea({
          brandId: input.brandId,
          title: idea.title || "Untitled",
          angle: idea.angle || "",
          summary: idea.summary || "",
          targetPlatforms: (idea.platforms || ["linkedin", "instagram"]).filter((p: string) => ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"].includes(p)),
          funnelStage: (["awareness", "consideration", "conversion", "retention", "decision"].includes(idea.funnelStage) ? idea.funnelStage : "awareness") as "awareness" | "consideration" | "conversion" | "retention" | "decision",
          pillarId: pillar?.id ?? null,
          status: input.autoApproveIdeas ? "approved" : "proposed",
          sourceType: "batch",
        });
        ideasGenerated++;
        if (input.autoApproveIdeas) {
          approvedIdeaIds.push((ideaResult as any)[0]?.insertId ?? (ideaResult as any).insertId);
          ideasApproved++;
        }
      }

      await updatePipelineRun(runId, { ideasGenerated, ideasApproved });

      // STEP 3: Generate content packages for all approved ideas
      const inspectorRulesList = input.runInspector ? await getInspectorRules(input.brandId) : [];

      for (const ideaId of approvedIdeaIds) {
        try {
          const idea = await getIdeaById(ideaId);
          if (!idea) continue;

          const pillarName = pillars.find(p => p.id === idea.pillarId)?.name || "General";
          const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
          const rawPlatforms = idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"];
          const platforms = rawPlatforms.filter((p: string) => VALID_PLATFORMS.includes(p));

          const pkgResult = await createContentPackage({
            ideaId: idea.id,
            brandId: idea.brandId,
            status: "generating",
            version: 1,
          });
          const pkgId = (pkgResult as any)[0]?.insertId ?? (pkgResult as any).insertId;

          const systemPrompt = `You are Caelum Liu, Chief Growth Officer for ${brand.name}. Generate high-quality, on-brand content packages. Always return ONLY valid JSON.`;
          const userPrompt = `Generate a complete content package for:\n\nTitle: ${idea.title}\nAngle: ${idea.angle || ""}\nContent Pillar: ${pillarName}\nFunnel Stage: ${idea.funnelStage || "awareness"}\n\nBrand: ${brand.name}\nMission: ${brand.mission || ""}\nPositioning: ${brand.positioning || ""}\nTone: ${brand.toneSummary || "authoritative, empathetic, forward-thinking"}\n${doSay ? `Do say: ${doSay}` : ""}\n${dontSay ? `Don't say: ${dontSay}` : ""}\n\nTarget platforms: ${platforms.join(", ")}\n\nReturn ONLY valid JSON:\n{\n  "masterHook": "Compelling one-line hook",\n  "masterAngle": "Core strategic angle",\n  "keyPoints": ["point 1", "point 2", "point 3"],\n  "cta": "Primary call to action",\n  "blogContent": "Full blog article (800-1200 words, markdown formatted)",\n  "variants": {\n    "linkedin": { "title": "...", "body": "LinkedIn post (1200-1800 chars, no ** markdown, no em-dashes, thought leadership, ends with question)", "hashtags": ["tag1", "tag2"] },\n    "instagram": { "caption": "Instagram caption (150-300 chars, strong hook)", "hashtags": ["tag1", "tag2", "tag3"] },\n    "webflow": { "title": "SEO title", "body": "Full article" },\n    "wechat": { "title": "WeChat title", "body": "WeChat article (400-600 chars, warm tone)" }\n  },\n  "imagePrompt": "Hyperrealistic, 16:9, teal/blue/violet tones, professional, no text, cinematic lighting"\n}`;

          const contentResponse = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" } as any,
          });

          let generated: any = {};
          try {
            const raw = (contentResponse.choices?.[0]?.message?.content as string) || "{}";
            generated = JSON.parse(raw);
          } catch { generated = {}; }

          await updateContentPackage(pkgId, {
            masterHook: generated.masterHook || idea.title,
            masterAngle: generated.masterAngle || idea.angle || "",
            keyPoints: generated.keyPoints || [],
            cta: generated.cta || "",
            blogContent: generated.blogContent || "",
            status: "generated",
            generationModel: "gemini-2.5-flash",
            generationPrompt: userPrompt,
          });

          const variantData = generated.variants || {};
          for (const platform of platforms) {
            const v = variantData[platform] || {};
            await createVariant({
              contentPackageId: pkgId,
              brandId: idea.brandId,
              platform: platform as any,
              formatType: platform === "webflow" ? "article" : platform === "linkedin" ? "long_post" : platform === "instagram" ? "caption" : "short_post",
              title: v.title || generated.masterHook || idea.title,
              body: v.body || "",
              caption: v.caption || "",
              hashtags: v.hashtags || [],
              status: "generated",
              version: 1,
            });
          }

          if (generated.imagePrompt) {
            await createAsset({
              contentPackageId: pkgId,
              assetType: "image_prompt",
              promptText: generated.imagePrompt,
              status: "ready",
              version: 1,
            });
          }

          packagesGenerated++;

          // STEP 4: Run AI Inspector
          if (input.runInspector && inspectorRulesList.length > 0) {
            packagesInspected++;
            const variants = await getVariantsByPackageId(pkgId);
            const allContent = variants.map(v => `[${v.platform}]: ${v.body || v.caption || ""}`).join("\n\n");

            const rulesText = inspectorRulesList.map(r => `- ${r.ruleType} (severity: ${r.severity}): ${r.ruleValue}${r.autoFix ? " [AUTO-FIX ENABLED]" : ""}`).join("\n");

            const inspectResponse = await invokeLLM({
              messages: [
                { role: "system", content: "You are a brand content quality inspector. Check content against rules and return ONLY valid JSON." },
                { role: "user", content: `Inspect this content against the brand rules and return a quality report.\n\nCONTENT:\n${allContent}\n\nRULES:\n${rulesText}\n\nReturn JSON: { "score": 0-100, "passed": true/false, "humanisationScore": 0-10, "authenticityScore": 0-10, "accuracyScore": 0-10, "platformFitScore": 0-10, "originalityScore": 0-10, "vitalityScore": 0-100, "issues": [{ "rule": "rule name", "severity": "error|warning|info", "description": "what was found", "suggestion": "how to fix", "autoFixed": false }], "fixedContent": { "linkedin": "...", "instagram": "...", "webflow": "...", "wechat": "..." } }\n\nFor humanisationScore: rate how human and conversational the writing feels (0-10).\nFor authenticityScore: rate how authentic and genuine the brand voice is (0-10).\nFor accuracyScore: rate factual accuracy and claim validity (0-10).\nFor platformFitScore: rate how well the content fits each platform's norms (0-10).\nFor originalityScore: rate how original and non-generic the content is (0-10).\nFor vitalityScore: rate overall viral/engagement potential (0-100).` },
              ],
              response_format: { type: "json_object" } as any,
            });

            let inspectionResult: any = { score: 100, passed: true, issues: [] };
            try {
              const raw = (inspectResponse.choices?.[0]?.message?.content as string) || "{}";
              inspectionResult = JSON.parse(raw);
            } catch { inspectionResult = { score: 100, passed: true, issues: [] }; }

            // Save inspection report
            await createInspectionReport({
              contentPackageId: pkgId,
              brandId: idea.brandId,
              overallScore: inspectionResult.score || 100,
              passed: inspectionResult.passed !== false,
              humanisationScore: inspectionResult.humanisationScore ?? null,
              authenticityScore: inspectionResult.authenticityScore ?? null,
              accuracyScore: inspectionResult.accuracyScore ?? null,
              platformFitScore: inspectionResult.platformFitScore ?? null,
              originalityScore: inspectionResult.originalityScore ?? null,
              vitalityScore: inspectionResult.vitalityScore ?? null,
              issues: inspectionResult.issues || [],
              fixedContent: inspectionResult.fixedContent || null,
              inspectorVersion: "1.0",
            });

            // Apply auto-fixes if available
            if (inspectionResult.fixedContent) {
              for (const variant of variants) {
                const fixed = inspectionResult.fixedContent[variant.platform];
                if (fixed) {
                  await updateVariant(variant.id, {
                    body: variant.platform !== "instagram" ? fixed : variant.body,
                    caption: variant.platform === "instagram" ? fixed : variant.caption,
                    status: "generated",
                  });
                }
              }
            }

            if (inspectionResult.passed !== false) {
              packagesPassedInspection++;
            }
          } else {
            packagesPassedInspection++;
          }

          await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "content_package", entityId: pkgId, action: "pipeline_generated", description: `Pipeline: content package generated for "${idea.title}"` });
        } catch (err: any) {
          errors.push(`Failed for idea ${ideaId}: ${err.message}`);
        }
      }

      await updatePipelineRun(runId, {
        status: errors.length === 0 ? "completed" : "partial",
        ideasGenerated,
        ideasApproved,
        packagesGenerated,
        packagesInspected,
        packagesPassedInspection,
        errorLog: errors.length > 0 ? errors.join("\n") : null,
        completedAt: new Date(),
      });

      await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "pipeline", action: "completed", description: `Pipeline completed: ${ideasGenerated} ideas, ${packagesGenerated} packages, ${packagesPassedInspection} passed inspection` });

      return {
        success: true,
        runId,
        ideasGenerated,
        ideasApproved,
        packagesGenerated,
        packagesInspected,
        packagesPassedInspection,
        errors,
      };
    } catch (err: any) {
      await updatePipelineRun(runId, { status: "failed", errorLog: err.message, completedAt: new Date() });
      throw err;
    }
  }),
});

// ─── Forum Router ───────────────────────────────────────────────────────────────
const forumRouter = router({
  scan: protectedProcedure.input(z.object({
    brandId: z.number(),
    platforms: z.array(z.enum(["reddit", "quora", "linkedin", "all"])).optional().default(["all"]),
    forceRefresh: z.boolean().optional().default(false),
  })).mutation(async ({ input, ctx }) => {
    const brand = await getBrandById(input.brandId);
    if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
    const pillars = await getContentPillars(input.brandId);
    const keywords = [
      brand.name,
      ...(brand.positioning ? [brand.positioning] : []),
      ...pillars.slice(0, 4).map((p: any) => p.name),
    ].filter(Boolean);
    const platformFilter = input.platforms.includes("all") ? ["reddit", "quora", "linkedin"] : input.platforms;
    const results: any[] = [];
    for (const platform of platformFilter) {
      for (const keyword of keywords.slice(0, 3)) {
        try {
          const searchQuery = platform === "reddit"
            ? `site:reddit.com ${keyword} branding marketing`
            : platform === "quora"
            ? `site:quora.com ${keyword}`
            : `${keyword} branding agency LinkedIn`;
          const searchResult = await callDataApi("Google/search", {
            query: { q: searchQuery, num: 5 },
          }) as any;
          const items = searchResult?.items ?? searchResult?.organic_results ?? [];
          for (const item of items.slice(0, 3)) {
            results.push({
              platform,
              title: item.title ?? item.snippet ?? "Untitled",
              url: item.link ?? item.url ?? "",
              snippet: item.snippet ?? item.description ?? "",
              keyword,
            });
          }
        } catch (e) {
          // skip failed searches silently
        }
      }
    }
    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = results.filter(r => { if (!r.url || seen.has(r.url)) return false; seen.add(r.url); return true; });
    // Generate AI reply drafts for each opportunity
    const withReplies = await Promise.all(unique.slice(0, 15).map(async (opp: any) => {
      try {
        const replyPrompt = `You are ${brand.name}'s AI Growth Officer, Caelum Liu. Your bran      brand.description ?? brand.positioning ?? "".

A relevant discussion was found on ${opp.platform}:
Title: "${opp.title}"
Context: ${opp.snippet}

Write a genuinely helpful, non-promotional reply that adds real value. Naturally mention ${brand.name} only if it's directly relevant. Keep it concise (2-3 paragraphs max). No ** bold markdown. No em-dashes. Sound human.`;
        const response = await invokeLLM({ messages: [{ role: "user", content: replyPrompt }] }) as any;
        const reply = response?.choices?.[0]?.message?.content ?? "";
        return { ...opp, suggestedReply: reply, status: "new" };
      } catch {
        return { ...opp, suggestedReply: "", status: "new" };
      }
    }));
    await logAudit({ brandId: input.brandId, actorUserId: ctx.user.id, entityType: "forum", entityId: 0, action: "scanned", description: `Forum scan found ${withReplies.length} opportunities` });
    return { opportunities: withReplies, count: withReplies.length };
  }),
});

// ─── Activity Router ──────────────────────────────────────────────────────────
const activityRouter = router({
  list: protectedProcedure.input(z.object({ brandId: z.number(), limit: z.number().optional().default(50) }))
    .query(async ({ input }) => getAuditLog(input.brandId, input.limit)),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
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
