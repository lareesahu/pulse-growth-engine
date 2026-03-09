/**
 * Image generation helper
 *
 * Primary:  Doubao Seedream-3.0 (doubao-seedream-3-0-t2i-250415) via Ark API
 * Backup:   Doubao Seedream-4.0 (doubao-seedream-4-0-250828) — higher quality
 * Fallback: Manus Forge internal ImageService (if DOUBAO_API_KEY not set)
 *
 * Active image model is controlled by DOUBAO_IMAGE_MODEL env var.
 * Default: doubao-seedream-3-0-t2i-250415
 */
import { storagePut } from "server/storage";
import { ENV } from "./env";

const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";

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

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  // Use Doubao/Ark if key is available, otherwise fall back to Manus Forge
  if (ENV.doubaoApiKey) {
    return generateViaArk(options);
  }
  return generateViaForge(options);
}
