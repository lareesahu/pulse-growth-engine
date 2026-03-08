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
