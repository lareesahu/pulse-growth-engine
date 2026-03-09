# Pulse Content Engine — TODO

## Database & Backend
- [x] Brand workspace schema (brands, content pillars, platform rules, prompt templates)
- [x] Content items schema (generated content, variants, status, scheduling)
- [x] Activity log schema
- [x] Publishing jobs schema
- [x] tRPC routers: brands CRUD
- [x] tRPC routers: content generation (AI invoke)
- [x] tRPC routers: content approval workflow (kanban state transitions)
- [x] tRPC routers: publishing center (schedule, publish)
- [x] tRPC routers: analytics queries
- [x] tRPC routers: activity feed
- [x] tRPC routers: platform integrations (API key management)
- [x] Batch content generation endpoint
- [x] Seed Pulse Branding as default brand with full DNA

## Frontend — Layout & Navigation
- [x] Dark theme with Pulse brand colors (Midnight/Violent Violet base, Jellyfish/Blue Hosta accents)
- [x] DashboardLayout with sidebar navigation
- [x] Brand switcher in sidebar header
- [x] Navigation: Dashboard, Brand Workspace, Ideas, Content, Publishing, Analytics, Integrations

## Frontend — Brand Workspace
- [x] Brand DNA overview (mission, tagline, voice)
- [x] Content pillars list (editable)
- [x] Voice & tone editor
- [x] Audience segments editor
- [x] Platform rules per platform
- [x] Prompt templates library (view/edit/add)

## Frontend — AI Content Generation
- [x] Batch generation panel (10+ ideas, one click)
- [x] Content package generation from approved ideas
- [x] Platform variants (LinkedIn, Instagram, Webflow, WeChat)
- [x] Image prompt + AI image generation
- [x] Content detail page with variant review

## Frontend — Content Kanban (Ideas Board)
- [x] 4-column kanban: Proposed / Approved / Rejected / Archived
- [x] Content cards with title, pillar tag, platform badges, date
- [x] Approve / Edit / Reject / Archive actions on each card
- [x] Create idea modal

## Frontend — Publishing Center
- [x] Stats bar: Ready / Scheduled / Published / Failed
- [x] Publish job queue with status tracking
- [x] Platform-specific job cards
- [x] Mark published / failed / retry controls

## Frontend — Analytics
- [x] Summary stats (ideas, packages, published)
- [x] Funnel stage breakdown chart
- [x] Platform breakdown chart
- [x] AI recommendations (Caelum Liu)
- [x] Recent activity feed

## Frontend — Platform Integrations / Settings
- [x] Webflow API key input
- [x] LinkedIn OAuth credentials
- [x] Instagram API credentials
- [x] WeChat credentials
- [x] All stored securely in database

## Testing
- [x] Vitest: brand CRUD procedures (16 tests passing)
- [x] Vitest: content generation procedure
- [x] Vitest: kanban state transitions

## Local App Packaging
- [x] API credentials stored in DB via Settings page
- [ ] Write start.sh / start.bat launcher scripts for local use
- [ ] Write README with local setup instructions (node, pnpm install, run)
- [ ] Package full project folder and upload to Google Drive

## Mobile Responsiveness (iPhone 17 — 393px)
- [x] AppLayout: bottom tab bar on mobile, slide-in drawer for full nav
- [x] Dashboard: single-column stat cards, stacked pipeline rows
- [x] Brand Workspace: full-width tabs (scrollable), stacked form fields
- [x] Ideas Board: single-column kanban with horizontal scroll or stacked columns
- [x] Content Detail: stacked variant tabs, full-width text areas
- [x] Publishing Center: stacked job cards, compact stats bar
- [x] Analytics: stacked charts, full-width recommendation panel
- [x] Integrations: stacked platform cards, full-width input fields
- [x] Global: touch-friendly tap targets (min 44px), no horizontal overflow

## Autopilot Pipeline (Full Automation)
- [ ] Backend: runPipeline procedure — generate ideas → auto-approve → generate packages → generate variants → generate images in one chain
- [ ] Backend: review queue endpoint — list all fully-generated content packages awaiting final approval
- [ ] Backend: approveForPublishing mutation — approve a package and auto-create publish jobs for all variants
- [ ] Frontend: Review Queue page — single scrollable feed, one card per content package, swipe/tap approve or reject
- [ ] Frontend: Dashboard redesign — single "Run Pipeline" CTA + live pipeline status tracker
- [ ] Frontend: Remove multi-step navigation requirement (pipeline runs silently in background)

## AI Inspector + Full Pipeline Automation
- [ ] DB: inspector_rules table (brandId, ruleType, ruleValue, severity, autoFix, platform)
- [ ] DB: inspection_reports table (variantId, passed, issues, fixedContent, score)
- [ ] Backend: runPipeline — full chain: generate ideas → auto-approve → packages → variants → images → inspect
- [ ] Backend: AI Inspector procedure — runs each variant through GPT-4 with brand ruleset, auto-corrects, returns report
- [ ] Backend: review queue endpoint — list packages with inspection reports, awaiting final approval
- [ ] Backend: approveForPublishing — approve package, auto-create publish jobs for all passing variants
- [ ] Frontend: Inspector Settings page — manage rules (no **, no em-dashes, banned phrases, char limits, tone, image rules)
- [ ] Frontend: Review Queue page — scrollable feed, inspector score badge, issues list, approve/reject per card
- [ ] Frontend: Dashboard — Run Pipeline button, live progress (Generating / Inspecting / Ready to Review), queue badge

## Bug Fixes (from v1.0 Test Report)
- [ ] CRITICAL: Idea card click navigation broken — clicking card does not navigate to /content/:ideaId
- [ ] Module 4 blocked until navigation fix is applied

## New Features (Pipeline Automation + Inspector)
- [ ] Backend: runPipeline — full chain generate ideas → auto-approve → packages → variants → images → inspect
- [ ] Backend: AI Inspector — runs each variant through GPT-4 with brand ruleset, auto-corrects, returns report
- [ ] Backend: review queue endpoint — packages with inspection reports awaiting final approval
- [ ] Backend: approveForPublishing — approve package, auto-create publish jobs
- [ ] Backend: seed default inspector rules (no **, no em-dashes, banned phrases, char limits)
- [ ] Frontend: Inspector Settings page — manage rules by type/platform/severity/autoFix
- [ ] Frontend: Review Queue page — scrollable feed, inspector score badge, approve/reject
- [ ] Frontend: Dashboard redesign — Run Pipeline CTA, live progress, review queue badge

## Multi-Dimensional AI Inspector + Learning Engine
- [ ] Schema: add inspectorThresholds table (per-dimension min scores per brand)
- [ ] Schema: update inspectionReports to store per-dimension scores (humanisation, authenticity, accuracy, platformFit, originality, vitality)
- [ ] Schema: add vitalityPredictions table for tracking prediction vs actual performance
- [ ] Backend: enhanced AI Inspector — 6-dimension scoring, threshold check, auto-regeneration with feedback loop (max 2 retries)
- [ ] Backend: performance learning endpoint — log actual post performance, recalibrate vitality model
- [ ] Backend: inspector thresholds CRUD — set min score per dimension per brand
- [ ] Frontend: Inspector Settings page — dimension toggles, threshold sliders, prediction accuracy chart, evolution log
- [ ] Frontend: Review Queue — per-dimension score rings, vitality badge, inspector feedback visible per card
- [ ] Frontend: Dashboard redesign — Run Pipeline CTA, progress tracker, review queue count, vitality leaderboard
- [ ] Seed: default thresholds for Pulse Branding (all dimensions default 7/10)

## Forum Opportunities Tab
- [ ] Backend: forum opportunity scanner — uses brand pillars + keywords to search for relevant threads via web search
- [ ] Backend: AI drafts tailored reply or post for each opportunity using brand voice and Caelum persona
- [ ] ForumOpportunities page: card feed with thread title, source platform icon, link to original, AI-drafted reply, one-click copy
- [ ] Filter by platform (Reddit / Quora / LinkedIn / All)
- [ ] "Refresh Opportunities" button to re-scan for new threads
- [ ] Mark opportunity as "Used" or "Skip" to track what's been actioned
- [ ] Register /forums route in App.tsx and add to sidebar nav

## Session: Content Tab + Ideas Board Upgrade
- [x] Bug fix: funnelStage enum — added 'decision' to DB enum (ALTER TABLE) and schema
- [x] Backend: content.listPackagesWithDetails — joins packages with ideas, variants, inspection reports
- [x] Backend: content.archivePackage and content.approvePackage mutations
- [x] Backend: idea.batchUpdateStatus — bulk approve/reject/archive
- [x] Backend: idea.batchDelete — bulk archive
- [x] Frontend: Content tab (/content) — status filter tabs, inspector score rings, per-dimension scores, approve/archive actions
- [x] Frontend: Ideas board — chart/kanban toggle view (status bars, funnel stage, pillar breakdown)
- [x] Frontend: Ideas board — batch edit toolbar (select all, approve, gen package, reject, delete)
- [x] Frontend: Ideas board — search + status + pillar filters
- [x] Navigation: Content tab added to sidebar and mobile bottom bar

## Bug Report Fixes (March 8 2026)
- [x] CRITICAL Bug #1: Idea card click does not navigate to content detail page — fixed: use idea-{id} URL prefix
- [x] CRITICAL Bug #2: Content detail page shows "No content found" — fixed: card now passes idea-{id} so ContentDetail queries by ideaId
- [x] MAJOR Bug #3: Packages stuck in Generating — added resetStuckPackages mutation + amber banner with Fix button in Content tab
- [x] MAJOR Bug #4: Generate button no feedback — now shows amber Generating... spinner + toast immediately on click
- [x] MINOR Bug #5: Analytics pillar chart empty — fixed: getAnalyticsSummary now returns pillarBreakdown with pillar names; Analytics page uses it

## Retest Report Fixes (March 9 2026)
- [x] CRITICAL Bug #7: platform_variants SQL insertion error — fixed: pre-serialize hashtags JSON array in createVariant, also fixed keyPoints/failedDimensions/issues/fixedContent
- [x] CRITICAL Bug #1 regression: Content Detail now fetches idea directly and shows title/angle + Generate button even when no package exists
- [x] MAJOR: Reset 18 stuck packages to needs_revision via SQL; ContentDetail shows amber Regenerate banner for stuck packages

## Process Improvement
- [x] Always run live E2E pipeline test in browser before every push
- [x] Fix platform_variants insert error — blog added to enum, platform sanitizer added, runId fixed
- [x] CRITICAL: Review Queue shows "Queue is empty" — fixed: status filter (review_ready → generated), item.contentPackage → item, idea title fetched in enrichment, issues JSON parsed, inspection prompt now returns all 5 dimension scores

## Batch Actions + API Helpers + CMS Field Mapping
- [x] Review Queue: multi-select checkboxes + Select All + batch toolbar (Approve, Reject, Delete, Generate)
- [x] Integrations: API field tooltip helpers with ? icon, description, and hyperlink to where to find each credential
- [x] Webflow: pull live collection schema via API, show field mapping UI, save mapping per brand
- [x] Backend: webflow.getCollections — fetch all collections for a site using stored API key
- [x] Backend: webflow.getCollectionFields — fetch fields for a specific collection
- [x] Backend: webflow.saveFieldMapping — save content field → CMS field mapping per brand per collection
- [x] Backend: webflow.getFieldMapping — retrieve saved mapping for a brand
- [x] DB: webflow_field_mappings table (brandId, collectionId, collectionName, fieldMapping JSON)
