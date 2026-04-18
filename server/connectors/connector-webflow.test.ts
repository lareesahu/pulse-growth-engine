import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapPayloadToWebflowFields, publishToWebflow } from "./webflow";
import type { ExecutionPayload } from "../../drizzle/schema";

const mockPayload: ExecutionPayload = {
  id: "42",
  ideaId: 5,
  platform: "webflow",
  status: "approved",
  content: {
    body: "This is the full blog post body.",
    caption: "Short SEO summary for the blog.",
    headline: "Why Branding Matters in 2026",
    cta_url: "https://pulse-branding.com",
  },
  metadata: {
    hashtags: ["branding", "marketing", "growth"],
    tags: ["manus_ai"],
    optimal_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    trending_score: 80,
  },
  instructions: {
    first_comment: "What do you think?",
    engagement_strategy: "Respond within 30 mins.",
    follow_up_trigger: "Reply to top commenters.",
  },
};

describe("mapPayloadToWebflowFields", () => {
  it("maps headline to the configured Webflow field", () => {
    const result = mapPayloadToWebflowFields(mockPayload, { headline: "name" });
    expect(result["name"]).toBe("Why Branding Matters in 2026");
  });

  it("maps body to the configured Webflow field", () => {
    const result = mapPayloadToWebflowFields(mockPayload, { body: "post-body" });
    expect(result["post-body"]).toBe("This is the full blog post body.");
  });

  it("maps hashtags as a space-separated string with # prefix", () => {
    const result = mapPayloadToWebflowFields(mockPayload, { hashtags: "tags-field" });
    expect(result["tags-field"]).toBe("#branding #marketing #growth");
  });

  it("maps optimal_time to the configured field", () => {
    const result = mapPayloadToWebflowFields(mockPayload, { optimal_time: "publish-at" });
    expect(result["publish-at"]).toBe(mockPayload.metadata.optimal_time);
  });

  it("skips internal keys starting with underscore", () => {
    const result = mapPayloadToWebflowFields(mockPayload, {
      _collectionId: "abc123",
      headline: "name",
    });
    expect(result["_collectionId"]).toBeUndefined();
    expect(result["name"]).toBe("Why Branding Matters in 2026");
  });

  it("produces no extra fields beyond what is mapped", () => {
    const result = mapPayloadToWebflowFields(mockPayload, { headline: "name" });
    expect(Object.keys(result)).toEqual(["name"]);
  });
});

describe("publishToWebflow", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls the correct Webflow API endpoint", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "item_abc", slug: "why-branding-matters" }),
    } as any);

    await publishToWebflow({
      apiToken: "test_token",
      collectionId: "col_123",
      fields: { name: "Why Branding Matters" },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("col_123"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns itemId from the API response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "item_abc123" }),
    } as any);

    const result = await publishToWebflow({
      apiToken: "tok",
      collectionId: "col",
      fields: { name: "Title" },
    });

    expect(result.itemId).toBe("item_abc123");
  });

  it("throws when API returns a non-ok status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as any);

    await expect(
      publishToWebflow({ apiToken: "bad", collectionId: "col", fields: {} }),
    ).rejects.toThrow("Webflow publish failed");
  });

  it("includes Authorization header with Bearer token", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "x" }),
    } as any);

    await publishToWebflow({ apiToken: "my_token_abc", collectionId: "col", fields: {} });

    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as any).headers["Authorization"]).toBe("Bearer my_token_abc");
  });
});
