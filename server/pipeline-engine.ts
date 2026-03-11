/**
 * Pipeline Engine — Background-safe content generation logic
 * Extracted from routers.ts so it can run independently of HTTP request lifecycle.
 */
import { invokeLLM } from "./_core/llm";
import { humanize, humanizeVariant, humanizePackage, humanizeZh, isChineseText } from "./humanizer";
import {
  getBrandById, getContentPillars, getBrandRules, getPromptTemplates, getAudienceProfiles,
  getIdeaById, createIdea, createContentPackage, updateContentPackage,
  getVariantsByPackageId, createVariant, updateVariant,
  createAsset, updateAsset, getAssetsByPackageId, getAllInspectorRules, createInspectionReport,
  createPipelineRun, updatePipelineRun, logAudit,
} from "./db";

// ─── Pulse Branding Validated Content Prompts (9-step sequential generation) ──
// Based on: /home/ubuntu/upload/Pasted_content_03.txt
// These are the battle-tested prompts used in the Zapier automation flow.

const PULSE_STANDARD_HASHTAGS = `#subconscious #branding #marketing #graphicdesign #design #logo #digitalmarketing #brand #business #advertising #socialmediamarketing #brandidentity #entrepreneur #artificialintelligence #ai #neuroscience #neuromarketing #brandstrategy #growthhacking #startups #founderlife #scaleup`;

/**
 * Generate all content for a package using the 9 validated Pulse Branding prompts.
 * Returns a structured object with all generated content.
 */
export async function generateContentWithValidatedPrompts(params: {
  topic: string;
  brand: { name: string; url?: string | null };
}): Promise<{
  blogTitle: string;
  blogHtml: string;
  blogSubheader: string;
  blogSummary: string;
  imageConcept: string;
  imagePrompt: string;
  wechatHtml: string;
  wechatTitle: string;
  socialCaption: string;
}> {
  const { topic, brand } = params;
  const brandUrl = brand.url || 'pulse-branding.com';

  // Prompt 1: Blog Title
  const titleResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a content writer for a branding agency. Return only the requested output, no extra text.' },
      { role: 'user', content: `You are writing a blog title about ${topic}.
Requirements:
Write 1 title only.
Make it super engaging, catchy, and short.
Use plain, everyday language that is easy to understand.
Make it feel relatable to the reader's real concerns.
Avoid jargon, technical language, and promotional wording.
Do not use quotation marks or special symbols.
Make sure it can be copy-pasted directly into Webflow with no edits.
Style reference:
Why Branding Can Boost Your ROI 3X
Is Your Branding Holding You Back
The Core of Branding Explained Simply
How Can Better Branding Make You More Money
Branding Basics You Need to Know
Output:
Return the title only.
No extra text.` },
    ],
  });
  const blogTitle = humanize((titleResp.choices?.[0]?.message?.content as string || topic).trim());

  // Prompt 2: Blog Article (clean HTML)
  const articleResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a content writer for a branding agency. Return only clean HTML as instructed.' },
      { role: 'user', content: `Write a blog post about ${topic}.
Goal:
Make the topic easy to understand using simple, direct language that anyone can grasp.
Requirements:
Output in clean basic HTML only.
Allowed tags: <h1>, <p>, <strong>, <em>, <ul>, <ol>
Do not use <li>.
Do not use CSS, JavaScript, markdown, or code fences.
Do not include the title inside the blog content.
Make the HTML clean and ready to paste directly into Webflow rich text.
Content requirements:
Explain what the topic is in simple terms.
Explain why it matters.
Give clear, practical, actionable advice.
Help readers understand how to apply it to improve their business.
Keep the tone down-to-earth, helpful, and conversational.
Avoid promotional language and empty hype.
Output:
Return HTML only.
No intro note.
No markdown.
No code block.` },
    ],
  });
  const blogHtml = (articleResp.choices?.[0]?.message?.content as string || '').trim();

  // Prompt 3: Blog Subheader
  const subheaderResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a content writer. Return only the requested output.' },
      { role: 'user', content: `Write a short and engaging subheader for the blog title "${blogTitle}", based on the topic ${topic}.
Requirements:
Maximum 8 words.
Use simple, direct, everyday language.
Make it instantly understandable.
Keep it relatable and aligned with the core message.
Avoid jargon, complexity, and promotional tone.
Make sure it can be pasted directly into Webflow with no edits.
Output:
Return the subheader only.
No extra text.` },
    ],
  });
  const blogSubheader = humanize((subheaderResp.choices?.[0]?.message?.content as string || '').trim());

  // Prompt 4: Blog Summary
  const summaryResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a content writer. Return only the requested output.' },
      { role: 'user', content: `Based on the blog content below, write a short and engaging summary for the article about ${topic}.
Content:
${blogHtml.substring(0, 2000)}
Requirements:
Maximum 280 characters total.
Start with a punchy question that hits the reader's core pain point.
Add a line break after the first line.
The second line should explain the concept using a simple everyday analogy.
End with a line that encourages the reader to read the full blog.
Keep the tone down-to-earth, conversational, and natural.
Do not oversell.
Do not use emojis.
Make it ready to paste directly into Webflow.
Output:
Return the summary only.
No extra text.` },
    ],
  });
  const blogSummary = humanize((summaryResp.choices?.[0]?.message?.content as string || '').trim());

  // Prompt 5: Banner Image Concept
  const conceptResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a visual director. Return only the requested output.' },
      { role: 'user', content: `Read the blog content below and suggest the single best banner image concept.
Content:
${blogHtml.substring(0, 2000)}
Requirements:
Give 1 image suggestion only.
Focus only on what should be visually shown.
No text or symbols inside the image.
If people appear, use no more than 2 people.
Use visual metaphor logic when helpful, but do not explain the metaphor.
Only describe what is visible in the image.
Include:
main objects or subjects
composition/layout
lighting
texture
mood
Do not explain the meaning.
Do not include anything beyond the visual description.
Output:
Return one clean image description only.` },
    ],
  });
  const imageConcept = (conceptResp.choices?.[0]?.message?.content as string || '').trim();

  // Prompt 6: Image Generation Prompt
  const imgPromptResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are an AI image prompt engineer. Return only the final image prompt.' },
      { role: 'user', content: `Create a high-end image generation prompt based on this image concept:
${imageConcept}
Requirements:
Hyperrealistic photo
Horizontal composition
16:9 aspect ratio
No text or symbols in the image
Cool tone overall
Use teal, blue, and violet neon highlights
Natural light feel
Detailed, polished, visually striking
Suitable as a blog banner
Output:
Return the final image prompt only.` },
    ],
  });
  const imagePrompt = (imgPromptResp.choices?.[0]?.message?.content as string || '').trim();

  // Prompt 7: WeChat Article Adaptation
  const wechatResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a Chinese content writer. Return only clean HTML as instructed.' },
      { role: 'user', content: `Transform the following English content into a reader-focused WeChat article in Chinese.
Source content:
${blogHtml.substring(0, 3000)}
Requirements:
Write in natural, conversational, human-like Chinese.
Focus on the reader's perspective.
Adapt the content for Chinese social media culture and reading habits.
Use phrasing that feels relatable and familiar to a Chinese audience.
Keep it concise, lively, and practical.
Use short, impactful sentences.
Add strong hooks at the beginning and smooth transitions throughout.
Reduce any obvious AI-generated feel.
Avoid repetitive structure and robotic phrasing.
Use culturally familiar examples, scenes, or analogies where helpful.
End with a clear, motivating call to action, such as inviting comments, discussion, sharing, or direct contact.
Formatting requirements:
Output in clean basic HTML only.
Allowed tags: <h1>, <p>, <strong>, <em>, <ul>, <ol>
Do not use <li>.
Do not use CSS, JavaScript, markdown, or code fences.
Make it ready to paste directly into WeChat rich text.
Output:
Return HTML only.
No extra text.` },
    ],
  });
  // Apply Chinese humanizer pass to strip AI filler phrases from WeChat content
  const wechatHtml = humanizeZh((wechatResp.choices?.[0]?.message?.content as string || '').trim());

  // Prompt 8: WeChat Title
  const wechatTitleResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a Chinese content writer. Return only the requested output.' },
      { role: 'user', content: `Write a title for this WeChat article.
Content:
${wechatHtml.substring(0, 1000)}
Requirements:
Chinese only.
Maximum 20 Chinese characters.
Clear, catchy, and easy to understand.
Natural and reader-friendly.
Avoid stiff, formal, or clickbait wording.
Output:
Return the title only.` },
    ],
  });
  const wechatTitle = humanizeZh((wechatTitleResp.choices?.[0]?.message?.content as string || '').trim());

  // Prompt 9: Social Caption (LinkedIn / Instagram / X cross-platform)
  const captionResp = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a social media content writer. Return only the requested output.' },
      { role: 'user', content: `Based on the content below, write a short share caption for this blog article about ${topic}.
Content:
${blogHtml.substring(0, 2000)}
Requirements:
Total length must be under 140 characters including hashtags.
Start with a punchy question that hits the core pain point.
Add a line break after the first line.
Keep the tone down-to-earth, conversational, and clear.
Avoid overselling.
Do not use emojis.
Include at least 5 relevant hashtags.
End with a short prompt encouraging people to read the blog at ${brandUrl}.
Make it usable across LinkedIn personal, LinkedIn company page, Instagram, and X with no edits.
Output:
Return the caption only.
No extra text.` },
    ],
  });
  const socialCaption = humanize((captionResp.choices?.[0]?.message?.content as string || '').trim());

  return { blogTitle, blogHtml, blogSubheader, blogSummary, imageConcept, imagePrompt, wechatHtml, wechatTitle, socialCaption };
}

/**
 * Build the full content generation prompt for a given idea and platforms.
 * Legacy single-call approach — kept as fallback for manual regeneration.
 */
export function buildContentPrompt(params: {
  idea: { title: string; angle?: string | null; summary?: string | null; funnelStage?: string | null };
  pillarName: string;
  brand: { name: string; mission?: string | null; positioning?: string | null; toneSummary?: string | null };
  doSay: string;
  dontSay: string;
  platforms: string[];
}): { systemPrompt: string; userPrompt: string } {
  const { idea, brand } = params;
  const systemPrompt = `You are Caelum Liu, Chief Growth Officer for ${brand.name}. You are a world-class brand content strategist. Generate high-quality, on-brand content packages. Always return ONLY valid JSON. Never include markdown formatting like **, ##, or em-dashes in the content itself.`;
  const userPrompt = `Generate a complete content package for this approved idea:

Title: ${idea.title}
Angle: ${idea.angle || ''}
Summary: ${idea.summary || ''}
Brand: ${brand.name}
Mission: ${brand.mission || ''}
Positioning: ${brand.positioning || ''}
Tone: ${brand.toneSummary || 'authoritative, empathetic, forward-thinking'}

Return ONLY valid JSON:
{
  "masterHook": "Compelling one-line hook",
  "masterAngle": "Core strategic angle",
  "cta": "Call to action",
  "keyPoints": ["insight 1", "insight 2", "insight 3"],
  "variants": {
    "linkedin": { "title": "title", "body": "LinkedIn post (1200-1800 chars, thought leadership, ends with question, no markdown)", "hashtags": [] },
    "instagram": { "caption": "Instagram caption (150-300 chars, strong hook)", "hashtags": [] },
    "facebook": { "body": "Facebook post (200-400 chars)", "hashtags": [] }
  }
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
    
    const isZhPlatform = platform === "wechat" || platform === "xiaohongshu";
    const cleanVariant = humanizeVariant({
      title: cleanPlaceholders(v.title || generated.masterHook || idea.title, brandName),
      body: cleanPlaceholders(body, brandName),
      caption: cleanPlaceholders(caption, brandName),
      hashtags: (v.hashtags || []).map((h: string) => cleanPlaceholders(h, brandName)),
    });
    // Apply Chinese humanizer second pass for Chinese platforms
    if (isZhPlatform) {
      if (cleanVariant.body) cleanVariant.body = humanizeZh(cleanVariant.body);
      if (cleanVariant.caption) cleanVariant.caption = humanizeZh(cleanVariant.caption);
      if (cleanVariant.title) cleanVariant.title = humanizeZh(cleanVariant.title);
    }
    
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
    const VALID_PLATFORMS = ["instagram","facebook","linkedin","tiktok","webflow","medium","reddit","quora","blog"];
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

        // ─── STEP 3: Generate content using 9 validated Pulse Branding prompts sequentially ──
        console.log(`[Pipeline ${runId}] Running 9-step validated content generation for "${idea.title}"...`);
        
        const topic = `${idea.title}${idea.angle ? ` — ${idea.angle}` : ''}`;
        const content9 = await generateContentWithValidatedPrompts({
          topic,
          brand: { name: brand.name, url: (brand as any).websiteUrl || 'pulse-branding.com' },
        });

        console.log(`[Pipeline ${runId}] 9-step generation complete: title="${content9.blogTitle}", blogHtml=${content9.blogHtml.length}chars, wechat=${content9.wechatHtml.length}chars`);

        // Map 9-step output to the DB structure
        const brandName = brand.name;
        const cleanedBlogHtml = cleanPlaceholders(content9.blogHtml, brandName);
        const cleanedWechatHtml = cleanPlaceholders(content9.wechatHtml, brandName);
        const cleanedCaption = cleanPlaceholders(content9.socialCaption, brandName);

        // Save the package with blog content and master hook from the generated title
        await updateContentPackage(pkgId, {
          masterHook: content9.blogTitle,
          masterAngle: cleanPlaceholders(idea.angle || content9.blogSubheader, brandName),
          cta: `Explore how ${brandName} can help you build a stronger brand — visit pulse-branding.com`,
          keyPoints: [
            content9.blogSubheader,
            content9.blogSummary,
            `Read the full article at pulse-branding.com`,
          ].filter(Boolean),
          blogContent: cleanedBlogHtml,
          status: "generated",
          generationModel: process.env.DOUBAO_TEXT_MODEL || "doubao-1-5-pro-32k-250115",
          generationPrompt: `9-step validated prompts for topic: ${topic}`,
        });

        // Save Webflow variant (blog article HTML)
        await createVariant({
          contentPackageId: pkgId,
          brandId: idea.brandId,
          platform: "webflow" as any,
          formatType: "article",
          title: content9.blogTitle,
          body: cleanedBlogHtml,
          caption: content9.blogSummary,
          hashtags: [],
          status: "generated",
          version: 1,
        });

        // Save Blog variant (same as Webflow but stored separately)
        await createVariant({
          contentPackageId: pkgId,
          brandId: idea.brandId,
          platform: "blog" as any,
          formatType: "article",
          title: content9.blogTitle,
          body: cleanedBlogHtml,
          caption: content9.blogSummary,
          hashtags: [],
          status: "generated",
          version: 1,
        });

        // Save LinkedIn variant (social caption adapted for LinkedIn)
        const linkedinBody = `${cleanedCaption}\n\nRead the full article: pulse-branding.com`;
        await createVariant({
          contentPackageId: pkgId,
          brandId: idea.brandId,
          platform: "linkedin" as any,
          formatType: "long_post",
          title: content9.blogTitle,
          body: linkedinBody,
          caption: cleanedCaption,
          hashtags: PULSE_STANDARD_HASHTAGS.split(' ').slice(0, 10),
          status: "generated",
          version: 1,
        });

        // Save Instagram variant (social caption)
        await createVariant({
          contentPackageId: pkgId,
          brandId: idea.brandId,
          platform: "instagram" as any,
          formatType: "caption",
          title: content9.blogTitle,
          body: "",
          caption: cleanedCaption,
          hashtags: PULSE_STANDARD_HASHTAGS.split(' '),
          status: "generated",
          version: 1,
        });

        // Save image prompt asset (from validated Prompt #6)
        const imagePromptText = content9.imagePrompt || `Hyperrealistic photo, horizontal composition, 16:9 aspect ratio, no text or symbols, cool tone, teal blue violet neon highlights, natural light, detailed polished visually striking, suitable as blog banner: ${content9.imageConcept}`;
        const imagePromptAsset = await createAsset({
          contentPackageId: pkgId,
          assetType: "image_prompt",
          promptText: imagePromptText,
          status: "ready",
          version: 1,
        });

        packagesGenerated++;

        // Update progress in DB periodically
        if (i % 3 === 0 || i === approvedIdeaIds.length - 1) {
          await updatePipelineRun(runId, { packagesGenerated, stage: "generating_content" });
        }
        updateProgress("generating_content");

        // STEP 3c: Auto-generate image using the validated image prompt
        try {
          console.log(`[Pipeline ${runId}] Generating image for package ${pkgId}...`);
          updateProgress("generating_images");
          const { generateImage } = await import("./_core/imageGeneration");
          const promptAssetId = (imagePromptAsset as any)?.id;
          if (promptAssetId) await updateAsset(promptAssetId, { status: "generating" });
          const { url } = await generateImage({ prompt: imagePromptText });
          await createAsset({
            contentPackageId: pkgId,
            assetType: "image_output",
            promptText: imagePromptText,
            outputUrl: url,
            provider: "manus-image",
            status: "ready",
            version: 1,
          });
          if (promptAssetId) await updateAsset(promptAssetId, { status: "ready" });
          console.log(`[Pipeline ${runId}] Image generated for package ${pkgId}`);
        } catch (imgErr: any) {
          console.warn(`[Pipeline ${runId}] Image generation failed for package ${pkgId}:`, imgErr.message);
          // Non-fatal — continue pipeline
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
