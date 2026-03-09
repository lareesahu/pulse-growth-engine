/**
 * Content Humanizer
 * Strips raw markdown formatting and AI-isms from generated content
 * so all output reads as clean, natural prose.
 */

/**
 * Remove markdown headings (## Heading → Heading)
 */
function stripHeadings(text: string): string {
  return text.replace(/^#{1,6}\s+/gm, "");
}

/**
 * Remove bold/italic markers (** and *)
 * **bold** → bold
 * *italic* → italic
 * __bold__ → bold
 * _italic_ → italic
 */
function stripBoldItalic(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/___(.+?)___/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1");
}

/**
 * Convert markdown bullet lists to clean prose lines
 * "* item" → "item"
 * "- item" → "item"
 * "  * nested" → "item"
 */
function stripBulletPoints(text: string): string {
  return text.replace(/^[ \t]*[-*+]\s+/gm, "");
}

/**
 * Convert markdown numbered lists to clean lines
 * "1. item" → "item"
 */
function stripNumberedLists(text: string): string {
  return text.replace(/^\d+\.\s+/gm, "");
}

/**
 * Remove markdown horizontal rules
 */
function stripHorizontalRules(text: string): string {
  return text.replace(/^[-*_]{3,}\s*$/gm, "");
}

/**
 * Remove markdown blockquotes
 * "> text" → "text"
 */
function stripBlockquotes(text: string): string {
  return text.replace(/^>\s+/gm, "");
}

/**
 * Remove inline code backticks
 * `code` → code
 */
function stripInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, "$1");
}

/**
 * Remove fenced code blocks
 */
function stripCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/~~~[\s\S]*?~~~/g, "");
}

/**
 * Remove markdown links, keep the display text
 * [text](url) → text
 */
function stripLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/**
 * Replace em-dashes (—) with a regular dash or comma for cleaner reading
 * Keep en-dashes (–) as-is since they're used in date ranges etc.
 */
function replaceEmDashes(text: string): string {
  // Replace em-dash with " - " for readability
  return text.replace(/\s*—\s*/g, " - ");
}

/**
 * Remove excessive ellipsis (... or …) — AI loves these
 */
function cleanEllipsis(text: string): string {
  // Replace unicode ellipsis with three dots, then normalise multiple dots
  return text.replace(/…/g, "...").replace(/\.{4,}/g, "...");
}

/**
 * Remove AI filler phrases that sound robotic
 */
function removeAIFillers(text: string): string {
  const fillers = [
    /\bIn conclusion,?\s*/gi,
    /\bIn summary,?\s*/gi,
    /\bTo summarize,?\s*/gi,
    /\bIt's worth noting that\s*/gi,
    /\bIt is worth noting that\s*/gi,
    /\bIt's important to note that\s*/gi,
    /\bIt is important to note that\s*/gi,
    /\bAs an AI language model,?\s*/gi,
    /\bAs a large language model,?\s*/gi,
    /\bCertainly!\s*/gi,
    /\bAbsolutely!\s*/gi,
    /\bGreat question!\s*/gi,
    /\bOf course!\s*/gi,
    /\bSure!\s*/gi,
    /\bHere's?\s+(a|an|the|your|some)\s+/gi,
    /\bHere are\s+(a|an|the|your|some)\s+/gi,
  ];
  let result = text;
  for (const filler of fillers) {
    result = result.replace(filler, "");
  }
  return result;
}

/**
 * Collapse multiple blank lines into a single blank line
 */
function collapseBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

/**
 * Trim leading/trailing whitespace from each line
 */
function trimLines(text: string): string {
  return text
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}

/**
 * Main humanizer — runs all sanitizers in order
 */
export function humanize(text: string): string {
  if (!text || typeof text !== "string") return text;
  let result = text;
  result = stripCodeBlocks(result);
  result = stripHeadings(result);
  result = stripBoldItalic(result);
  result = stripBulletPoints(result);
  result = stripNumberedLists(result);
  result = stripHorizontalRules(result);
  result = stripBlockquotes(result);
  result = stripInlineCode(result);
  result = stripLinks(result);
  result = replaceEmDashes(result);
  result = cleanEllipsis(result);
  result = removeAIFillers(result);
  result = trimLines(result);
  result = collapseBlankLines(result);
  return result.trim();
}

/**
 * Humanize a variant object — applies humanize() to body, caption, title
 */
export function humanizeVariant(variant: {
  title?: string;
  body?: string;
  caption?: string;
  hashtags?: string[];
}): typeof variant {
  return {
    ...variant,
    title: variant.title ? humanize(variant.title) : variant.title,
    body: variant.body ? humanize(variant.body) : variant.body,
    caption: variant.caption ? humanize(variant.caption) : variant.caption,
    // hashtags: strip # prefix if present, keep as plain words
    hashtags: variant.hashtags?.map(h => h.replace(/^#+/, "").trim()).filter(Boolean),
  };
}

/**
 * Humanize a content package object — applies humanize() to masterHook, masterAngle, cta, blogContent, keyPoints
 */
export function humanizePackage(pkg: {
  masterHook?: string;
  masterAngle?: string;
  cta?: string;
  blogContent?: string;
  keyPoints?: string[];
}): typeof pkg {
  return {
    ...pkg,
    masterHook: pkg.masterHook ? humanize(pkg.masterHook) : pkg.masterHook,
    masterAngle: pkg.masterAngle ? humanize(pkg.masterAngle) : pkg.masterAngle,
    cta: pkg.cta ? humanize(pkg.cta) : pkg.cta,
    blogContent: pkg.blogContent ? humanize(pkg.blogContent) : pkg.blogContent,
    keyPoints: pkg.keyPoints?.map(kp => humanize(kp)),
  };
}
