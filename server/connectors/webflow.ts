import type { ExecutionPayload } from "../../drizzle/schema";

export interface WebflowPostResult {
  itemId: string;
  slug?: string;
}

/** Map an ExecutionPayload to Webflow CMS fields. Keys are Pulse field names; values are Webflow field slugs. */
export function mapPayloadToWebflowFields(
  payload: ExecutionPayload,
  fieldMapping: Record<string, string>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const map: Record<string, unknown> = {
    headline: payload.content.headline,
    body: payload.content.body,
    caption: payload.content.caption,
    cta_url: payload.content.cta_url,
    hashtags: payload.metadata.hashtags.map(h => `#${h}`).join(" "),
    optimal_time: payload.metadata.optimal_time,
    trending_score: payload.metadata.trending_score,
    first_comment: payload.instructions.first_comment,
  };
  for (const [pulseField, webflowField] of Object.entries(fieldMapping)) {
    if (pulseField.startsWith("_")) continue; // internal keys
    if (map[pulseField] !== undefined) fields[webflowField] = map[pulseField];
  }
  return fields;
}

/** Publish an item to a Webflow CMS collection. */
export async function publishToWebflow(params: {
  apiToken: string;
  collectionId: string;
  fields: Record<string, unknown>;
}): Promise<WebflowPostResult> {
  const { apiToken, collectionId, fields } = params;

  const resp = await fetch(
    `https://api.webflow.com/v2/collections/${collectionId}/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        "accept-version": "2.0.0",
      },
      body: JSON.stringify({ fieldData: fields, isDraft: false }),
    },
  );

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Webflow publish failed (${resp.status}): ${err.slice(0, 300)}`);
  }

  const data = (await resp.json()) as { id?: string; slug?: string };
  return { itemId: data.id ?? "", slug: data.slug };
}
