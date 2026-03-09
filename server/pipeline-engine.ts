/**
 * Pipeline Engine — Background-safe content generation logic
 * Extracted from routers.ts so it can run independently of HTTP request lifecycle.
 */
import { invokeLLM } from "./_core/llm";
import { humanize, humanizeVariant, humanizePackage } from "./humanizer";
import {
  getBrandById, getContentPillars, getBrandRules, getPromptTemplates, getAudienceProfiles,
  getIdeaById, createIdea, createContentPackage, updateContentPackage,
  getVariantsByPackageId, createVariant, updateVariant,
  createAsset, getAllInspectorRules, createInspectionReport,
  createPipelineRun, updatePipelineRun, logAudit,
} from "./db";

// ─── Platform-aware variant prompt builder ─────────────────────────────────

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  linkedin:     `"title": "...", "body": "LinkedIn post (1200-1800 chars, thought leadership tone, ends with engagement question, no ** markdown, no em-dashes)", "hashtags": ["tag1", "tag2"]`,
  instagram:    `"caption": "Instagram caption (150-300 chars, strong hook, visual-first, emojis OK)", "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"]`,
  webflow:      `"title": "SEO article title", "body": "Full article for blog (800-1200 words, formatted for web)"`,
  wechat:       `"title": "WeChat title", "body": "WeChat article (Chinese-friendly tone, 400-600 chars, warm and insightful)"`,
  blog:         `"title": "Blog post title", "body": "Full blog article (800-1200 words, informative and engaging)"`,
  facebook:     `"body": "Facebook post (200-400 chars, conversational, shareable, includes a question or CTA)", "hashtags": ["tag1", "tag2"]`,
  tiktok:       `"body": "TikTok caption (100-200 chars, punchy, trend-aware, hook in first line)", "hashtags": ["tag1", "tag2", "tag3"]`,
  medium:       `"title": "Medium article title", "body": "Medium article (800-1500 words, in-depth, thought-provoking)"`,
  xiaohongshu:  `"title": "小红书标题", "body": "小红书笔记 (300-500字, 生活化语气, 实用分享)", "hashtags": ["tag1", "tag2"]`,
  reddit:       `"title": "Reddit post title", "body": "Reddit post (200-500 chars, authentic, community-focused, no self-promotion)"`,
  quora:        `"body": "Quora answer (300-600 chars, helpful, authoritative, naturally references expertise)"`,
};

/**
 * Build a dynamic variant section for the LLM prompt based on the actual target platforms.
 */
function buildVariantPromptSection(platforms: string[]): string {
  const entries = platforms
    .filter(p => PLATFORM_INSTRUCTIONS[p])
    .map(p => `    "${p}": { ${PLATFORM_INSTRUCTIONS[p]} }`);
  
  if (entries.length === 0) {
    // Fallback to core 4 platforms
    return `    "linkedin": { ${PLATFORM_INSTRUCTIONS.linkedin} },
    "instagram": { ${PLATFORM_INSTRUCTIONS.instagram} },
    "webflow": { ${PLATFORM_INSTRUCTIONS.webflow} },
    "wechat": { ${PLATFORM_INSTRUCTIONS.wechat} }`;
  }
  return entries.join(",\n");
}

/**
 * Build the full content generation prompt for a given idea and platforms.
 */
export function buildContentPrompt(params: {
  idea: { title: string; angle?: string | null; summary?: string | null; funnelStage?: string | null };
  pillarName: string;
  brand: { name: string; mission?: string | null; positioning?: string | null; toneSummary?: string | null };
  doSay: string;
  dontSay: string;
  platforms: string[];
}): { systemPrompt: string; userPrompt: string } {
  const { idea, pillarName, brand, doSay, dontSay, platforms } = params;
  
  const systemPrompt = `You are Caelum Liu, Chief Growth Officer for ${brand.name}. You are a world-class brand content strategist. Generate high-quality, on-brand content packages. Always return ONLY valid JSON. Never include markdown formatting like **, ##, or em-dashes in the content itself.`;

  const variantSection = buildVariantPromptSection(platforms);

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

CRITICAL RULES:
- Every variant MUST have substantial content. Never leave body or caption empty.
- Do NOT use markdown formatting (**, ##, *, em-dashes) in any content.
- Write naturally as a human would. Avoid AI filler phrases.
- Each platform variant must be tailored to that platform's style and audience.
- NEVER use placeholder text like [Year], [Brand Name], [Company], [X%], [Number]. Use specific real values (e.g. "2026" not "[Year]").

Return ONLY valid JSON with this structure:
{
  "masterHook": "Compelling one-line hook (required, non-empty)",
  "masterAngle": "Core strategic angle for this piece (required, non-empty)",
  "cta": "Primary call to action — a specific directive like 'Book a free brand audit at pulsebranding.com' (required, non-empty)",
  "keyPoints": ["Specific insight 1", "Specific insight 2", "Specific insight 3", "Specific insight 4", "Specific insight 5"],
  "blogContent": "Full blog article (800-1200 words)",
  "variants": {
${variantSection}
  },
  "imagePrompt": "Detailed image generation prompt: hyperrealistic, 16:9, cool teal/blue/violet neon tones, professional, no text or symbols, cinematic lighting"
}`;

  return { systemPrompt, userPrompt };
}

/**
 * Strip [platform]: prefix from inspector fixed content
 */
function cleanFixedContent(text: string): string {
  if (!text || typeof text !== "string") return text;
  // Remove patterns like "[linkedin]: " or "[instagram]: " at the start
  return text.replace(/^\[[\w]+\]:\s*/i, "").trim();
}

/**
 * Parse and save generated content from LLM response into DB.
 * Returns the package ID.
 */
// ─── Placeholder Cleanup ─────────────────────────────────────────────────────
function cleanPlaceholders(text: string, brandName: string): string {
  if (!text) return text;
  const year = new Date().getFullYear().toString();
  return text
    .replace(/\[Year\]/gi, year)
    .replace(/\[Current Year\]/gi, year)
    .replace(/\[Brand Name\]/gi, brandName)
    .replace(/\[Brand\]/gi, brandName)
    .replace(/\[Company Name\]/gi, brandName)
    .replace(/\[Your Brand\]/gi, brandName)
    .replace(/\[Insert Brand\]/gi, brandName)
    .replace(/\[Insert Year\]/gi, year)
    .replace(/\[XX%\]/gi, '40%')
    .replace(/\[X%\]/gi, '30%')
    .replace(/\[Number\]/gi, '5')
    .replace(/\[Name\]/gi, 'a founder')
    .replace(/\[City\]/gi, 'Singapore')
    .replace(/\[Platform\]/gi, 'LinkedIn');
}

export async function saveGeneratedContent(params: {
  pkgId: number;
  generated: any;
  idea: { id: number; brandId: number; title: string; angle?: string | null };
  platforms: string[];
  userPrompt: string;
}): Promise<void> {
  const { pkgId, generated, idea, platforms, userPrompt } = params;
  // Fetch brand name for placeholder replacement
  const brand = await getBrandById(idea.brandId);
  const brandName = brand?.name || 'Pulse Branding';
  // Update content package with generated content — humanize to strip markdown
  // Ensure keyPoints and CTA are never empty — use fallbacks if LLM omitted them
  const rawKeyPoints: string[] = Array.isArray(generated.keyPoints) && generated.keyPoints.length >= 3
    ? generated.keyPoints
    : [
        `Understand the strategic importance of ${idea.title}`,
        `Apply proven frameworks to achieve measurable brand results`,
        `Leverage data-driven insights to guide your brand decisions`,
        `Build authentic connections with your target audience`,
        `Measure and iterate for continuous brand improvement`,
      ];
  const rawCta: string = (generated.cta && generated.cta.length > 5)
    ? generated.cta
    : `Explore how ${brandName} can help you implement these strategies — book a free consultation today.`;

  const cleanPkg = humanizePackage({
    masterHook: cleanPlaceholders(generated.masterHook || idea.title, brandName),
    masterAngle: cleanPlaceholders(generated.masterAngle || idea.angle || '', brandName),
    keyPoints: rawKeyPoints.map((kp: string) => cleanPlaceholders(kp, brandName)),
    cta: cleanPlaceholders(rawCta, brandName),
    blogContent: cleanPlaceholders(generated.blogContent || '', brandName),
  });
  
  await updateContentPackage(pkgId, {
    ...cleanPkg,
    status: "generated",
    generationModel: process.env.DOUBAO_TEXT_MODEL || "doubao-1-5-pro-32k-250115",
    generationPrompt: userPrompt,
  });

  // Create platform variants — humanize each variant
  const variantData = generated.variants || {};
  for (const platform of platforms) {
    const v = variantData[platform] || {};
    
    // For platforms without a specific variant, use blogContent or masterHook as fallback body
    let body = v.body || "";
    let caption = v.caption || "";
    
    // If both body and caption are empty, generate a fallback from the package content
    if (!body && !caption) {
      if (platform === "instagram" || platform === "tiktok") {
        caption = generated.masterHook || idea.title;
      } else {
        body = generated.blogContent || generated.masterAngle || idea.title;
      }
    }
    
    const cleanVariant = humanizeVariant({
      title: cleanPlaceholders(v.title || generated.masterHook || idea.title, brandName),
      body: cleanPlaceholders(body, brandName),
      caption: cleanPlaceholders(caption, brandName),
      hashtags: (v.hashtags || []).map((h: string) => cleanPlaceholders(h, brandName)),
    });
    
    await createVariant({
      contentPackageId: pkgId,
      brandId: idea.brandId,
      platform: platform as any,
      formatType: platform === "webflow" || platform === "blog" || platform === "medium" ? "article" 
        : platform === "linkedin" ? "long_post" 
        : platform === "instagram" ? "caption" 
        : "short_post",
      title: cleanVariant.title || "",
      body: cleanVariant.body || "",
      caption: cleanVariant.caption || "",
      hashtags: cleanVariant.hashtags || [],
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
}

/**
 * Run AI Inspector on a content package and save the report.
 * Returns { passed, report }.
 */
export async function runInspector(params: {
  pkgId: number;
  brandId: number;
  inspectorRules: any[];
}): Promise<{ passed: boolean; report: any }> {
  const { pkgId, brandId, inspectorRules } = params;
  
  const variants = await getVariantsByPackageId(pkgId);
  const allContent = variants
    .map(v => `Platform: ${v.platform}\n${v.body || v.caption || "(no content)"}`)
    .join("\n\n---\n\n");

  const rulesText = inspectorRules
    .map((r: any) => `- ${r.ruleType} (severity: ${r.severity}): ${r.ruleValue}${r.autoFix ? " [AUTO-FIX ENABLED]" : ""}`)
    .join("\n");

  const inspectResponse = await invokeLLM({
    messages: [
      { role: "system", content: "You are a brand content quality inspector. Evaluate content quality across multiple dimensions. Return ONLY valid JSON." },
      { role: "user", content: `Inspect this content against the brand rules and return a quality report.

CONTENT:
${allContent}

RULES:
${rulesText}

Return JSON with this EXACT structure:
{
  "score": <number 0-100, overall quality score>,
  "passed": <boolean, true if score >= 70>,
  "humanisationScore": <number 1-10, how human and conversational the writing feels>,
  "authenticityScore": <number 1-10, how authentic and genuine the brand voice is>,
  "accuracyScore": <number 1-10, factual accuracy and claim validity>,
  "platformFitScore": <number 1-10, how well content fits each platform's norms>,
  "originalityScore": <number 1-10, how original and non-generic the content is>,
  "viralityScore": <number 0-100, likelihood of going viral / engagement potential>,
  "issues": [{ "rule": "rule name", "severity": "error|warning|info", "description": "what was found", "suggestion": "how to fix" }],
  "fixedContent": { "<platform>": "improved content text" }
}

IMPORTANT: All dimension scores (humanisation, authenticity, accuracy, platformFit, originality) MUST be between 1 and 10. The overall score and viralityScore MUST be between 0 and 100. Do NOT return 0 for any dimension unless the content is completely missing.` },
    ],
    response_format: { type: "json_object" } as any,
  });

  let inspectionResult: any = {};
  try {
    const raw = (inspectResponse.choices?.[0]?.message?.content as string) || "{}";
    inspectionResult = JSON.parse(raw);
  } catch {
    inspectionResult = {};
  }

  // Ensure scores are within valid ranges
  const clamp = (val: any, min: number, max: number) => {
    const n = Number(val);
    if (isNaN(n)) return null;
    return Math.min(max, Math.max(min, Math.round(n)));
  };

  const overallScore = clamp(inspectionResult.score, 0, 100) ?? 75;
  const humanisationScore = clamp(inspectionResult.humanisationScore, 1, 10);
  const authenticityScore = clamp(inspectionResult.authenticityScore, 1, 10);
  const accuracyScore = clamp(inspectionResult.accuracyScore, 1, 10);
  const platformFitScore = clamp(inspectionResult.platformFitScore, 1, 10);
  const originalityScore = clamp(inspectionResult.originalityScore, 1, 10);
  const viralityScore = clamp(inspectionResult.viralityScore, 0, 100);

  const passed = overallScore >= 70;

  // Save inspection report
  await createInspectionReport({
    contentPackageId: pkgId,
    brandId,
    overallScore,
    passed,
    humanisationScore,
    authenticityScore,
    accuracyScore,
    platformFitScore,
    originalityScore,
    viralityScore,
    issues: inspectionResult.issues || [],
    fixedContent: inspectionResult.fixedContent || null,
    inspectorVersion: "2.0",
  });

  // Apply auto-fixes if available — strip [platform]: prefix
  if (inspectionResult.fixedContent) {
    for (const variant of variants) {
      const rawFixed = inspectionResult.fixedContent[variant.platform];
      if (rawFixed) {
        const fixed = cleanFixedContent(humanize(rawFixed));
        if (fixed && fixed.length > 10) {
          await updateVariant(variant.id, {
            body: variant.platform !== "instagram" ? fixed : variant.body,
            caption: variant.platform === "instagram" ? fixed : variant.caption,
            status: "generated",
          });
        }
      }
    }
  }

  return { passed, report: inspectionResult };
}

// ─── Background Pipeline Runner ────────────────────────────────────────────

interface PipelineInput {
  brandId: number;
  userId: number;
  ideaCount: number;
  autoApproveIdeas: boolean;
  runInspector: boolean;
}

// In-memory store for active pipeline runs (server-side, survives tab switches)
const activePipelines = new Map<number, { runId: number; status: string; progress: any }>();

export function getPipelineStatus(brandId: number) {
  return activePipelines.get(brandId) ?? null;
}

/**
 * Run the full pipeline as a background job.
 * Returns the runId immediately; progress is tracked in DB and in-memory.
 */
export async function runPipelineBackground(input: PipelineInput): Promise<number> {
  const brand = await getBrandById(input.brandId);
  if (!brand) throw new Error("Brand not found");

  // Create pipeline run record
  const runResult = await createPipelineRun({
    brandId: input.brandId,
    triggeredByUserId: input.userId,
    status: "running",
    stage: "generating_ideas",
    ideasGenerated: 0,
    ideasApproved: 0,
    packagesGenerated: 0,
    packagesInspected: 0,
    packagesPassedInspection: 0,
    startedAt: new Date(),
  });
  const runId = (runResult as any).id ?? (runResult as any)[0]?.insertId ?? (runResult as any).insertId;

  // Track in memory
  activePipelines.set(input.brandId, {
    runId,
    status: "running",
    progress: { stage: "generating_ideas", ideasGenerated: 0, packagesGenerated: 0, packagesInspected: 0 },
  });

  // Fire and forget — run in background
  executePipeline(input, brand, runId).catch(async (err) => {
    console.error(`[Pipeline ${runId}] Fatal error:`, err);
    try {
      await updatePipelineRun(runId, { status: "failed", errorLog: err.message, completedAt: new Date() });
    } catch {}
    activePipelines.set(input.brandId, {
      runId,
      status: "failed",
      progress: { error: err.message },
    });
  });

  return runId;
}

async function executePipeline(input: PipelineInput, brand: any, runId: number) {
  let ideasGenerated = 0;
  let ideasApproved = 0;
  let packagesGenerated = 0;
  let packagesInspected = 0;
  let packagesPassedInspection = 0;
  const errors: string[] = [];

  const updateProgress = (stage: string) => {
    activePipelines.set(input.brandId, {
      runId,
      status: "running",
      progress: { stage, ideasGenerated, ideasApproved, packagesGenerated, packagesInspected, packagesPassedInspection },
    });
  };

  try {
    // STEP 1: Generate ideas
    console.log(`[Pipeline ${runId}] Step 1: Generating ${input.ideaCount} ideas...`);
    updateProgress("generating_ideas");

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
        { role: "user", content: `Generate ${input.ideaCount} content ideas for ${brand.name}.

Mission: ${brand.mission || ""}
Positioning: ${brand.positioning || ""}
Content pillars: ${pillarNames}
Target audience: ${audienceSummary}
Tone: ${brand.toneSummary || "authoritative, empathetic"}
${doSay ? `Do say: ${doSay}` : ""}
${dontSay ? `Don't say: ${dontSay}` : ""}

Prompt style examples:
${promptExamples}

Return JSON: { "ideas": [{ "title": "...", "angle": "...", "pillar": "pillar name", "platforms": ["linkedin", "instagram", "webflow", "wechat", "blog"], "funnelStage": "awareness|consideration|conversion|retention", "summary": "2-sentence summary" }] }

CRITICAL RULES:
- NEVER use placeholder text like [Year], [Brand Name], [Company], [X%], [Number] in titles or content. Use specific real values (e.g. "2026" not "[Year]", "${brand.name}" not "[Brand Name]").
- platforms must only use these exact values: linkedin, instagram, webflow, wechat, blog, tiktok, facebook, medium, xiaohongshu, reddit, quora. Never use any other platform name.` },
      ],
      response_format: { type: "json_object" } as any,
    });

    let generatedIdeas: any[] = [];
    try {
      const raw = (ideaResponse.choices?.[0]?.message?.content as string) || "{}";
      generatedIdeas = JSON.parse(raw).ideas || [];
    } catch { generatedIdeas = []; }

    console.log(`[Pipeline ${runId}] LLM returned ${generatedIdeas.length} ideas`);

    // STEP 2: Save ideas and auto-approve
    updateProgress("saving_ideas");
    const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
    const approvedIdeaIds: number[] = [];
    
    for (const idea of generatedIdeas.slice(0, input.ideaCount)) {
      const pillar = pillars.find(p => p.name.toLowerCase() === (idea.pillar || "").toLowerCase());
      const sanitizedPlatforms = (idea.platforms || ["linkedin", "instagram"])
        .map((p: string) => p.toLowerCase().replace(/\s+/g, ""))
        .map((p: string) => p === "douyin" ? "tiktok" : p === "sinaweibo" ? "xiaohongshu" : p)
        .filter((p: string) => VALID_PLATFORMS.includes(p));
      
      const funnelStage = ["awareness", "consideration", "conversion", "retention"].includes(idea.funnelStage) 
        ? idea.funnelStage 
        : "awareness";

      const ideaResult = await createIdea({
        brandId: input.brandId,
        title: idea.title || "Untitled",
        angle: idea.angle || "",
        summary: idea.summary || "",
        targetPlatforms: sanitizedPlatforms.length > 0 ? sanitizedPlatforms : ["linkedin", "instagram"],
        funnelStage: funnelStage as any,
        pillarId: pillar?.id ?? null,
        status: input.autoApproveIdeas ? "approved" : "proposed",
        sourceType: "batch",
      });
      ideasGenerated++;
      if (input.autoApproveIdeas) {
        approvedIdeaIds.push((ideaResult as any)?.id);
        ideasApproved++;
      }
    }

    console.log(`[Pipeline ${runId}] Saved ${ideasGenerated} ideas, ${ideasApproved} approved`);
    await updatePipelineRun(runId, { ideasGenerated, ideasApproved, stage: "generating_content" });
    updateProgress("generating_content");

    // STEP 3: Generate content packages for all approved ideas
    const inspectorRulesList = input.runInspector ? await getAllInspectorRules(input.brandId) : [];

    for (let i = 0; i < approvedIdeaIds.length; i++) {
      const ideaId = approvedIdeaIds[i];
      try {
        const idea = await getIdeaById(ideaId);
        if (!idea) continue;

        console.log(`[Pipeline ${runId}] Generating package ${i + 1}/${approvedIdeaIds.length}: "${idea.title}"`);

        const pillarName = pillars.find(p => p.id === idea.pillarId)?.name || "General";
        const rawPlatforms = idea.targetPlatforms || brand.activePlatforms || ["linkedin", "instagram", "webflow"];
        const platforms = rawPlatforms.filter((p: string) => VALID_PLATFORMS.includes(p));

        const pkgResult = await createContentPackage({
          ideaId: idea.id,
          brandId: idea.brandId,
          status: "generating",
          version: 1,
        });
        const pkgId = (pkgResult as any)?.id;

        // Build dynamic prompt based on actual platforms
        const { systemPrompt, userPrompt } = buildContentPrompt({
          idea,
          pillarName,
          brand,
          doSay,
          dontSay,
          platforms,
        });

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

        console.log(`[Pipeline ${runId}] LLM returned content for "${idea.title}": hook="${(generated.masterHook || "").substring(0, 50)}", variants=${Object.keys(generated.variants || {}).join(",")}`);

        await saveGeneratedContent({ pkgId, generated, idea, platforms, userPrompt });
        packagesGenerated++;

        // Update progress in DB periodically
        if (i % 3 === 0 || i === approvedIdeaIds.length - 1) {
          await updatePipelineRun(runId, { packagesGenerated, stage: "generating_content" });
        }
        updateProgress("generating_content");

        // STEP 4: Run AI Inspector
        if (input.runInspector && inspectorRulesList.length > 0) {
          console.log(`[Pipeline ${runId}] Inspecting package ${pkgId}...`);
          updateProgress("inspecting");
          packagesInspected++;
          
          const { passed } = await runInspector({
            pkgId,
            brandId: idea.brandId,
            inspectorRules: inspectorRulesList,
          });

          if (passed) {
            packagesPassedInspection++;
          }
        } else {
          packagesPassedInspection++;
        }

        await logAudit({
          brandId: input.brandId,
          actorUserId: input.userId,
          entityType: "content_package",
          entityId: pkgId,
          action: "pipeline_generated",
          description: `Pipeline: content package generated for "${idea.title}"`,
        });
      } catch (err: any) {
        console.error(`[Pipeline ${runId}] Error for idea ${ideaId}:`, err.message);
        errors.push(`Failed for idea ${ideaId}: ${err.message}`);
      }
    }

    // Final update
    const finalStatus = errors.length === 0 ? "completed" : "partial";
    await updatePipelineRun(runId, {
      status: finalStatus,
      stage: "completed",
      ideasGenerated,
      ideasApproved,
      packagesGenerated,
      packagesInspected,
      packagesPassedInspection,
      readyForReview: packagesPassedInspection,
      errorLog: errors.length > 0 ? errors.join("\n") : null,
      completedAt: new Date(),
    });

    console.log(`[Pipeline ${runId}] Completed: ${ideasGenerated} ideas, ${packagesGenerated} packages, ${packagesPassedInspection} passed inspection`);

    activePipelines.set(input.brandId, {
      runId,
      status: finalStatus,
      progress: { stage: "completed", ideasGenerated, ideasApproved, packagesGenerated, packagesInspected, packagesPassedInspection, errors },
    });

    await logAudit({
      brandId: input.brandId,
      actorUserId: input.userId,
      entityType: "pipeline",
      action: "completed",
      description: `Pipeline completed: ${ideasGenerated} ideas, ${packagesGenerated} packages, ${packagesPassedInspection} passed inspection`,
    });
  } catch (err: any) {
    console.error(`[Pipeline ${runId}] Fatal error:`, err);
    await updatePipelineRun(runId, { status: "failed", errorLog: err.message, completedAt: new Date() });
    activePipelines.set(input.brandId, {
      runId,
      status: "failed",
      progress: { error: err.message },
    });
    throw err;
  }
}
