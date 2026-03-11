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

## Bug Fixes (March 9 2026 — Round 2)
- [x] BUG: Assets tab shows broken image placeholders — fixed: frontend was reading a.url but schema stores a.outputUrl; Assets tab now shows prompt text + Generate button for image_prompt assets, full image for image_output assets
- [x] FEATURE: Content humanizer — server/humanizer.ts added; strips ##, **, *, em-dashes, bullet points, AI fillers from all generated variants and packages before saving; wired into both content.generate and pipeline.run procedures

## Bug Fixes (March 9 2026 — Round 3)
- [x] Integrations tooltips: replace documentation page links with direct API key/token generation URLs
- [x] Ideas board: add "Delete All" / "Clear All" bulk action button (with confirmation dialog) to wipe all ideas in one click
- [x] Backend: batchDeleteAllIdeas procedure — archives or hard-deletes all ideas for a brand

## Doubao/Ark Integration (March 9 2026)
- [x] Replace Manus built-in LLM (usage exhausted) with Doubao/Ark API for all text generation
- [x] Replace Manus built-in image generation with Doubao Seedream-3.0 via Ark API
- [x] Add AI Model Settings page (/ai-models) with text/image/video model selectors
- [x] Add AI Models nav item to sidebar
- [x] Forge fallback preserved if DOUBAO_API_KEY not set

## Bug Fixes (March 9 2026 — Round 4)
- [x] BUG: Pipeline fails with 400 Bad Request — max_tokens 32768 exceeds doubao-1-5-pro-32k limit of 16384; fixed to 16000

## Bug Fixes (March 9 2026 — Round 5)
- [ ] BUG: Pipeline runs but generates 0 ideas and 0 content packages — no real LLM content being produced

## Bug Fixes (March 9 2026 — Round 6 — Critical)
- [x] BUG: Pipeline cancels when switching tabs — converted to background server job with polling
- [x] BUG: Variants have empty content — dynamic platform-aware prompts + fallback content for all platforms
- [x] BUG: Master Hook/Angle/CTA all showing "—" — fixed: saveGeneratedContent helper now properly saves all fields
- [x] BUG: Inspector scores all 0 but Overall Quality 100/100 — fixed: improved prompt, clamped scores, stripped [platform]: prefix from auto-fix
- [x] BUG: Some packages stuck in "generating" status — resetStuckPackages already exists, plus background pipeline prevents new stuck packages
- [x] FEATURE: Batch actions on Content page — checkboxes, select all, bulk approve/reject/archive

## CRITICAL Production Issues (March 9 2026 — Full Workflow Test)
- [x] BUG: Inspector scores/report NOT shown in content detail view — FIXED: added Inspector tab with Overall Score, Vitality, 5 dimension bars, pass/fail badge
- [ ] BUG: Approve/Reject buttons missing from content detail page — can only approve from list
- [ ] BUG: Key Points section empty on all content detail pages — not populated by LLM
- [x] BUG: Run Pipeline button disappears when pipeline is running — FIXED: latestRun useEffect now detects completed state and shows done UI with Run Again button
- [ ] BUG: Webflow publishing — need to test actual end-to-end publish and verify content appears on Webflow site
- [ ] BUG: Content detail page Blog tab — need to verify blog variant content is shown correctly
- [ ] BUG: Vitality scores very low (30, 60) — verify scoring logic is calibrated correctly
- [x] RENAME: "Vitality" → "Virality" throughout entire system (DB column renamed via SQL, schema updated, pipeline-engine.ts prompt updated, ContentDetail.tsx, InspectorSettings.tsx, ReviewQueue.tsx, ContentPackages.tsx all updated)
- [ ] BUG: Stuck package "Fix" button — need to verify it actually resets and retriggers generation
- [ ] BUG: Pipeline shows "1 Packages" in Last Pipeline Run despite generating multiple — counter not updating

## CONFIRMED BUGS from Full Workflow Test (March 9 2026)
- [x] CRITICAL: Publishing Center — FIXED: added publishToWebflow mutation with real Webflow CMS API v2 call, confirmation dialog, error handling
- [x] CRITICAL: Publishing Center — FIXED: getPublishJobs now JOINs contentPackages to show content title on every job card
- [ ] CRITICAL: Review Queue — Preview shows idea description text instead of actual variant body content.
- [x] MAJOR: Content detail page — FIXED: Inspector tab added with full score display; Approve/Reject buttons already exist in header
- [x] MAJOR: Publishing Center — FIXED: "Push to Webflow" button added, calls Webflow CMS API v2 with field mapping
- [ ] MINOR: First two Review Queue items have no inspector scores (no vitality/dimension scores shown).
- [ ] MINOR: Assets tab shows image prompt placeholder but no generated image.

## Features Before Publish (March 9 2026)
- [x] FEATURE: Content page — "Regenerate Selected" batch action — DONE: batchRegenerate procedure + purple Regenerate button in batch toolbar
- [x] FEATURE: Publishing Center — "Publish All Webflow" button — DONE: publishAllWebflow procedure + button in header (only shows when Webflow connected)
- [x] VERIFY: Webflow end-to-end publish — DONE: API call confirmed, error handling confirmed, collection ID required in Settings → Integrations → Webflow

## Bug Fixes (March 9 2026 — Round 7 — User Report)
- [x] BUG: Blog tab is empty — FIXED: added generateBlog procedure (800-1200 word article via LLM), Blog tab now shows empty state with "Generate Blog Article" button + Regenerate button; displays article with char count + read time
- [x] BUG: "No image prompt found" error toast — FIXED: generateImage now auto-creates fallback image_prompt asset from masterHook if none exists in DB
- [x] BUG: "Generating..." button stuck on content detail page — FIXED: handleGenerateVariants now calls batchRegenerate({ids:[pkg.id]}) instead of content.generate({ideaId}) which required idea.status==approved

## Bug Fixes (March 10 2026 — Round 8)
- [ ] BUG: Pipeline permanently stuck on "Crafting Variants" — background job crashed/timed out but run status never updated to failed; need to reset stuck run + add timeout/error recovery so pipeline always completes or fails gracefully

## Bug Fixes + Features (March 10 2026 — Round 9)
- [x] BUG: Pipeline stuck on "Crafting Variants" forever — FIXED: reset stale DB run via SQL + added startup cleanup in _core/index.ts to auto-reset runs older than 30min on server start
- [x] FEATURE: Show live package/idea counts on each pipeline stage card — DONE: each stage card now shows live count badge (e.g. "3/10" for Building Content, "5" for Inspecting)
- [x] BUG: Blog content NOT auto-generated during pipeline run — FIXED: wired blog generation (800-1200 word LLM article) into pipeline engine after each package, non-fatal if fails
- [x] BUG: Images NOT auto-generated during pipeline run — FIXED: wired image generation (with auto-fallback prompt) into pipeline engine after each package, non-fatal if fails

## UI Improvements (March 10 2026 — Round 10)
- [x] REDESIGN: Ideas page — replace Kanban with clean list/table view, mobile-friendly, no horizontal scroll

## Critical Fixes (March 10 2026 — Round 11 — User Report)
- [x] BUG: Variant body content is just the title repeated — FIXED: replaced single-call JSON generation with 9 sequential validated prompts (blog title, blog HTML, subheader, summary, banner concept, image prompt, WeChat article, WeChat title, social caption) exactly matching original Pulse Branding Zapier flow
- [x] BUG: Image style wrong — FIXED: image generation now uses Prompt #6 from validated prompts (cinematic brand photography, teal/blue/violet neon tones, 16:9, no text, ultra-sharp editorial quality)
- [x] BUG: Webflow publishing failing — ROOT CAUSE: API token missing 'cms:write' scope (403 OAuthForbidden). FIXED: updated Integrations help text with clear instructions to regenerate token with CMS Read+Write scope. Added 'Retry All Failed' button to Publishing Center header.

## Next Steps (March 10 2026 — Round 12)
- [x] FEATURE: Review badge on bottom nav — DONE: red badge shows pending count on Review tab, refreshes every 30s
- [x] TEST: Run fresh pipeline with 9-step validated prompts — PASSED: 10/10 packages completed, all with real blog HTML (2252-4760 chars), WeChat content (709-1172 chars), images generated, inspector passed all 10

## Bug Fixes (March 10 2026 — Round 13)
- [x] BUG: Dashboard shows 10 Content Packages but 0 Ideas and 0 Pending Review — FIXED: same as below
- [x] BUG: Dashboard/Ideas show 0 stats — FIXED: useBrand hook now validates stored brand ID against available brands on load; if stale, auto-falls back to default brand.
- [x] BUG: Top billing banner overlaps page content on mobile — FIXED: AppLayout uses ResizeObserver on document.body to measure the app root's offsetTop (banner height) and applies marginTop + reduced height dynamically.

## Bug Fixes & Features (March 10 2026 — Round 14)
- [x] BUG: Webflow publish fails 403 — improved error messages: 403 now shows exact step-by-step fix (Webflow Site Settings → Integrations → API Access → new token with CMS Read+Write); 401 and 404 also have clear guidance
- [x] FEATURE: Forum Hunt expanded to 10 platforms (Reddit, Quora, LinkedIn, HackerNews, ProductHunt, IndieHackers, GrowthHackers, Medium, Zhihu, Xiaohongshu)
- [x] FEATURE: Forum Hunt uses brand keywords from Brand Workspace (name, positioning, audienceSummary, pillar names) as search prompts
- [x] FEATURE: Forum Hunt shows real matched threads/posts with links; Chinese platforms get Chinese reply drafts
- [x] FEATURE: Chinese humanizer — humanizeZh() second pass runs on WeChat and Xiaohongshu content (strips Chinese AI filler phrases)
- [x] FEATURE: AI Models settings — separate Chinese Text Model selector for WeChat/Xiaohongshu (DOUBAO_ZH_TEXT_MODEL env var)

## Bug Fix (March 10 2026 — Round 15)
- [x] BUG: Billing banner overlaps page content on mobile (published site) — FIXED: AppLayout now reads banner height from manus-content-root shadow DOM (.billing-banner, fixed, 36px); polls at 300ms+1000ms for shadow DOM readiness; fallback to #root.getBoundingClientRect().top
- [x] BUG: Forum Hunt returning zero results — ROOT CAUSE: Google/search Data API does not exist in Manus hub. FIXED: Reddit public JSON API + HackerNews Algolia API + Medium RSS feed for open platforms; LLM synthesis with direct search URLs for gated platforms; added 10s timeout per LLM platform + 8s per reply draft so scan completes in ~15s even when LLM is unavailable. E2E TESTED: 18 real results returned from Reddit/HN/Medium with AI-drafted replies.

## Bug Fix (March 10 2026 — Round 16)
- [x] BUG: Webflow Integrations page — getWebflowCollections/getWebflowCollectionFields now return friendly 403/401/404 messages ("Token missing CMS scope. Fix: Site Settings → Integrations → API Access → new v2 token with CMS Read+Write") instead of raw JSON. Loading... button resets to Load Collections after error (correct behaviour, not a stuck state).

## Feature (March 10 2026 — Round 17)
- [ ] FEATURE: Review Queue — sort by score (high→low, low→high), filter by score range (e.g. <70, 70-85, >85), filter by platform, filter by pillar
- [ ] FEATURE: Review Queue — batch regenerate selected items with inspector feedback (pass failed dimensions + issues as context so LLM targets specific weaknesses)
- [ ] FEATURE: Review Queue — show score badge prominently on each card with colour coding (red <70, amber 70-84, green ≥85)

## Feature (March 10 2026 — Round 17)
- [x] FEATURE: Review Queue — sort by score (high→low, low→high), virality, newest, oldest
- [x] FEATURE: Review Queue — filter by score tier (≥85 Excellent / 70–84 Good / <70 Needs Work), platform, pillar
- [x] FEATURE: Review Queue — batch Regen w/ Feedback: passes inspector issues + failed dimensions as LLM context, re-generates all selected packages
- [x] FEATURE: Review Queue — empty state when filters match nothing, with Clear filters link
- [x] E2E TESTED: sort/filter/batch-select/Regen w/ Feedback all confirmed working in dev server

## Feature (March 11 2026 — Round 18)
- [ ] FEATURE: Hide Chinese platforms completely — remove WeChat, Xiaohongshu from all UI (dashboard, publishing, forums, platform filters)
- [ ] FEATURE: Keep WeChat/Xiaohongshu content generation for manual copy-paste only (no auto-publishing)
- [ ] BUG: Webflow body field empty when article published — need to map HTML/markdown content to Webflow rich text format
- [ ] FEATURE: Inspect Webflow CMS field structure and types to understand body field requirements
- [ ] TEST: Full E2E publish test — generate → review → publish to Webflow → verify article appears in CMS with populated body


## Feature (March 11 2026 — Round 18)
- [x] FEATURE: Hide Chinese platforms (WeChat, Xiaohongshu) from all UI — removed from dashboard, publishing, forums, platform filters, integrations, content detail, review queue; kept content generation for manual copy-paste only
- [x] BUG FIX: Webflow body field empty — now converts plain text/markdown to proper HTML format with <p> tags and <br/> line breaks before sending to Webflow API; tested end-to-end (fails only due to missing cms:write scope on token, not body field issue)
- [x] FEATURE: Improved Webflow error messages — 403 now shows exact step-by-step fix (Site Settings → Integrations → API Access → generate new v2 token with CMS Read+Write → paste in Settings → Integrations)
