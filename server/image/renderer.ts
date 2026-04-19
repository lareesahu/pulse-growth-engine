/**
 * HTML-to-Image Renderer
 *
 * Uses Puppeteer (headless Chromium) to render HTML templates to images.
 * Supports:
 * - Static PNG/JPEG/WebP export at any size
 * - Animated WebP (CSS animations captured as frames)
 * - Animated GIF
 * - Multi-size batch export (Instagram square, LinkedIn banner, Story, OG image)
 * - Automatic compression via sharp
 */

import puppeteer, { Browser } from "puppeteer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import os from "os";

// Platform-specific export sizes
export const PLATFORM_SIZES = {
  instagram_square: { width: 1080, height: 1080, label: "Instagram Square" },
  instagram_portrait: { width: 1080, height: 1350, label: "Instagram Portrait" },
  instagram_story: { width: 1080, height: 1920, label: "Instagram Story" },
  linkedin_post: { width: 1200, height: 627, label: "LinkedIn Post" },
  linkedin_story: { width: 1080, height: 1920, label: "LinkedIn Story" },
  blog_og: { width: 1200, height: 630, label: "Blog OG Image" },
  xiaohongshu: { width: 1242, height: 1660, label: "Xiaohongshu" },
  tiktok: { width: 1080, height: 1920, label: "TikTok" },
} as const;

export type PlatformSize = keyof typeof PLATFORM_SIZES;

export type RenderOptions = {
  html: string;
  width: number;
  height: number;
  format?: "png" | "jpeg" | "webp";
  quality?: number; // 1-100
  animated?: boolean;
  animationDurationMs?: number; // for animated export
  fps?: number; // frames per second for animation
};

export type RenderResult = {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  sizeBytes: number;
  compressionRatio?: number;
};

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance) {
    try {
      // Check if browser is still alive
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }

  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  return browserInstance;
}

/**
 * Renders an HTML string to a static image.
 */
export async function renderHtmlToImage(options: RenderOptions): Promise<RenderResult> {
  const {
    html,
    width,
    height,
    format = "webp",
    quality = 85,
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 2 }); // 2x for retina quality
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Wait for fonts and animations to settle
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 300));

    const screenshotBuffer = await page.screenshot({
      type: format === "jpeg" ? "jpeg" : "png",
      quality: format === "jpeg" ? quality : undefined,
      clip: { x: 0, y: 0, width, height },
    });

    const rawBuffer = Buffer.from(screenshotBuffer);

    // Compress with sharp
    let finalBuffer: Buffer;
    if (format === "webp") {
      finalBuffer = await sharp(rawBuffer).webp({ quality, effort: 4 }).toBuffer();
    } else if (format === "jpeg") {
      finalBuffer = await sharp(rawBuffer).jpeg({ quality, mozjpeg: true }).toBuffer();
    } else {
      finalBuffer = await sharp(rawBuffer).png({ compressionLevel: 8 }).toBuffer();
    }

    return {
      buffer: finalBuffer,
      format,
      width,
      height,
      sizeBytes: finalBuffer.length,
      compressionRatio: rawBuffer.length / finalBuffer.length,
    };
  } finally {
    await page.close();
  }
}

/**
 * Renders an animated HTML template to animated WebP or GIF.
 * Captures frames at specified FPS over the animation duration.
 */
export async function renderHtmlToAnimation(options: RenderOptions): Promise<RenderResult> {
  const {
    html,
    width,
    height,
    animationDurationMs = 3000,
    fps = 12,
    format = "webp",
    quality = 80,
  } = options;

  const browser = await getBrowser();
  const page = await browser.newPage();
  const frames: Buffer[] = [];

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);

    // Pause all animations at t=0 to sync
    await page.evaluate(() => {
      document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; });
    });

    const frameCount = Math.round((animationDurationMs / 1000) * fps);
    const frameInterval = animationDurationMs / frameCount;

    for (let i = 0; i < frameCount; i++) {
      const timeMs = i * frameInterval;

      // Seek all animations to this time
      await page.evaluate((t) => {
        document.getAnimations().forEach(a => { a.currentTime = t; });
      }, timeMs);

      await new Promise(r => setTimeout(r, 16)); // allow repaint

      const screenshot = await page.screenshot({
        type: "png",
        clip: { x: 0, y: 0, width, height },
      });
      frames.push(Buffer.from(screenshot));
    }

    // Encode frames to animated WebP using sharp
    if (format === "webp") {
      // sharp supports animated WebP via array of frames
      const frameDelay = Math.round(1000 / fps);
      const animatedWebp = await sharp(frames[0])
        .webp({ quality, loop: 0 })
        .toBuffer();

      // For multi-frame animated WebP, we need to use sharp's joinChannel or
      // fall back to GIF and convert. Use GIF path for reliability.
      const gifBuffer = await encodeGif(frames, width, height, fps);
      // Convert GIF to animated WebP via sharp
      const webpBuffer = await sharp(gifBuffer, { animated: true })
        .webp({ quality, loop: 0 })
        .toBuffer();

      return {
        buffer: webpBuffer,
        format: "webp",
        width,
        height,
        sizeBytes: webpBuffer.length,
      };
    } else {
      // GIF output
      const gifBuffer = await encodeGif(frames, width, height, fps);
      return {
        buffer: gifBuffer,
        format: "gif",
        width,
        height,
        sizeBytes: gifBuffer.length,
      };
    }
  } finally {
    await page.close();
  }
}

/**
 * Encodes an array of PNG frame buffers into an animated GIF.
 */
async function encodeGif(
  frames: Buffer[],
  width: number,
  height: number,
  fps: number
): Promise<Buffer> {
  // Use sharp to resize all frames and write to temp files, then use ffmpeg
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "neolab-gif-"));
  const outputPath = path.join(tmpDir, "output.gif");

  try {
    // Write frames as PNG files
    for (let i = 0; i < frames.length; i++) {
      const framePath = path.join(tmpDir, `frame_${String(i).padStart(4, "0")}.png`);
      await sharp(frames[i]).resize(width, height).png().toFile(framePath);
    }

    // Use ffmpeg to create GIF (available on most systems)
    const { execSync } = await import("child_process");
    execSync(
      `ffmpeg -y -framerate ${fps} -i "${path.join(tmpDir, "frame_%04d.png")}" -vf "fps=${fps},scale=${width}:${height}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${outputPath}" 2>/dev/null`,
      { timeout: 30000 }
    );

    return fs.readFileSync(outputPath);
  } finally {
    // Cleanup temp files
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  }
}

/**
 * Batch renders an HTML template at multiple platform sizes.
 */
export async function renderForAllPlatforms(
  html: string,
  platforms: PlatformSize[] = ["instagram_square", "linkedin_post", "blog_og", "instagram_story"],
  format: "webp" | "jpeg" | "png" = "webp",
  quality: number = 85
): Promise<Record<string, RenderResult>> {
  const results: Record<string, RenderResult> = {};

  for (const platform of platforms) {
    const size = PLATFORM_SIZES[platform];
    // Inject size into HTML via CSS variable
    const sizedHtml = html
      .replace(/--canvas-width:\s*\d+px/g, `--canvas-width: ${size.width}px`)
      .replace(/--canvas-height:\s*\d+px/g, `--canvas-height: ${size.height}px`);

    results[platform] = await renderHtmlToImage({
      html: sizedHtml,
      width: size.width,
      height: size.height,
      format,
      quality,
    });
  }

  return results;
}

/**
 * Closes the shared browser instance. Call on server shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
