/**
 * Seed script: Pulse Branding default brand with full DNA from Brand Bible
 * Run: node seed-pulse-branding.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// ─── Helper: raw insert ───────────────────────────────────────────────────────
async function run(sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

console.log("🌱 Seeding Pulse Branding...");

// 0. Ensure owner user exists
const ownerOpenId = process.env.OWNER_OPEN_ID || 'seed-owner';
const ownerName = process.env.OWNER_NAME || 'Lareesa Hu';
await run(`INSERT INTO users (openId, name, role) VALUES (?, ?, 'admin') ON DUPLICATE KEY UPDATE name = VALUES(name)`,
  [ownerOpenId, ownerName]);
const [ownerRow] = await run("SELECT id FROM users WHERE openId = ? LIMIT 1", [ownerOpenId]);
const ownerId = ownerRow.id;
console.log("✅ Owner user id:", ownerId);

// 1. Check if brand already exists
const [existing] = await run("SELECT id FROM brands WHERE name = 'Pulse Branding' LIMIT 1");
if (existing) {
  console.log("✅ Pulse Branding already seeded (id:", existing.id, "). Skipping.");
  await conn.end();
  process.exit(0);
}

// 2. Create brand
await run(`
  INSERT INTO brands (
    userId, name, description, mission, positioning, audienceSummary, toneSummary,
    website, colorPalette, activePlatforms, status, isDefault
  ) VALUES (
    ${ownerId},
    'Pulse Branding',
    'A brand strategy and identity consultancy that uses neuroscience-backed insights to build brands that resonate at a deeper psychological level.',
    'To help ambitious founders and businesses build brands that are not just seen, but felt — brands that create genuine emotional connection and drive sustainable growth.',
    'The only branding agency that combines strategic brand consulting with neuroscience-backed insights and a proprietary Neuro-Insight methodology — bridging the gap between brand identity and measurable business impact.',
    'Ambitious founders and entrepreneurs; Marketing Directors and CMOs; Chinese-speaking business owners expanding internationally',
    'Authoritative yet approachable. Insightful without being academic. Confident without being arrogant. Warm and human. Strategic Thinker, Empathetic Advisor, Brave Challenger, Practical Visionary.',
    'https://pulse-branding.com',
    '{"primary":"#3AC1EC","secondary":"#2163AF","accent":"#291C53","midnight":"#0A1931","teal":"#56C4C4"}',
    JSON_ARRAY('linkedin', 'instagram', 'webflow', 'wechat'),
    'active',
    1
  )
`);

const [brandRow] = await run("SELECT id FROM brands WHERE name = 'Pulse Branding' LIMIT 1");
const brandId = brandRow.id;
console.log("✅ Brand created with id:", brandId);

// 3. Content Pillars
const pillars = [
  { name: "Brand Strategy & Identity", description: "Deep dives into brand positioning, identity systems, and strategic frameworks", priority: 1 },
  { name: "Neuro-Insight & Psychology", description: "How the brain processes brands — neuroscience applied to marketing and design", priority: 2 },
  { name: "Founder & Entrepreneur Stories", description: "Real stories of brand-building journeys, challenges, and breakthroughs", priority: 3 },
  { name: "Industry Insights & Trends", description: "What's changing in branding, marketing, and consumer behaviour", priority: 4 },
  { name: "Case Studies & Proof Points", description: "Real client transformations and measurable brand impact stories", priority: 5 },
  { name: "Practical Brand Tips", description: "Actionable, immediately applicable brand-building advice", priority: 6 },
];
for (const p of pillars) {
  await run("INSERT INTO content_pillars (brandId, name, description, priority) VALUES (?, ?, ?, ?)",
    [brandId, p.name, p.description, p.priority]);
}
console.log("✅ Content pillars seeded:", pillars.length);

// 4. Brand Rules (Do Say / Don't Say)
const rules = [
  { ruleType: "do_say", content: "Use concrete business outcomes: 'increased brand recall by 40%'" },
  { ruleType: "do_say", content: "Reference neuroscience and psychology to back up claims" },
  { ruleType: "do_say", content: "Speak to the founder's emotional journey, not just tactics" },
  { ruleType: "do_say", content: "Use 'brand equity', 'emotional resonance', 'brand architecture'" },
  { ruleType: "do_say", content: "Include a clear, single CTA at the end of every post" },
  { ruleType: "dont_say", content: "Don't use 'synergy', 'leverage', 'disruptive' without context" },
  { ruleType: "dont_say", content: "Don't make it about Pulse Branding — make it about the reader's brand" },
  { ruleType: "dont_say", content: "Don't use passive voice or overly academic language" },
  { ruleType: "dont_say", content: "Don't promise overnight results or use hype language" },
  { ruleType: "platform_rule", content: "LinkedIn: 150-300 words, professional tone, end with a question to drive comments" },
  { ruleType: "platform_rule", content: "Instagram: 80-150 words, more visual and emotional, heavy hashtag use (22 tags)" },
  { ruleType: "platform_rule", content: "WeChat: 800-2000 characters, more formal, include brand story elements" },
  { ruleType: "platform_rule", content: "Blog/Webflow: 800-1500 words, SEO-optimised, include subheadings and a CTA" },
];
for (const r of rules) {
  await run("INSERT INTO brand_rules (brandId, ruleType, content, scope) VALUES (?, ?, ?, ?)",
    [brandId, r.ruleType, r.content, 'global']);
}
console.log("✅ Brand rules seeded:", rules.length);

// 5. Audience Profiles
const audiences = [
  {
    segment: "Ambitious Founders & Entrepreneurs",
    description: "Founders of SMEs and startups who have built a product or service but struggle to articulate their brand story and differentiate in the market.",
    painPoints: "Invisible in a crowded market; inconsistent brand messaging; no clear positioning; wasting money on marketing that doesn't convert",
    goals: "Build a brand that attracts premium clients; create a recognisable identity; scale with confidence",
    platforms: JSON.stringify(["linkedin", "instagram"]),
  },
  {
    segment: "Marketing Directors & CMOs",
    description: "Senior marketing leaders at mid-size companies who need strategic brand consulting to align internal teams and external communications.",
    painPoints: "Fragmented brand identity across touchpoints; difficulty measuring brand ROI; internal misalignment on brand values",
    goals: "Unified brand architecture; measurable brand equity; strategic clarity",
    platforms: JSON.stringify(["linkedin"]),
  },
  {
    segment: "Chinese-Speaking Business Owners",
    description: "Chinese entrepreneurs and business owners in Asia looking to build internationally credible brands or expand into English-speaking markets.",
    painPoints: "Cultural translation of brand values; building trust with Western audiences; premium positioning",
    goals: "International brand credibility; cross-cultural brand strategy",
    platforms: JSON.stringify(["wechat", "linkedin"]),
  },
];
for (const a of audiences) {
  await run("INSERT INTO audience_profiles (brandId, segment, description, painPoints, goals) VALUES (?, ?, ?, ?, ?)",
    [brandId, a.segment, a.description, a.painPoints, a.goals]);
}
console.log("✅ Audience profiles seeded:", audiences.length);

// 6. Prompt Templates (the 9 validated prompts from the Brand Bible)
const prompts = [
  {
    name: "LinkedIn Thought Leadership Post",
    platform: "linkedin",
    contentType: "social_post",
    promptText: `You are Caelum Liu, Chief Growth Officer for Pulse Branding. Write a LinkedIn thought leadership post for Pulse Branding.

Brand voice: Authoritative yet approachable, insightful, confident but warm.
Topic: [TOPIC]
Content pillar: [PILLAR]
Angle: [ANGLE]

Requirements:
- Hook in the first line (no "I" as first word)
- 150-250 words
- 3-5 key insights with line breaks for readability
- End with a thought-provoking question
- Professional but human tone
- No hashtags in body (add separately)

Output the post only, no commentary.`,
  },
  {
    name: "Instagram Caption",
    platform: "instagram",
    contentType: "social_post",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Write an Instagram caption.

Brand voice: Visual, emotional, inspiring. More personal than LinkedIn.
Topic: [TOPIC]
Angle: [ANGLE]

Requirements:
- Attention-grabbing opening line
- 80-150 words
- Conversational and warm
- End with a CTA (save this, share with a founder you know, etc.)
- Include line breaks for readability

Then on a new line, add exactly 22 relevant hashtags including: #pulsebranding #brandstrategy #brandidentity #branding #brandbuilding

Output caption + hashtags only.`,
  },
  {
    name: "Blog Article (Webflow)",
    platform: "webflow",
    contentType: "blog_post",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Write a full blog article for pulse-branding.com.

Topic: [TOPIC]
Angle: [ANGLE]
Target audience: Ambitious founders and marketing leaders
SEO keyword: [KEYWORD]

Requirements:
- Title (H1): Compelling, SEO-friendly, 50-60 characters
- Introduction: Hook + problem statement + what reader will learn (150 words)
- 4-6 subheadings (H2) with 150-200 words each
- Include 1-2 relevant statistics or research references
- Conclusion with key takeaways
- CTA: Invite readers to book a brand audit at pulse-branding.com
- Total: 800-1200 words
- Tone: Expert but accessible

Output full article in Markdown format.`,
  },
  {
    name: "WeChat Article",
    platform: "wechat",
    contentType: "article",
    promptText: `你是Pulse Branding的首席增长官Caelum Liu。为Pulse Branding的微信公众号撰写一篇文章。

主题：[TOPIC]
角度：[ANGLE]
目标读者：中国创业者和企业主

要求：
- 标题：吸引眼球，8-15字
- 开篇：引人入胜的故事或问题（200字）
- 正文：4-5个核心观点，每个200-300字
- 包含实际案例或数据支撑
- 结尾：总结+行动号召（预约品牌诊断）
- 总字数：1500-2500字
- 语气：专业权威但亲切易懂

以Markdown格式输出完整文章。`,
  },
  {
    name: "Content Batch Ideas Generator",
    platform: "all",
    contentType: "ideas",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Generate [COUNT] unique, strategic content ideas.

Brand: Pulse Branding
Mission: Help founders build brands that create genuine emotional connection
Content pillars: Brand Strategy, Neuro-Insight, Founder Stories, Industry Trends, Case Studies, Practical Tips
Target platforms: LinkedIn, Instagram, Webflow blog, WeChat

For each idea provide:
- Title: Compelling, specific headline
- Angle: The unique perspective or hook
- Pillar: Which content pillar it belongs to
- Platform: Primary platform (linkedin/instagram/webflow/wechat/all)
- Funnel stage: awareness/consideration/conversion/retention

Return as JSON: { "ideas": [{ "title": "...", "angle": "...", "pillar": "...", "platform": "...", "funnelStage": "..." }] }`,
  },
  {
    name: "Image Prompt Generator",
    platform: "all",
    contentType: "image_prompt",
    promptText: `Generate a detailed image generation prompt for a Pulse Branding social media post.

Topic: [TOPIC]
Platform: [PLATFORM]
Brand colours: Jellyfish (#3AC1EC), Blue Hosta (#56C4C4), Mid Blue (#2163AF), Violent Violet (#291C53), Midnight (#0A1931)
Brand aesthetic: Clean, geometric, professional, modern, sophisticated

The image should:
- Reflect the brand's premium positioning
- Use the brand colour palette
- Be appropriate for [PLATFORM] dimensions
- Avoid stock photo clichés
- Convey [EMOTION/CONCEPT]

Output a single, detailed image generation prompt only.`,
  },
  {
    name: "LinkedIn Company Update",
    platform: "linkedin",
    contentType: "social_post",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Write a LinkedIn company page update.

Topic: [TOPIC]
Type: [announcement/insight/case study/tip]

Requirements:
- 100-200 words
- Professional company voice (third person or "we")
- Lead with the value/insight, not the company
- Include a subtle CTA
- 3-5 relevant hashtags at the end

Output the post only.`,
  },
  {
    name: "Email Newsletter Snippet",
    platform: "email",
    contentType: "newsletter",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Write an email newsletter section.

Topic: [TOPIC]
Section type: [featured article / quick tip / case study highlight / upcoming event]

Requirements:
- Subject line suggestion
- 150-250 words
- Personal, direct tone (from Lareesa)
- One clear CTA with link placeholder [CTA_URL]
- No images described (text only)

Output subject line + body only.`,
  },
  {
    name: "Content Repurposing (Long → Short)",
    platform: "all",
    contentType: "repurpose",
    promptText: `You are Caelum Liu, CGO for Pulse Branding. Repurpose this long-form content into platform-specific short formats.

Original content: [ORIGINAL_CONTENT]

Create:
1. LinkedIn post (150-200 words, thought leadership angle)
2. Instagram caption (80-120 words, more emotional/visual)
3. Twitter/X thread opener (280 chars max)
4. WeChat one-liner hook (Chinese, 30-50 chars)

Maintain Pulse Branding voice: authoritative, warm, insightful.
Output each format clearly labelled.`,
  },
];

for (const p of prompts) {
  await run("INSERT INTO prompt_templates (brandId, name, platform, promptText, isActive) VALUES (?, ?, ?, ?, ?)",
    [brandId, p.name, p.platform, p.promptText, 1]);
}
console.log("✅ Prompt templates seeded:", prompts.length);

// 7. Platform Preferences
const platformPrefs = [
  { platform: "linkedin", postFormat: "150-300 words, professional tone, end with a question", hashtagStrategy: "3-5 relevant hashtags at end", frequency: "3x per week", toneNotes: "Thought leadership, authoritative but warm" },
  { platform: "instagram", postFormat: "80-150 words, visual and emotional", hashtagStrategy: "22 hashtags including #pulsebranding #brandstrategy", frequency: "4x per week", toneNotes: "More personal, inspiring, visual" },
  { platform: "webflow", postFormat: "800-1500 words, SEO-optimised blog article with H2 subheadings", hashtagStrategy: "No hashtags", frequency: "1x per week", toneNotes: "Expert, accessible, includes CTA to book brand audit" },
  { platform: "wechat", postFormat: "1500-2500 Chinese characters, formal article format", hashtagStrategy: "No hashtags", frequency: "2x per week", toneNotes: "Professional, authoritative, Chinese audience" },
];
for (const p of platformPrefs) {
  await run(`INSERT INTO platform_preferences (brandId, platform, postFormat, hashtagStrategy, frequency, toneNotes)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [brandId, p.platform, p.postFormat, p.hashtagStrategy, p.frequency, p.toneNotes]);
}
console.log("✅ Platform preferences seeded:", platformPrefs.length);

console.log("\n🎉 Pulse Branding seeded successfully! Brand ID:", brandId);
await conn.end();
