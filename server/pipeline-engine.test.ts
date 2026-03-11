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

  it("returns systemPrompt and userPrompt", () => {
    const { systemPrompt, userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "Be bold",
      dontSay: "No jargon",
      platforms: ["linkedin", "instagram"],
    });

    expect(systemPrompt).toBeTruthy();
    expect(userPrompt).toBeTruthy();
    expect(systemPrompt).toContain("TestBrand");
  });

  it("includes idea title in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("Test Idea Title");
  });

  it("includes brand name in system prompt", () => {
    const { systemPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(systemPrompt).toContain("TestBrand");
  });

  it("includes idea angle in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("A fresh angle");
  });

  it("includes brand mission in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain("Help people grow");
  });

  it("returns valid JSON schema in prompt", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    // Should contain JSON structure markers
    expect(userPrompt).toContain("masterHook");
    expect(userPrompt).toContain("variants");
  });

  it("includes idea details for consideration stage", () => {
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
  });

  it("includes linkedin platform in variants when requested", () => {
    const { userPrompt } = buildContentPrompt({
      idea: baseIdea,
      pillarName: "Growth",
      brand: baseBrand,
      doSay: "",
      dontSay: "",
      platforms: ["linkedin"],
    });

    expect(userPrompt).toContain('"linkedin"');
  });
});
