/**
 * Image Pipeline Router
 *
 * Provides tRPC endpoints for the full image generation pipeline:
 *
 * image.analyzeAsset       — Upload image buffer, get AI analysis (color, quality, safe zones)
 * image.generateForPackage — Generate brand images for a content package across platforms
 * image.renderTemplate     — Render a specific HTML template to image
 * image.listAssets         — List all stored assets for a brand
 * image.getAsset           — Get a specific asset with its analysis
 *
 * The pipeline flow:
 * 1. Upload asset → analyzeAsset (AI vision + pixel analysis)
 * 2. Enhancement (if needed) via sharp
 * 3. Template selection based on platform + content type
 * 4. Puppeteer renders HTML → PNG
 * 5. sharp compresses → WebP
 * 6. Stored in DB with metadata
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { analyzeAsset, enhanceAsset, compressAsset } from "./asset-intelligence";
import { renderHtmlToImage, renderHtmlToAnimation, renderForAllPlatforms, PLATFORM_SIZES } from "./renderer";
import { selectTemplate, darkMinimalTemplate, photoOverlayTemplate, clinicalCardTemplate, storyTemplate } from "./templates/neolab-templates";
import type { TemplateData } from "./templates/neolab-templates";
import type { PlatformSize } from "./renderer";
import * as db from "../db";

// ─── Schemas ────────────────────────────────────────────────────────────────

const PlatformSizeSchema = z.enum([
  "instagram_square",
  "instagram_portrait",
  "instagram_story",
  "linkedin_post",
  "linkedin_story",
  "blog_og",
  "xiaohongshu",
  "tiktok",
]);

const TemplateTypeSchema = z.enum([
  "dark_minimal",
  "photo_overlay",
  "clinical_card",
  "story",
  "auto", // auto-select based on platform
]);

// ─── Router ─────────────────────────────────────────────────────────────────

export const imageRouter = router({

  /**
   * Analyze an uploaded image asset.
   * Input: base64-encoded image + mime type
   * Output: full AssetAnalysis (color, quality, safe zones, design notes)
   */
  analyzeAsset: protectedProcedure
    .input(z.object({
      imageBase64: z.string(), // base64 encoded image data
      mimeType: z.string().default("image/jpeg"),
      brandId: z.number().int(),
      assetName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const imageBuffer = Buffer.from(input.imageBase64, "base64");

      // Run AI + pixel analysis
      const analysis = await analyzeAsset(imageBuffer, input.mimeType);

      // Enhance if needed
      let processedBuffer = imageBuffer;
      if (analysis.needsEnhancement) {
        processedBuffer = await enhanceAsset(imageBuffer, analysis);
      }

      // Compress to WebP
      const compressed = await compressAsset(processedBuffer, "webp", 85);

      // Store in DB
      const assetRecord = await db.createBrandAsset({
        brandId: input.brandId,
        name: input.assetName || `asset_${Date.now()}`,
        originalBase64: input.imageBase64,
        processedBase64: compressed.buffer.toString("base64"),
        mimeType: "image/webp",
        width: analysis.width,
        height: analysis.height,
        analysis: JSON.stringify(analysis),
        sizeBytes: compressed.compressedSize,
        originalSizeBytes: compressed.originalSize,
      });

      return {
        assetId: assetRecord.id,
        analysis,
        compressionStats: {
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
          savingsPercent: Math.round((1 - compressed.compressedSize / compressed.originalSize) * 100),
          format: compressed.format,
        },
        enhanced: analysis.needsEnhancement,
        enhancementApplied: analysis.enhancementRecommendations,
      };
    }),

  /**
   * Generate brand images for a content package.
   * Renders the package content into NeoLab templates for all requested platforms.
   */
  generateForPackage: protectedProcedure
    .input(z.object({
      packageId: z.number().int(),
      platforms: z.array(PlatformSizeSchema).default(["instagram_square", "linkedin_post", "blog_og", "instagram_story"]),
      templateType: TemplateTypeSchema.default("auto"),
      assetId: z.number().int().optional(), // optional background image asset
      animated: z.boolean().default(false),
      animationDurationMs: z.number().int().default(3000),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fetch content package
      const pkg = await db.getContentPackageById(input.packageId);
      if (!pkg) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Content package not found" });
      }

      // Fetch asset analysis if provided
      let assetAnalysis: any = null;
      let backgroundImageDataUrl: string | undefined;
      if (input.assetId) {
        const asset = await db.getBrandAsset(input.assetId);
        if (asset) {
          assetAnalysis = JSON.parse(asset.analysis || "{}");
          backgroundImageDataUrl = `data:${asset.mimeType};base64,${asset.processedBase64}`;
        }
      }

      // Extract content from package
      const idea = pkg.idea;
      const headline = idea?.title || "NeoLab Care";
      const subheadline = idea?.angle?.substring(0, 120) || "";

      const results: Record<string, {
        base64: string;
        format: string;
        width: number;
        height: number;
        sizeBytes: number;
        platform: string;
      }> = {};

      for (const platform of input.platforms) {
        const size = PLATFORM_SIZES[platform as PlatformSize];

        const templateData: TemplateData = {
          headline,
          subheadline,
          backgroundImageUrl: backgroundImageDataUrl,
          animated: input.animated,
          animationDurationMs: input.animationDurationMs,
          // From asset analysis
          textSafeRegion: assetAnalysis?.textSafeRegion,
          suggestedTextColor: assetAnalysis?.suggestedTextColor,
          subjectPosition: assetAnalysis?.subjectPosition,
          ctaText: "neolab.care",
        };

        // Select template
        let html: string;
        if (input.templateType === "auto") {
          html = selectTemplate(platform, templateData);
        } else if (input.templateType === "dark_minimal") {
          html = darkMinimalTemplate(templateData);
        } else if (input.templateType === "photo_overlay") {
          html = photoOverlayTemplate(templateData);
        } else if (input.templateType === "clinical_card") {
          html = clinicalCardTemplate(templateData);
        } else {
          html = storyTemplate(templateData);
        }

        // Render
        let renderResult;
        if (input.animated) {
          renderResult = await renderHtmlToAnimation({
            html,
            width: size.width,
            height: size.height,
            format: "webp",
            quality: 82,
            animated: true,
            animationDurationMs: input.animationDurationMs,
            fps: 12,
          });
        } else {
          renderResult = await renderHtmlToImage({
            html,
            width: size.width,
            height: size.height,
            format: "webp",
            quality: 85,
          });
        }

        results[platform] = {
          base64: renderResult.buffer.toString("base64"),
          format: renderResult.format,
          width: renderResult.width,
          height: renderResult.height,
          sizeBytes: renderResult.sizeBytes,
          platform,
        };
      }

      // Store generated images in DB
      await db.savePackageImages(input.packageId, results);

      return {
        packageId: input.packageId,
        images: results,
        platforms: Object.keys(results),
        totalImages: Object.keys(results).length,
      };
    }),

  /**
   * Render a custom HTML template to image (for testing/preview).
   */
  renderTemplate: protectedProcedure
    .input(z.object({
      html: z.string(),
      platform: PlatformSizeSchema.default("instagram_square"),
      format: z.enum(["webp", "jpeg", "png"]).default("webp"),
      quality: z.number().int().min(1).max(100).default(85),
      animated: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const size = PLATFORM_SIZES[input.platform as PlatformSize];

      const result = input.animated
        ? await renderHtmlToAnimation({
            html: input.html,
            width: size.width,
            height: size.height,
            format: input.format as "webp",
            quality: input.quality,
            animated: true,
            animationDurationMs: 3000,
            fps: 12,
          })
        : await renderHtmlToImage({
            html: input.html,
            width: size.width,
            height: size.height,
            format: input.format as "webp" | "jpeg" | "png",
            quality: input.quality,
          });

      return {
        base64: result.buffer.toString("base64"),
        format: result.format,
        width: result.width,
        height: result.height,
        sizeBytes: result.sizeBytes,
        compressionRatio: result.compressionRatio,
      };
    }),

  /**
   * List all brand assets with their analysis.
   */
  listAssets: protectedProcedure
    .input(z.object({ brandId: z.number().int() }))
    .query(async ({ input }) => {
      const assets = await db.listBrandAssets(input.brandId);
      return assets.map(a => ({
        ...a,
        analysis: a.analysis ? JSON.parse(a.analysis) : null,
      }));
    }),

  /**
   * Get a specific asset.
   */
  getAsset: protectedProcedure
    .input(z.object({ assetId: z.number().int() }))
    .query(async ({ input }) => {
      const asset = await db.getBrandAsset(input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        ...asset,
        analysis: asset.analysis ? JSON.parse(asset.analysis) : null,
      };
    }),

  /**
   * Get all generated images for a content package.
   */
  getPackageImages: protectedProcedure
    .input(z.object({ packageId: z.number().int() }))
    .query(async ({ input }) => {
      return db.getPackageImages(input.packageId);
    }),
});
