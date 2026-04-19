/**
 * NeoLab Care Brand HTML Design Templates
 *
 * Brand Identity:
 * - Primary: #1A1A2E (deep navy)
 * - Accent: #C8A96E (warm gold)
 * - Surface: #F5F3EE (off-white/cream)
 * - Text: #FFFFFF (on dark) / #1A1A2E (on light)
 * - Font: Inter (system fallback: -apple-system, sans-serif)
 *
 * All templates are responsive via CSS variables:
 * --canvas-width and --canvas-height
 *
 * Templates support:
 * - Static render (Puppeteer screenshot)
 * - Animated render (CSS keyframes captured as frames)
 * - Safe zone awareness (text placed per asset analysis)
 */

export type TemplateData = {
  headline: string;
  subheadline?: string;
  body?: string;
  stat?: string; // e.g. "9 actives"
  ctaText?: string;
  backgroundImageUrl?: string; // base64 data URL or https URL
  logoUrl?: string;
  // From asset analysis
  textSafeRegion?: string;
  suggestedTextColor?: string;
  subjectPosition?: string;
  animated?: boolean;
};

const BRAND = {
  navy: "#1A1A2E",
  gold: "#C8A96E",
  cream: "#F5F3EE",
  white: "#FFFFFF",
  fontStack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  logoSvg: `<svg width="120" height="28" viewBox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="22" font-family="Inter, sans-serif" font-size="18" font-weight="700" letter-spacing="3" fill="#C8A96E">NEOLAB</text>
    <text x="0" y="27" font-family="Inter, sans-serif" font-size="7" font-weight="400" letter-spacing="4" fill="#C8A96E" opacity="0.7">CARE</text>
  </svg>`,
};

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  :root {
    --canvas-width: 1080px;
    --canvas-height: 1080px;
    --navy: ${BRAND.navy};
    --gold: ${BRAND.gold};
    --cream: ${BRAND.cream};
    --white: ${BRAND.white};
  }
  body {
    width: var(--canvas-width);
    height: var(--canvas-height);
    overflow: hidden;
    font-family: ${BRAND.fontStack};
    background: var(--navy);
    color: var(--white);
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    width: var(--canvas-width);
    height: var(--canvas-height);
    position: relative;
    overflow: hidden;
  }
`;

/**
 * Template 1: Dark Minimal — headline + stat on dark navy background
 * Best for: Instagram square, LinkedIn post
 */
export function darkMinimalTemplate(data: TemplateData): string {
  const { headline, subheadline, stat, ctaText, animated } = data;

  const fadeIn = animated ? `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes lineGrow {
      from { width: 0; }
      to { width: 60px; }
    }
    @keyframes goldPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .headline { animation: fadeUp 0.8s ease forwards; animation-delay: 0.2s; opacity: 0; }
    .subheadline { animation: fadeUp 0.8s ease forwards; animation-delay: 0.5s; opacity: 0; }
    .divider { animation: lineGrow 0.6s ease forwards; animation-delay: 0.8s; }
    .stat { animation: fadeUp 0.8s ease forwards; animation-delay: 1s; opacity: 0; }
    .cta { animation: fadeUp 0.8s ease forwards; animation-delay: 1.3s; opacity: 0; }
    .logo { animation: fadeUp 0.6s ease forwards; animation-delay: 0.1s; opacity: 0; }
    .gold-dot { animation: goldPulse 2s ease infinite; animation-delay: 1.5s; }
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${baseStyles}
${fadeIn}
.canvas {
  background: var(--navy);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: calc(var(--canvas-width) * 0.08);
}
.logo-wrap {
  position: absolute;
  top: calc(var(--canvas-height) * 0.06);
  left: calc(var(--canvas-width) * 0.08);
}
.logo-text {
  font-size: calc(var(--canvas-width) * 0.022);
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--gold);
}
.logo-sub {
  font-size: calc(var(--canvas-width) * 0.01);
  font-weight: 400;
  letter-spacing: 0.4em;
  color: var(--gold);
  opacity: 0.7;
}
.content {
  margin-top: calc(var(--canvas-height) * 0.1);
}
.divider {
  width: 60px;
  height: 2px;
  background: var(--gold);
  margin-bottom: calc(var(--canvas-height) * 0.04);
}
.headline {
  font-size: calc(var(--canvas-width) * 0.065);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--white);
  margin-bottom: calc(var(--canvas-height) * 0.025);
  max-width: 85%;
}
.subheadline {
  font-size: calc(var(--canvas-width) * 0.028);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255,255,255,0.65);
  max-width: 75%;
  margin-bottom: calc(var(--canvas-height) * 0.05);
}
.stat-wrap {
  display: flex;
  align-items: center;
  gap: calc(var(--canvas-width) * 0.02);
  margin-top: calc(var(--canvas-height) * 0.04);
}
.stat {
  font-size: calc(var(--canvas-width) * 0.1);
  font-weight: 800;
  color: var(--gold);
  line-height: 1;
}
.stat-label {
  font-size: calc(var(--canvas-width) * 0.022);
  font-weight: 500;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.cta {
  position: absolute;
  bottom: calc(var(--canvas-height) * 0.07);
  left: calc(var(--canvas-width) * 0.08);
  font-size: calc(var(--canvas-width) * 0.018);
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold);
  display: flex;
  align-items: center;
  gap: 12px;
}
.cta::after {
  content: '→';
  font-size: calc(var(--canvas-width) * 0.022);
}
.corner-accent {
  position: absolute;
  bottom: 0;
  right: 0;
  width: calc(var(--canvas-width) * 0.3);
  height: calc(var(--canvas-height) * 0.3);
  background: radial-gradient(circle at bottom right, rgba(200,169,110,0.12), transparent 70%);
}
.gold-dot {
  position: absolute;
  top: calc(var(--canvas-height) * 0.06);
  right: calc(var(--canvas-width) * 0.08);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
}
</style>
</head>
<body>
<div class="canvas">
  <div class="logo-wrap logo">
    <div class="logo-text">NEOLAB</div>
    <div class="logo-sub">CARE</div>
  </div>
  <div class="gold-dot gold-dot"></div>
  <div class="content">
    <div class="divider divider"></div>
    <h1 class="headline headline">${headline}</h1>
    ${subheadline ? `<p class="subheadline subheadline">${subheadline}</p>` : ""}
    ${stat ? `
    <div class="stat-wrap stat">
      <span class="stat">${stat.replace(/[^0-9]/g, "")}</span>
      <span class="stat-label">${stat.replace(/[0-9]/g, "").trim()}</span>
    </div>` : ""}
  </div>
  ${ctaText ? `<div class="cta cta">${ctaText}</div>` : ""}
  <div class="corner-accent"></div>
</div>
</body>
</html>`;
}

/**
 * Template 2: Photo Overlay — brand image as background with text overlay
 * Uses safe zone data from asset analysis to position text correctly
 * Best for: Instagram, Story, TikTok
 */
export function photoOverlayTemplate(data: TemplateData): string {
  const { headline, subheadline, backgroundImageUrl, subjectPosition, suggestedTextColor, ctaText, animated } = data;

  // Determine text placement based on subject position
  const subjectIsBottom = subjectPosition?.includes("bottom");
  const subjectIsTop = subjectPosition?.includes("top");
  const textAtBottom = !subjectIsBottom;
  const textAtTop = subjectIsBottom;

  const textColor = suggestedTextColor || BRAND.white;

  const fadeIn = animated ? `
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(${textAtBottom ? "20px" : "-20px"}); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { transform: scale(1.05); }
      to { transform: scale(1); }
    }
    .bg-image { animation: scaleIn 3s ease forwards; }
    .text-block { animation: slideIn 0.8s ease forwards; animation-delay: 0.4s; opacity: 0; }
    .logo-wrap { animation: slideIn 0.6s ease forwards; opacity: 0; }
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${baseStyles}
${fadeIn}
.canvas { position: relative; }
.bg-image {
  position: absolute;
  inset: 0;
  background-image: url('${backgroundImageUrl}');
  background-size: cover;
  background-position: center;
}
.gradient-overlay {
  position: absolute;
  inset: 0;
  background: ${textAtBottom
    ? "linear-gradient(to top, rgba(26,26,46,0.92) 0%, rgba(26,26,46,0.4) 50%, rgba(26,26,46,0.1) 100%)"
    : "linear-gradient(to bottom, rgba(26,26,46,0.92) 0%, rgba(26,26,46,0.4) 50%, rgba(26,26,46,0.1) 100%)"
  };
}
.logo-wrap {
  position: absolute;
  ${textAtBottom ? "top: calc(var(--canvas-height) * 0.05)" : "bottom: calc(var(--canvas-height) * 0.05)"};
  left: calc(var(--canvas-width) * 0.07);
  z-index: 10;
}
.logo-text {
  font-size: calc(var(--canvas-width) * 0.025);
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--gold);
}
.logo-sub {
  font-size: calc(var(--canvas-width) * 0.011);
  font-weight: 400;
  letter-spacing: 0.4em;
  color: var(--gold);
  opacity: 0.7;
}
.text-block {
  position: absolute;
  ${textAtBottom ? "bottom: calc(var(--canvas-height) * 0.07)" : "top: calc(var(--canvas-height) * 0.07)"};
  left: calc(var(--canvas-width) * 0.07);
  right: calc(var(--canvas-width) * 0.07);
  z-index: 10;
}
.gold-line {
  width: 50px;
  height: 2px;
  background: var(--gold);
  margin-bottom: calc(var(--canvas-height) * 0.025);
}
.headline {
  font-size: calc(var(--canvas-width) * 0.07);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: ${textColor};
  margin-bottom: calc(var(--canvas-height) * 0.02);
}
.subheadline {
  font-size: calc(var(--canvas-width) * 0.03);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255,255,255,0.75);
}
.cta-tag {
  display: inline-block;
  margin-top: calc(var(--canvas-height) * 0.025);
  padding: 8px 20px;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: calc(var(--canvas-width) * 0.018);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
</head>
<body>
<div class="canvas">
  <div class="bg-image bg-image"></div>
  <div class="gradient-overlay"></div>
  <div class="logo-wrap logo-wrap">
    <div class="logo-text">NEOLAB</div>
    <div class="logo-sub">CARE</div>
  </div>
  <div class="text-block text-block">
    <div class="gold-line"></div>
    <h1 class="headline">${headline}</h1>
    ${subheadline ? `<p class="subheadline">${subheadline}</p>` : ""}
    ${ctaText ? `<div class="cta-tag">${ctaText}</div>` : ""}
  </div>
</div>
</body>
</html>`;
}

/**
 * Template 3: Clinical Data Card — for ingredient/science content
 * Best for: LinkedIn post, Blog OG
 */
export function clinicalCardTemplate(data: TemplateData): string {
  const { headline, subheadline, body, stat, animated } = data;

  const fadeIn = animated ? `
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes expandLine { from { width: 0; } to { width: 100%; } }
    .headline { animation: fadeUp 0.7s ease forwards; animation-delay: 0.3s; opacity: 0; }
    .body-text { animation: fadeUp 0.7s ease forwards; animation-delay: 0.6s; opacity: 0; }
    .stat-block { animation: fadeUp 0.7s ease forwards; animation-delay: 0.9s; opacity: 0; }
    .separator { animation: expandLine 0.5s ease forwards; animation-delay: 0.2s; }
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${baseStyles}
${fadeIn}
.canvas {
  background: var(--cream);
  color: var(--navy);
  padding: calc(var(--canvas-width) * 0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: calc(var(--canvas-height) * 0.05);
}
.logo-text {
  font-size: calc(var(--canvas-width) * 0.022);
  font-weight: 700;
  letter-spacing: 0.25em;
  color: var(--navy);
}
.logo-sub {
  font-size: calc(var(--canvas-width) * 0.01);
  letter-spacing: 0.4em;
  color: var(--navy);
  opacity: 0.5;
}
.badge {
  font-size: calc(var(--canvas-width) * 0.014);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
  border: 1px solid var(--gold);
  padding: 6px 14px;
}
.separator {
  width: 100%;
  height: 1px;
  background: rgba(26,26,46,0.15);
  margin-bottom: calc(var(--canvas-height) * 0.04);
}
.headline {
  font-size: calc(var(--canvas-width) * 0.058);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--navy);
  margin-bottom: calc(var(--canvas-height) * 0.025);
  max-width: 90%;
}
.body-text {
  font-size: calc(var(--canvas-width) * 0.026);
  font-weight: 400;
  line-height: 1.6;
  color: rgba(26,26,46,0.7);
  max-width: 80%;
}
.stat-block {
  margin-top: auto;
  padding-top: calc(var(--canvas-height) * 0.04);
  border-top: 1px solid rgba(26,26,46,0.1);
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.stat-num {
  font-size: calc(var(--canvas-width) * 0.12);
  font-weight: 800;
  color: var(--gold);
  line-height: 1;
}
.stat-desc {
  font-size: calc(var(--canvas-width) * 0.022);
  font-weight: 500;
  color: rgba(26,26,46,0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.footer-url {
  font-size: calc(var(--canvas-width) * 0.016);
  color: rgba(26,26,46,0.35);
  letter-spacing: 0.05em;
  margin-top: 8px;
}
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div>
      <div class="logo-text">NEOLAB</div>
      <div class="logo-sub">CARE</div>
    </div>
    <div class="badge">Clinical</div>
  </div>
  <div class="separator separator"></div>
  <h1 class="headline headline">${headline}</h1>
  ${body ? `<p class="body-text body-text">${body}</p>` : (subheadline ? `<p class="body-text body-text">${subheadline}</p>` : "")}
  ${stat ? `
  <div class="stat-block stat-block">
    <span class="stat-num">${stat.replace(/[^0-9+%x]/g, "")}</span>
    <span class="stat-desc">${stat.replace(/[0-9+%x]/g, "").trim()}</span>
  </div>` : ""}
  <div class="footer-url">neolab.care</div>
</div>
</body>
</html>`;
}

/**
 * Template 4: Story/Reel — full-bleed vertical with animated text reveal
 * Best for: Instagram Story, TikTok, LinkedIn Story
 */
export function storyTemplate(data: TemplateData): string {
  const { headline, subheadline, ctaText, backgroundImageUrl, animated } = data;

  const fadeIn = animated ? `
    @keyframes slideUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleIn { from { transform: scale(1.08); } to { transform: scale(1); } }
    .bg { animation: scaleIn 4s ease forwards; }
    .logo-wrap { animation: fadeIn 0.6s ease forwards; animation-delay: 0.3s; opacity: 0; }
    .headline { animation: slideUp 0.8s ease forwards; animation-delay: 0.6s; opacity: 0; }
    .sub { animation: slideUp 0.8s ease forwards; animation-delay: 0.9s; opacity: 0; }
    .cta-btn { animation: slideUp 0.8s ease forwards; animation-delay: 1.2s; opacity: 0; }
  ` : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${baseStyles}
${fadeIn}
.canvas { position: relative; }
.bg {
  position: absolute;
  inset: 0;
  ${backgroundImageUrl
    ? `background-image: url('${backgroundImageUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(160deg, #1A1A2E 0%, #2D2D4E 50%, #1A1A2E 100%);`
  }
}
.overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(26,26,46,0.95) 0%,
    rgba(26,26,46,0.5) 40%,
    rgba(26,26,46,0.2) 70%,
    rgba(26,26,46,0.4) 100%
  );
}
.logo-wrap {
  position: absolute;
  top: calc(var(--canvas-height) * 0.06);
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
}
.logo-text {
  font-size: calc(var(--canvas-width) * 0.03);
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--gold);
}
.logo-sub {
  font-size: calc(var(--canvas-width) * 0.012);
  letter-spacing: 0.5em;
  color: var(--gold);
  opacity: 0.7;
  text-align: center;
}
.content {
  position: absolute;
  bottom: calc(var(--canvas-height) * 0.1);
  left: calc(var(--canvas-width) * 0.08);
  right: calc(var(--canvas-width) * 0.08);
  z-index: 10;
  text-align: center;
}
.gold-bar {
  width: 40px;
  height: 2px;
  background: var(--gold);
  margin: 0 auto calc(var(--canvas-height) * 0.03);
}
.headline {
  font-size: calc(var(--canvas-width) * 0.085);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--white);
  margin-bottom: calc(var(--canvas-height) * 0.025);
}
.sub {
  font-size: calc(var(--canvas-width) * 0.035);
  font-weight: 400;
  line-height: 1.5;
  color: rgba(255,255,255,0.7);
  margin-bottom: calc(var(--canvas-height) * 0.04);
}
.cta-btn {
  display: inline-block;
  padding: 14px 36px;
  background: var(--gold);
  color: var(--navy);
  font-size: calc(var(--canvas-width) * 0.022);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
</style>
</head>
<body>
<div class="canvas">
  <div class="bg bg"></div>
  <div class="overlay"></div>
  <div class="logo-wrap logo-wrap">
    <div class="logo-text">NEOLAB</div>
    <div class="logo-sub">CARE</div>
  </div>
  <div class="content">
    <div class="gold-bar"></div>
    <h1 class="headline headline">${headline}</h1>
    ${subheadline ? `<p class="sub sub">${subheadline}</p>` : ""}
    ${ctaText ? `<div class="cta-btn cta-btn">${ctaText}</div>` : ""}
  </div>
</div>
</body>
</html>`;
}

/**
 * Selects the best template for a given platform and content type.
 */
export function selectTemplate(
  platform: string,
  data: TemplateData
): string {
  const hasPhoto = !!data.backgroundImageUrl;

  if (platform === "instagram_story" || platform === "tiktok" || platform === "linkedin_story") {
    return storyTemplate(data);
  }

  if (platform === "linkedin_post" || platform === "blog_og") {
    return clinicalCardTemplate(data);
  }

  if (platform === "instagram_square" || platform === "instagram_portrait") {
    return hasPhoto ? photoOverlayTemplate(data) : darkMinimalTemplate(data);
  }

  if (platform === "xiaohongshu") {
    return hasPhoto ? photoOverlayTemplate(data) : storyTemplate(data);
  }

  // Default
  return darkMinimalTemplate(data);
}
