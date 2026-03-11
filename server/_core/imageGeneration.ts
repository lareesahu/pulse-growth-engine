/**
 * Image generation helper
 *
 * Webflow article images: ALWAYS use DALL-E 3 via OpenAI (no watermarks, no AI tags)
 * Other images (pipeline assets): Doubao Seedream-3.0 via Ark API (primary) or Manus Forge (fallback)
 *
 * PERMANENT SETTING: generateWebflowImage() is hardcoded to DALL-E 3 forever.
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";
const OPENAI_BASE = "https://api.openai.com/v1";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
  /** Override model for this call */
  model?: string;
};

export type GenerateImageResponse = {
  url?: string;
};

function getImageModel(): string {
  return process.env.DOUBAO_IMAGE_MODEL || "doubao-seedream-3-0-t2i-250415";
}

/**
 * DALL-E 3 via OpenAI — used exclusively for Webflow article header images.
 * No watermarks, no AI tags, no Chinese characters. Hardcoded permanently.
 */
async function generateViaDalle3(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch(`${OPENAI_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: options.prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
      style: "vivid",
      response_format: "url",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `DALL-E 3 generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json() as {
    data: Array<{ url?: string; b64_json?: string }>;
  };

  const item = result.data?.[0];
  if (!item) throw new Error("DALL-E 3 returned no data");

  if (item.url) return { url: item.url };

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    const { url } = await storagePut(
      `generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
      buffer,
      "image/png"
    );
    return { url };
  }

  throw new Error("DALL-E 3 returned neither url nor b64_json");
}

async function generateViaArk(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const model = options.model || getImageModel();

  const response = await fetch(`${ARK_BASE}/images/generations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.doubaoApiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = await response.json() as {
    data: Array<{ b64_json?: string; url?: string }>;
  };

  const item = result.data?.[0];
  if (!item) throw new Error("Image generation returned no data");

  if (item.url) return { url: item.url };

  if (item.b64_json) {
    const buffer = Buffer.from(item.b64_json, "base64");
    const { url } = await storagePut(
      `generated/${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
      buffer,
      "image/png"
    );
    return { url };
  }

  throw new Error("Image generation returned neither url nor b64_json");
}

async function generateViaForge(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  if (!ENV.forgeApiUrl) throw new Error("BUILT_IN_FORGE_API_URL is not configured");
  if (!ENV.forgeApiKey) throw new Error("BUILT_IN_FORGE_API_KEY is not configured");

  const baseUrl = ENV.forgeApiUrl.endsWith("/") ? ENV.forgeApiUrl : `${ENV.forgeApiUrl}/`;
  const fullUrl = new URL("images.v1.ImageService/GenerateImage", baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "connect-protocol-version": "1",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      prompt: options.prompt,
      original_images: options.originalImages || [],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Image generation request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const result = (await response.json()) as {
    image: { b64Json: string; mimeType: string };
  };
  const buffer = Buffer.from(result.image.b64Json, "base64");
  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    buffer,
    result.image.mimeType
  );
  return { url };
}

/**
 * Standard image generation for pipeline assets (blog images, social images, etc.)
 * Uses Doubao Seedream (primary) or Manus Forge (fallback).
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (ENV.doubaoApiKey) {
    return generateViaArk(options);
  }
  return generateViaForge(options);
}

/**
 * PERMANENTLY hardcoded to DALL-E 3 via OpenAI.
 * Used exclusively for Webflow article header images.
 * DALL-E 3 produces clean images with NO watermarks, NO AI tags, NO Chinese characters.
 * DO NOT change this to Seedream or any other model — Seedream adds "AI生成" watermarks.
 */
export async function generateWebflowImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Always DALL-E 3 — hardcoded forever. Do not change.
  return generateViaDalle3(options);
}
