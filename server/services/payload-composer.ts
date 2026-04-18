import type { ExecutionPayload } from "../../drizzle/schema";
import { enrichPayload } from "./enrichment";
import { getOptimalPostingTimeForBrand } from "./timing";
import {
  getBrandById,
  getBrandRules,
  getVariantsByPackageId,
  getContentPackageById,
  getIdeaById,
} from "../db";

type PayloadPlatform = ExecutionPayload["platform"];

/**
 * Compose a fully-structured ExecutionPayload from existing brand brain data.
 * Aggregates: brand context, content variant, enrichment, and timing.
 * Spec: Section 2, Sprint 1 — PayloadComposer service.
 */
export async function composePayload(params: {
  ideaId: number;
  brandId: number;
  platform: PayloadPlatform;
  contentPackageId: number;
}): Promise<Omit<ExecutionPayload, "id">> {
  const { ideaId, brandId, platform, contentPackageId } = params;

  const [brand, pkg, idea] = await Promise.all([
    getBrandById(brandId),
    getContentPackageById(contentPackageId),
    getIdeaById(ideaId),
  ]);

  if (!brand) throw new Error(`Brand ${brandId} not found`);
  if (!pkg) throw new Error(`Content package ${contentPackageId} not found`);
  if (!idea) throw new Error(`Idea ${ideaId} not found`);

  // Pick the best matching variant for the requested platform
  const variants = await getVariantsByPackageId(contentPackageId);
  const platformAlias = platform === "x" ? "linkedin" : platform;
  const variant = variants.find(v => v.platform === platformAlias) ?? variants[0];

  // Gather competitor/tagging context from brand rules
  const rules = await getBrandRules(brandId);
  const competitorMap = rules
    .filter(r => r.ruleType === "platform_rule")
    .map(r => r.content)
    .slice(0, 5);

  const body = variant?.body || pkg.masterHook || idea.title;
  const caption = variant?.caption || pkg.cta || "";
  const headline = variant?.title || pkg.masterHook || idea.title;

  // Parallel: enrich + timing
  const [enrichment, timing] = await Promise.all([
    enrichPayload({ platform, content: body, brandName: brand.name, competitorMap }),
    getOptimalPostingTimeForBrand({ brandId, platform }),
  ]);

  const topicLabel = idea.title.split(":")[0].toLowerCase();

  return {
    ideaId,
    platform,
    status: "draft",
    content: {
      body,
      caption,
      headline,
      cta_url: brand.website ?? undefined,
    },
    metadata: {
      hashtags: enrichment.hashtags,
      tags: enrichment.tags,
      optimal_time: timing.optimal_time,
      trending_score: enrichment.trending_score,
    },
    instructions: {
      first_comment: `What's your experience with ${topicLabel}? Drop a comment — I read every reply.`,
      engagement_strategy: `Post at ${timing.optimal_time} (${timing.timezone}). Engage with the first 10 comments within 30 minutes to boost algorithmic reach.`,
      follow_up_trigger: `If engagement exceeds 50 interactions within 2 hours, reply personally to the top 3 commenters.`,
    },
  };
}
