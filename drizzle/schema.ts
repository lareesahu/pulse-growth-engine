import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Brands ───────────────────────────────────────────────────────────────────
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  mission: text("mission"),
  positioning: text("positioning"),
  audienceSummary: text("audienceSummary"),
  toneSummary: text("toneSummary"),
  website: varchar("website", { length: 500 }),
  logoUrl: text("logoUrl"),
  colorPalette: json("colorPalette").$type<Array<{ name: string; hex: string; usage: string }>>(),
  activePlatforms: json("activePlatforms").$type<string[]>(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// ─── Brand Rules ──────────────────────────────────────────────────────────────
export const brandRules = mysqlTable("brand_rules", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  ruleType: mysqlEnum("ruleType", ["do_say", "dont_say", "banned_claim", "required_phrase", "cta_style", "platform_rule", "visual_rule", "prompt_guardrail"]).notNull(),
  scope: mysqlEnum("scope", ["global", "platform_specific"]).default("global").notNull(),
  platform: varchar("platform", { length: 64 }),
  priority: int("priority").default(0),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BrandRule = typeof brandRules.$inferSelect;
export type InsertBrandRule = typeof brandRules.$inferInsert;

// ─── Content Pillars ──────────────────────────────────────────────────────────
export const contentPillars = mysqlTable("content_pillars", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priority: int("priority").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContentPillar = typeof contentPillars.$inferSelect;
export type InsertContentPillar = typeof contentPillars.$inferInsert;

// ─── Audience Profiles ────────────────────────────────────────────────────────
export const audienceProfiles = mysqlTable("audience_profiles", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  segment: varchar("segment", { length: 255 }).notNull(),
  description: text("description"),
  painPoints: text("painPoints"),
  goals: text("goals"),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AudienceProfile = typeof audienceProfiles.$inferSelect;
export type InsertAudienceProfile = typeof audienceProfiles.$inferInsert;

// ─── Prompt Templates ─────────────────────────────────────────────────────────
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  pillar: varchar("pillar", { length: 255 }),
  promptText: text("promptText").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// ─── Platform Preferences ─────────────────────────────────────────────────────
export const platformPreferences = mysqlTable("platform_preferences", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  postFormat: text("postFormat"),
  hashtagStrategy: text("hashtagStrategy"),
  frequency: varchar("frequency", { length: 255 }),
  toneNotes: text("toneNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformPreference = typeof platformPreferences.$inferSelect;
export type InsertPlatformPreference = typeof platformPreferences.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  objective: text("objective"),
  targetPlatforms: json("targetPlatforms").$type<string[]>(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["draft", "active", "completed", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Ideas ────────────────────────────────────────────────────────────────────
export const ideas = mysqlTable("ideas", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  campaignId: int("campaignId"),
  pillarId: int("pillarId"),
  title: varchar("title", { length: 500 }).notNull(),
  angle: text("angle"),
  summary: text("summary"),
  funnelStage: mysqlEnum("funnelStage", ["awareness", "consideration", "conversion", "retention", "decision"]).default("awareness"),
  targetPlatforms: json("targetPlatforms").$type<string[]>(),
  sourceType: mysqlEnum("sourceType", ["manual", "scheduled_generation", "campaign_generation", "batch"]).default("manual"),
  status: mysqlEnum("status", ["proposed", "in_review", "approved", "rejected", "archived"]).default("proposed").notNull(),
  createdByUserId: int("createdByUserId"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = typeof ideas.$inferInsert;

// ─── Content Packages ─────────────────────────────────────────────────────────
export const contentPackages = mysqlTable("content_packages", {
  id: int("id").autoincrement().primaryKey(),
  ideaId: int("ideaId").notNull(),
  brandId: int("brandId").notNull(),
  masterHook: text("masterHook"),
  masterAngle: text("masterAngle"),
  keyPoints: json("keyPoints").$type<string[]>(),
  cta: text("cta"),
  blogContent: text("blogContent"),
  status: mysqlEnum("status", ["pending_generation", "generating", "generated", "needs_revision", "approved_for_publish", "archived"]).default("pending_generation").notNull(),
  version: int("version").default(1),
  generationModel: varchar("generationModel", { length: 100 }),
  generationPrompt: text("generationPrompt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContentPackage = typeof contentPackages.$inferSelect;
export type InsertContentPackage = typeof contentPackages.$inferInsert;

// ─── Platform Variants ────────────────────────────────────────────────────────
export const platformVariants = mysqlTable("platform_variants", {
  id: int("id").autoincrement().primaryKey(),
  contentPackageId: int("contentPackageId").notNull(),
  brandId: int("brandId").notNull(),
  platform: mysqlEnum("platform", ["instagram", "facebook", "linkedin", "tiktok", "webflow", "medium", "xiaohongshu", "wechat", "reddit", "quora"]).notNull(),
  formatType: mysqlEnum("formatType", ["caption", "article", "carousel_copy", "reel_script", "short_post", "long_post"]).default("short_post"),
  title: text("title"),
  body: text("body"),
  caption: text("caption"),
  hashtags: json("hashtags").$type<string[]>(),
  script: text("script"),
  status: mysqlEnum("status", ["draft", "generated", "needs_revision", "approved", "queued", "published", "failed", "archived"]).default("draft").notNull(),
  version: int("version").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlatformVariant = typeof platformVariants.$inferSelect;
export type InsertPlatformVariant = typeof platformVariants.$inferInsert;

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  contentPackageId: int("contentPackageId").notNull(),
  variantId: int("variantId"),
  assetType: mysqlEnum("assetType", ["image_prompt", "image_output", "design_payload", "design_output", "video_prompt", "video_output", "thumbnail"]).notNull(),
  provider: varchar("provider", { length: 100 }),
  promptText: text("promptText"),
  outputUrl: text("outputUrl"),
  status: mysqlEnum("status", ["pending", "generating", "ready", "failed", "replaced"]).default("pending").notNull(),
  version: int("version").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// ─── Integration Accounts ─────────────────────────────────────────────────────
export const integrationAccounts = mysqlTable("integration_accounts", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  apiKey: text("apiKey"),
  apiSecret: text("apiSecret"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  extraConfig: json("extraConfig").$type<Record<string, string>>(),
  status: mysqlEnum("status", ["connected", "expired", "error", "disconnected"]).default("disconnected").notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type IntegrationAccount = typeof integrationAccounts.$inferSelect;
export type InsertIntegrationAccount = typeof integrationAccounts.$inferInsert;

// ─── Publish Jobs ─────────────────────────────────────────────────────────────
export const publishJobs = mysqlTable("publish_jobs", {
  id: int("id").autoincrement().primaryKey(),
  variantId: int("variantId").notNull(),
  contentPackageId: int("contentPackageId").notNull(),
  brandId: int("brandId").notNull(),
  integrationAccountId: int("integrationAccountId"),
  platform: varchar("platform", { length: 64 }).notNull(),
  actionType: mysqlEnum("actionType", ["publish_now", "schedule"]).default("publish_now"),
  scheduledFor: timestamp("scheduledFor"),
  publishStatus: mysqlEnum("publishStatus", ["draft", "queued", "scheduled", "publishing", "published", "partial_failure", "failed", "canceled"]).default("draft").notNull(),
  externalPostId: varchar("externalPostId", { length: 255 }),
  errorLog: text("errorLog"),
  retryCount: int("retryCount").default(0),
  lastAttemptAt: timestamp("lastAttemptAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PublishJob = typeof publishJobs.$inferSelect;
export type InsertPublishJob = typeof publishJobs.$inferInsert;

// ─── Audit Events ─────────────────────────────────────────────────────────────
export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId"),
  actorUserId: int("actorUserId"),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 128 }).notNull(),
  description: text("description"),
  beforeJson: json("beforeJson").$type<Record<string, unknown>>(),
  afterJson: json("afterJson").$type<Record<string, unknown>>(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;

// ─── Inspector Rules ────────────────────────────────────────────────────────────
export const inspectorRules = mysqlTable("inspector_rules", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  ruleType: mysqlEnum("ruleType", [
    "banned_phrase",    // exact phrase to never use
    "banned_pattern",  // regex pattern to never use
    "required_phrase", // phrase that must appear
    "char_limit",      // max character count per platform
    "tone_rule",       // tone instruction for LLM check
    "formatting_rule", // e.g. no ** no em-dash
    "image_rule",      // image style requirement
    "custom_prompt",   // free-form LLM instruction
  ]).notNull(),
  platform: varchar("platform", { length: 64 }), // null = global
  ruleValue: text("ruleValue").notNull(),          // the rule content
  severity: mysqlEnum("severity", ["error", "warning", "info"]).default("error").notNull(),
  autoFix: boolean("autoFix").default(false),      // attempt LLM auto-fix
  isActive: boolean("isActive").default(true),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InspectorRule = typeof inspectorRules.$inferSelect;
export type InsertInspectorRule = typeof inspectorRules.$inferInsert;
// ─── Inspector Thresholds ─────────────────────────────────────────────────────────
export const inspectorThresholds = mysqlTable("inspector_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  dimension: varchar("dimension", { length: 64 }).notNull(), // humanisation|authenticity|accuracy|platformFit|originality|vitality
  minScore: int("minScore").default(7).notNull(),            // 1-10, content below this is auto-rejected
  isActive: boolean("isActive").default(true).notNull(),
  weight: int("weight").default(1).notNull(),                // relative weight in vitality calculation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type InspectorThreshold = typeof inspectorThresholds.$inferSelect;
export type InsertInspectorThreshold = typeof inspectorThresholds.$inferInsert;

// ─── Inspection Reports ──────────────────────────────────────────────────────────
export const inspectionReports = mysqlTable("inspection_reports", {
  id: int("id").autoincrement().primaryKey(),
  contentPackageId: int("contentPackageId").notNull(),
  brandId: int("brandId").notNull(),
  // Multi-dimensional scores (1-10 each)
  humanisationScore: int("humanisationScore"),
  authenticityScore: int("authenticityScore"),
  accuracyScore: int("accuracyScore"),
  platformFitScore: int("platformFitScore"),
  originalityScore: int("originalityScore"),
  vitalityScore: int("vitalityScore"),              // composite prediction score
  overallScore: int("overallScore"),                // weighted average 0-100
  passed: boolean("passed").default(false).notNull(),
  failedDimensions: json("failedDimensions").$type<string[]>(),
  issues: json("issues").$type<Array<{ dimension: string; score: number; feedback: string; suggestion: string }>>(),
  fixedContent: json("fixedContent").$type<Record<string, string>>(),
  regenerationFeedback: text("regenerationFeedback"),  // feedback sent back to LLM on failure
  attemptNumber: int("attemptNumber").default(1),
  inspectorVersion: varchar("inspectorVersion", { length: 32 }).default("2.0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type InspectionReport = typeof inspectionReports.$inferSelect;
export type InsertInspectionReport = typeof inspectionReports.$inferInsert;
// ─── Pipeline Runs ──────────────────────────────────────────────────────────
export const pipelineRuns = mysqlTable("pipeline_runs", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  triggeredByUserId: int("triggeredByUserId"),
  status: mysqlEnum("status", ["running", "completed", "failed", "partial"]).default("running").notNull(),
  stage: varchar("stage", { length: 128 }),
  ideasGenerated: int("ideasGenerated").default(0),
  ideasApproved: int("ideasApproved").default(0),
  packagesGenerated: int("packagesGenerated").default(0),
  packagesInspected: int("packagesInspected").default(0),
  packagesPassedInspection: int("packagesPassedInspection").default(0),
  packagesFailedInspection: int("packagesFailedInspection").default(0),
  packagesRegenerated: int("packagesRegenerated").default(0),
  readyForReview: int("readyForReview").default(0),
  errorLog: text("errorLog"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type InsertPipelineRun = typeof pipelineRuns.$inferInsert;

// ─── Vitality Predictions (Learning Engine) ───────────────────────────────────────
export const vitalityPredictions = mysqlTable("vitality_predictions", {
  id: int("id").autoincrement().primaryKey(),
  contentPackageId: int("contentPackageId").notNull(),
  brandId: int("brandId").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  predictedScore: int("predictedScore").notNull(),   // 1-100 predicted vitality
  actualEngagement: int("actualEngagement"),          // actual engagement score after publishing
  predictionError: int("predictionError"),            // |predicted - actual|
  modelVersion: varchar("modelVersion", { length: 32 }).default("1.0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});
export type VitalityPrediction = typeof vitalityPredictions.$inferSelect;
export type InsertVitalityPrediction = typeof vitalityPredictions.$inferInsert;

// ─── Performance Records ──────────────────────────────────────────────────────
export const performanceRecords = mysqlTable("performance_records", {
  id: int("id").autoincrement().primaryKey(),
  publishJobId: int("publishJobId").notNull(),
  platform: varchar("platform", { length: 64 }).notNull(),
  views: int("views"),
  likes: int("likes"),
  comments: int("comments"),
  shares: int("shares"),
  clicks: int("clicks"),
  capturedAt: timestamp("capturedAt").defaultNow().notNull(),
});
export type PerformanceRecord = typeof performanceRecords.$inferSelect;
export type InsertPerformanceRecord = typeof performanceRecords.$inferInsert;
