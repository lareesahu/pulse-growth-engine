import { describe, it, expect } from "vitest";
import { buildContentPrompt } from "./pipeline-engine";

describe("buildContentPrompt", () => {
  const baseBrand = {
    name: "TestBrand",
    mission: "Help people grow",
    positioning: "Premium growth partner",
    toneSummary: "authoritative, empathetic",
  };

  const baseIdea = {
    title: "Test Idea Title",
    angle: "A fresh angle",
    summary: "Two sentence summary here.",
    funnelStage: "awareness",
  };

  it("generates prompt with correct platform variant instructions for linkedin + instagram", () => {
    const { systemPrompt, userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "Be bold",
      dontSay: "No jargon",
      platforms: ["linkedin", "instagram"],
    });

    expect(systemPrompt).toContain("TestBrand");
    expect(userPrompt).toContain('"linkedin"');
    expect(userPrompt).toContain('"instagram"');
    expect(userPrompt).toContain("LinkedIn post");
    expect(userPrompt).toContain("Instagram caption");
    // Should NOT contain platforms not requested
    expect(userPrompt).not.toContain('"webflow"');
    expect(userPrompt).not.toContain('"wechat"');
  });

  it("generates prompt with blog, reddit, quora platforms", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Thought Leadership",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["blog", "reddit", "quora"],
    });

    expect(userPrompt).toContain('"blog"');
    expect(userPrompt).toContain('"reddit"');
    expect(userPrompt).toContain('"quora"');
    expect(userPrompt).toContain("Blog post title");
    expect(userPrompt).toContain("Reddit post");
    expect(userPrompt).toContain("Quora answer");
  });

  it("generates prompt with tiktok and facebook platforms", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Engagement",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["tiktok", "facebook"],
    });

    expect(userPrompt).toContain('"tiktok"');
    expect(userPrompt).toContain('"facebook"');
    expect(userPrompt).toContain("TikTok caption");
    expect(userPrompt).toContain("Facebook post");
  });

  it("falls back to 4 core platforms when no valid platforms provided", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "General",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: [],
    });

    // Fallback includes linkedin, instagram, webflow, wechat
    expect(userPrompt).toContain('"linkedin"');
    expect(userPrompt).toContain('"instagram"');
    expect(userPrompt).toContain('"webflow"');
    expect(userPrompt).toContain('"wechat"');
  });

  it("includes brand rules in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "Be bold and confident",
      dontSay: "Never use jargon",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("Do say: Be bold and confident");
    expect(userPrompt).toContain("Don't say: Never use jargon");
  });

  it("includes idea details in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: {
        title: "The Future of AI in Marketing",
        angle: "Practical applications for small businesses",
        summary: "Exploring how AI tools can help small businesses compete.",
        funnelStage: "consideration",
      },
      pillarName: "AI Innovation",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("The Future of AI in Marketing");
    expect(userPrompt).toContain("Practical applications for small businesses");
    expect(userPrompt).toContain("consideration");
    expect(userPrompt).toContain("AI Innovation");
  });

  it("includes CRITICAL RULES section", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "General",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("CRITICAL RULES");
    expect(userPrompt).toContain("Never leave body or caption empty");
    expect(userPrompt).toContain("Do NOT use markdown formatting");
  });

  it("generates all 11 supported platforms", () => {
    const allPlatforms = ["instagram","facebook","linkedin","tiktok","webflow","medium","xiaohongshu","wechat","reddit","quora","blog"];
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "General",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: allPlatforms,
    });

    for (const p of allPlatforms) {
      expect(userPrompt).toContain(`"${p}"`);
    }
  });
});
