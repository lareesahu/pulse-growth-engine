import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { enrichPayload } from "./enrichment";
import { invokeLLM } from "../_core/llm";

function makeLLMResponse(json: object) {
  return {
    id: "test",
    created: 0,
    model: "mock",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(json) }, finish_reason: "stop" }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invokeLLM).mockResolvedValue(
    makeLLMResponse({
      hashtags: ["branding", "marketing", "growth", "startup"],
      tags: ["manus_ai", "pulse_branding"],
      trending_score: 78,
    }) as any,
  );
});

describe("enrichPayload", () => {
  it("returns hashtags array without # prefix", async () => {
    const result = await enrichPayload({
      platform: "linkedin",
      content: "Building a brand that generates 3x ROI",
      brandName: "Pulse Branding",
    });

    expect(Array.isArray(result.hashtags)).toBe(true);
    result.hashtags.forEach(h => {
      expect(h).not.toMatch(/^#/);
    });
  });

  it("returns tags without @ prefix", async () => {
    const result = await enrichPayload({
      platform: "linkedin",
      content: "Brand strategy insights",
      brandName: "Pulse Branding",
    });

    result.tags.forEach(t => {
      expect(t).not.toMatch(/^@/);
    });
  });

  it("trending_score is between 1 and 100", async () => {
    const result = await enrichPayload({
      platform: "x",
      content: "Why neuromarketing works",
      brandName: "Pulse Branding",
    });

    expect(result.trending_score).toBeGreaterThanOrEqual(1);
    expect(result.trending_score).toBeLessThanOrEqual(100);
  });

  it("limits hashtags to 10 maximum", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce(
      makeLLMResponse({
        hashtags: ["a","b","c","d","e","f","g","h","i","j","k","l"],
        tags: [],
        trending_score: 50,
      }) as any,
    );

    const result = await enrichPayload({
      platform: "linkedin",
      content: "test",
      brandName: "Brand",
    });

    expect(result.hashtags.length).toBeLessThanOrEqual(10);
  });

  it("limits tags to 3 maximum", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce(
      makeLLMResponse({
        hashtags: [],
        tags: ["a","b","c","d","e"],
        trending_score: 50,
      }) as any,
    );

    const result = await enrichPayload({ platform: "reddit", content: "test", brandName: "Brand" });

    expect(result.tags.length).toBeLessThanOrEqual(3);
  });

  it("returns safe fallback when LLM returns invalid JSON", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "t",
      created: 0,
      model: "mock",
      choices: [{ index: 0, message: { role: "assistant", content: "not json" }, finish_reason: "stop" }],
    } as any);

    const result = await enrichPayload({ platform: "email", content: "test", brandName: "Brand" });

    expect(Array.isArray(result.hashtags)).toBe(true);
    expect(Array.isArray(result.tags)).toBe(true);
    expect(result.trending_score).toBe(50);
  });

  it("passes competitorMap context to LLM", async () => {
    await enrichPayload({
      platform: "linkedin",
      content: "Branding insights",
      brandName: "Pulse",
      competitorMap: ["brandmaster", "growthlab"],
    });

    const calls = vi.mocked(invokeLLM).mock.calls;
    const callArgs = calls[calls.length - 1][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMessage?.content).toContain("brandmaster");
  });
});
