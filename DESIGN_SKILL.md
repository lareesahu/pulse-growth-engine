# NeoLab Care — Design & Image Pipeline Skill

This repository includes a complete **Asset Intelligence & HTML-to-Image Design Pipeline**. 
As an AI agent operating this repository, you should **never** generate raw AI images from scratch (e.g., using DALL-E or Midjourney) for final social media or blog posts, as they lack brand consistency, typography control, and layout precision.

Instead, you must use the built-in **Puppeteer HTML-to-Image renderer**, which guarantees pixel-perfect brand compliance.

---

## 1. The Design Pipeline Architecture

The image pipeline operates in four stages:

1. **Asset Intelligence (AI Analysis)**
   - When a raw image is uploaded, it is passed to GPT-4 Vision.
   - The AI analyzes: dominant colors, quality, subject location, and **safe zones** (e.g., "top 30% is clear sky, safe for text").
2. **Image Enhancement**
   - The image is auto-leveled and sharpened using `sharp`.
3. **HTML Template Rendering**
   - The content (headline, caption, logo) is injected into a brand-locked HTML template.
   - Puppeteer boots a headless Chrome instance, loads the HTML, and takes a pixel-perfect screenshot at the exact required dimensions.
4. **Compression & Export**
   - The final image is compressed to WebP (or GIF/MP4 for animations) using `sharp` for optimal load speed.

---

## 2. Brand Guidelines (NeoLab Care)

When injecting content into the HTML templates or creating new templates, you must strictly adhere to the NeoLab Care brand book:

### Colors
- **Primary Background:** Deep Clinical Navy (`#0A0F1A`)
- **Primary Text:** Medical White (`#F8F9FA`)
- **Accent/Highlight:** Efficacy Blue (`#3A7CA5`) or Precision Silver (`#C0C5CE`)
- **Warning/Alert (rarely used):** Formulation Red (`#D64933`)

### Typography
- **Headlines:** Clean, geometric sans-serif (e.g., Inter, Roboto, or Helvetica Neue). Font weight: Bold (700) or Extra Bold (800).
- **Body/Captions:** Clean sans-serif. Font weight: Regular (400) or Medium (500).
- **Letter Spacing:** Headlines should have tight tracking (`-0.02em`); body text should be highly readable (`0em`).

### Layout & Safe Zones
- **Padding:** Always maintain a minimum of `40px` padding on all sides (for 1080x1080).
- **Logo Placement:** Top-left or bottom-center. Never obscure the logo.
- **Text Alignment:** Left-aligned for clinical authority; center-aligned only for short, punchy quotes.
- **Safe Zones:** Always respect the `safeZones` output from the Asset Intelligence module. Never place text over faces, products, or complex backgrounds.

---

## 3. How to Use the Pipeline

The pipeline is exposed via the tRPC `imageRouter` in `server/image/image-router.ts`.

### Available Procedures:

1. **`image.uploadAsset`**
   - **Input:** `{ brandId: number, name: string, base64: string }`
   - **Action:** Uploads a raw image, runs Asset Intelligence (color, quality, safe zones), and stores it in the `brand_assets` table.
   
2. **`image.renderPackageImage`**
   - **Input:** `{ packageId: number, platform: 'instagram' | 'linkedin' | 'blog' | 'story', assetId?: number }`
   - **Action:** 
     1. Fetches the generated content package.
     2. Selects the correct NeoLab HTML template for the platform.
     3. Injects the headline and (optional) background asset.
     4. Renders the HTML to a WebP image using Puppeteer.
     5. Compresses the image and stores it in the `package_images` table.

### Example Agent Workflow:

```typescript
// 1. Upload a raw brand asset (e.g., a product photo)
const asset = await trpc.image.uploadAsset.mutate({
  brandId: 2,
  name: "argireline-bottle",
  base64: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
});

// 2. The asset now has intelligence metadata
console.log(asset.analysis.safeZones); // e.g., "Left 50% is empty negative space."

// 3. Render a LinkedIn post image using the asset and a generated content package
const linkedInImage = await trpc.image.renderPackageImage.mutate({
  packageId: 10,
  platform: "linkedin",
  assetId: asset.id // The template will place the text in the safe zone
});

// 4. The image is now ready for publishing (compressed WebP, 1200x628)
console.log(linkedInImage.imageBase64);
```

---

## 4. Creating New Templates

If you need to create a new design layout, add a new function to `server/image/templates/neolab-templates.ts`.

**Rules for HTML Templates:**
- Use inline CSS or a `<style>` block.
- Do not rely on external CSS files or web fonts that take long to load (use system fonts or base64-encoded fonts if absolute precision is needed).
- Use Flexbox or CSS Grid for layout.
- Ensure the `<body>` has exactly the dimensions required for the platform (e.g., `width: 1080px; height: 1080px; margin: 0; overflow: hidden;`).
- Use CSS variables for the NeoLab brand colors to ensure consistency.
