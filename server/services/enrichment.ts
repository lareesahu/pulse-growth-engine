import { invokeLLM } from "../_core/llm";

export interface EnrichmentResult {
  hashtags: string[];
  tags: string[];
  trending_score: number;
}

/**
 * Enrich a payload with trending hashtags, tagging suggestions, and a trend score.
 * Uses LLM-simulated trend analysis per spec Section 2, Sprint 2.
 */
export async function enrichPayload(params: {
  platform: string;
  content: string;
  brandName: string;
  competitorMap?: string[];
}): Promise<EnrichmentResult> {
  const { platform, content, brandName, competitorMap } = params;

  const resp = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a social media trend analyst. Return ONLY valid JSON with no extra text.",
      },
      {
        role: "user",
        content: `Analyze this content and return enrichment data for posting on ${platform}.

Brand: ${brandName}
Content: ${content.substring(0, 600)}
${competitorMap?.length ? `Industry/competitor accounts relevant to this topic: ${competitorMap.slice(0, 5).join(", ")}` : ""}

Return JSON with EXACTLY this structure:
{
  "hashtags": ["up to 10 trending relevant hashtags without the # symbol"],
  "tags": ["up to 3 specific account handles (without @) relevant to tag in this post"],
  "trending_score": <integer 1-100 representing current trend relevance for this content>
}`,
      },
    ],
    response_format: { type: "json_object" } as any,
  });

  try {
    const raw = (resp.choices?.[0]?.message?.content as string) || "{}";
    const result = JSON.parse(raw);
    return {
      hashtags: Array.isArray(result.hashtags)
        ? result.hashtags.slice(0, 10).map((h: string) => h.replace(/^#/, "").trim()).filter(Boolean)
        : [],
      tags: Array.isArray(result.tags)
        ? result.tags.slice(0, 3).map((t: string) => t.replace(/^@/, "").trim()).filter(Boolean)
        : [],
      trending_score: Math.min(100, Math.max(1, Math.round(Number(result.trending_score) || 50))),
    };
  } catch {
    return { hashtags: [], tags: [], trending_score: 50 };
  }
}
