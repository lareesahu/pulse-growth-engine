/**
 * Asset Intelligence Module
 *
 * Analyzes uploaded brand images to extract:
 * - Dominant color palette and tone (warm/cool/neutral)
 * - Quality assessment (sharpness, resolution, noise)
 * - Subject position and safe zones for text overlay
 * - Enhancement recommendations
 *
 * Uses GPT-4.1 Vision for semantic analysis + sharp for pixel-level metrics.
 */

import sharp from "sharp";
import { invokeLLM } from "../_core/llm";

export type ColorTone = "warm" | "cool" | "neutral" | "dark" | "light";

export type SafeZone = {
  region: "top" | "bottom" | "left" | "right" | "center";
  percentageOfImage: number; // 0-100
  isSafeForText: boolean;
  reason: string;
};

export type AssetAnalysis = {
  // Color
  dominantColors: string[]; // hex codes
  colorTone: ColorTone;
  backgroundTone: ColorTone;
  contrastRatio: number; // 1-21 (WCAG scale)

  // Quality
  width: number;
  height: number;
  aspectRatio: string;
  qualityScore: number; // 0-100
  needsEnhancement: boolean;
  enhancementRecommendations: string[];

  // Subject / Safe Zones
  subjectDescription: string;
  subjectPosition: string; // e.g. "center-left", "bottom-third"
  safeZones: SafeZone[];
  textSafeRegion: string; // human-readable summary for design bots

  // Design guidance
  suggestedTextColor: "#FFFFFF" | "#000000" | "#1A1A2E";
  designNotes: string; // for AI design bots
};

/**
 * Analyzes an image buffer and returns full asset intelligence.
 */
export async function analyzeAsset(
  imageBuffer: Buffer,
  mimeType: string = "image/jpeg"
): Promise<AssetAnalysis> {
  // Step 1: Pixel-level analysis with sharp
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Get dominant colors using sharp stats
  const stats = await sharp(imageBuffer).stats();
  const channels = stats.channels;

  // Determine color tone from RGB averages
  const avgR = channels[0]?.mean || 0;
  const avgG = channels[1]?.mean || 0;
  const avgB = channels[2]?.mean || 0;
  const brightness = (avgR + avgG + avgB) / 3;

  let colorTone: ColorTone;
  if (brightness < 80) colorTone = "dark";
  else if (brightness > 200) colorTone = "light";
  else if (avgR > avgB + 20) colorTone = "warm";
  else if (avgB > avgR + 20) colorTone = "cool";
  else colorTone = "neutral";

  // Quality check: sharpness via Laplacian variance approximation
  const { data: grayData } = await sharp(imageBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let laplacianSum = 0;
  const w = width;
  for (let i = w + 1; i < grayData.length - w - 1; i++) {
    const lap = Math.abs(
      -grayData[i - w] - grayData[i - 1] + 4 * grayData[i] -
      grayData[i + 1] - grayData[i + w]
    );
    laplacianSum += lap;
  }
  const sharpnessScore = Math.min(100, Math.round(laplacianSum / grayData.length * 5));
  const isSharp = sharpnessScore > 20;
  const isHighRes = width >= 1080 && height >= 1080;
  const qualityScore = Math.round((sharpnessScore * 0.6) + (isHighRes ? 40 : 20));
  const needsEnhancement = qualityScore < 60 || !isHighRes;

  const enhancementRecommendations: string[] = [];
  if (!isHighRes) enhancementRecommendations.push(`Upscale to at least 1080px (current: ${width}x${height})`);
  if (!isSharp) enhancementRecommendations.push("Apply sharpening filter (low sharpness detected)");
  if (brightness < 60) enhancementRecommendations.push("Increase brightness/exposure");
  if (brightness > 220) enhancementRecommendations.push("Reduce highlights to prevent blowout");

  // Aspect ratio
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(width, height);
  const aspectRatio = `${width / g}:${height / g}`;

  // Step 2: AI Vision analysis for subject detection and safe zones
  const base64Image = imageBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const visionPrompt = `You are an expert visual designer and image analyst. Analyze this image and return a JSON object with EXACTLY these fields:

{
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "backgroundTone": "warm|cool|neutral|dark|light",
  "contrastRatio": <number 1-21>,
  "subjectDescription": "<what is the main subject>",
  "subjectPosition": "<e.g. center, top-left, bottom-right, rule-of-thirds-left>",
  "safeZones": [
    {
      "region": "top|bottom|left|right|center",
      "percentageOfImage": <0-100>,
      "isSafeForText": true|false,
      "reason": "<why safe or unsafe>"
    }
  ],
  "textSafeRegion": "<one sentence summary of where text can safely be placed, for AI design bots>",
  "suggestedTextColor": "#FFFFFF|#000000|#1A1A2E",
  "designNotes": "<2-3 sentences of design guidance for an AI that will overlay brand text and logo on this image>"
}

Be precise. The safeZones array should cover all 5 regions. Return ONLY the JSON, no markdown.`;

  let visionResult: Partial<AssetAnalysis> = {};
  try {
    const llmResponse = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      maxTokens: 1000,
    } as any);

    const content = llmResponse.choices[0]?.message?.content;
    const text = typeof content === "string" ? content : JSON.stringify(content);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      visionResult = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error("[AssetIntelligence] Vision analysis failed:", err);
    // Fallback defaults
    visionResult = {
      dominantColors: [`rgb(${Math.round(avgR)},${Math.round(avgG)},${Math.round(avgB)})`],
      backgroundTone: colorTone,
      contrastRatio: colorTone === "dark" ? 15 : 4,
      subjectDescription: "Unknown (vision analysis unavailable)",
      subjectPosition: "center",
      safeZones: [
        { region: "top", percentageOfImage: 25, isSafeForText: true, reason: "Assumed safe" },
        { region: "bottom", percentageOfImage: 25, isSafeForText: true, reason: "Assumed safe" },
        { region: "left", percentageOfImage: 25, isSafeForText: false, reason: "Unknown" },
        { region: "right", percentageOfImage: 25, isSafeForText: false, reason: "Unknown" },
        { region: "center", percentageOfImage: 50, isSafeForText: false, reason: "Subject likely here" },
      ],
      textSafeRegion: "Top and bottom 25% are assumed safe for text overlay.",
      suggestedTextColor: colorTone === "dark" ? "#FFFFFF" : "#1A1A2E",
      designNotes: "No vision analysis available. Use conservative text placement.",
    };
  }

  return {
    dominantColors: visionResult.dominantColors || [],
    colorTone,
    backgroundTone: visionResult.backgroundTone || colorTone,
    contrastRatio: visionResult.contrastRatio || 4,
    width,
    height,
    aspectRatio,
    qualityScore,
    needsEnhancement,
    enhancementRecommendations,
    subjectDescription: visionResult.subjectDescription || "",
    subjectPosition: visionResult.subjectPosition || "center",
    safeZones: visionResult.safeZones || [],
    textSafeRegion: visionResult.textSafeRegion || "",
    suggestedTextColor: visionResult.suggestedTextColor || "#FFFFFF",
    designNotes: visionResult.designNotes || "",
  };
}

/**
 * Enhances an image buffer based on analysis recommendations.
 * Returns enhanced buffer.
 */
export async function enhanceAsset(
  imageBuffer: Buffer,
  analysis: AssetAnalysis
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  // Auto-normalize if needed
  if (analysis.needsEnhancement) {
    pipeline = pipeline.normalize();
  }

  // Sharpen if blurry
  if (analysis.qualityScore < 50) {
    pipeline = pipeline.sharpen({ sigma: 1.5, m1: 0.5, m2: 3 });
  }

  // Upscale if too small (to 1080px min on shortest side)
  const minDim = Math.min(analysis.width, analysis.height);
  if (minDim < 1080) {
    const scale = 1080 / minDim;
    pipeline = pipeline.resize(
      Math.round(analysis.width * scale),
      Math.round(analysis.height * scale),
      { kernel: sharp.kernel.lanczos3 }
    );
  }

  return pipeline.jpeg({ quality: 90 }).toBuffer();
}

/**
 * Compresses an image buffer for web delivery.
 * Returns compressed buffer and format.
 */
export async function compressAsset(
  imageBuffer: Buffer,
  format: "jpeg" | "webp" | "png" = "webp",
  quality: number = 82
): Promise<{ buffer: Buffer; format: string; originalSize: number; compressedSize: number }> {
  const originalSize = imageBuffer.length;

  let pipeline = sharp(imageBuffer);

  let compressed: Buffer;
  if (format === "webp") {
    compressed = await pipeline.webp({ quality, effort: 4 }).toBuffer();
  } else if (format === "jpeg") {
    compressed = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  } else {
    compressed = await pipeline.png({ compressionLevel: 8, adaptiveFiltering: true }).toBuffer();
  }

  return {
    buffer: compressed,
    format,
    originalSize,
    compressedSize: compressed.length,
  };
}
