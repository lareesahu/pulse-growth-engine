# Pulse Growth Engine — Autonomous Agent Operating Guide

This file is the complete reference for any AI agent to operate the Pulse Growth Engine autonomously. Read this before taking any action on the app.

---

## What This App Does

The **Pulse Growth Engine** is a content operations platform for **NeoLab Care** (`brandId: 2`). It:

1. Generates content ideas using AI (GPT-4.1-mini via OpenAI)
2. Produces full multi-platform content packages (Instagram, TikTok, LinkedIn, Xiaohongshu)
3. Runs quality inspection against brand rules
4. Schedules and publishes content to Webflow, Notion, and other platforms

---

## App Access

| Item | Value |
|---|---|
| **Live URL** | `https://pulse-growth-engine-production.up.railway.app` |
| **Login email** | `lareesa@pulse-branding.com` |
| **Login password** | stored in Railway as `JWT_SECRET` — ask the owner |
| **Brand ID** | `2` (NeoLab Care) |
| **GitHub repo** | `lareesahu/pulse-growth-engine` |
| **Railway project** | `zoological-friendship` |

---

## Authentication

All API calls require a session cookie. Always sign in first:

```http
POST /api/auth/signin
Content-Type: application/json

{ "email": "lareesa@pulse-branding.com", "password": "<password>" }
```

The response sets a `session` cookie. Include it in all subsequent requests.

---

## API Protocol — tRPC

All app functionality is exposed via tRPC at `/api/trpc/{router}.{procedure}`.

**Mutation (write operations):**
```http
POST /api/trpc/{router}.{procedure}
Content-Type: application/json
Cookie: session=<token>

{ "json": { ...inputFields } }
```

**Query (read operations):**
```http
GET /api/trpc/{router}.{procedure}?input={"json":{...inputFields}}
Cookie: session=<token>
```

**Response envelope:**
```json
{ "result": { "data": { "json": <actual response> } } }
```

**Python helper (copy-paste ready):**
```python
import requests, json

BASE = "https://pulse-growth-engine-production.up.railway.app"
BRAND_ID = 2

session = requests.Session()
session.post(f"{BASE}/api/auth/signin", json={
    "email": "lareesa@pulse-branding.com",
    "password": "<password>"
})

def mut(proc, data):
    r = session.post(f"{BASE}/api/trpc/{proc}",
                     json={"json": data},
                     headers={"Content-Type": "application/json"})
    return r.json()["result"]["data"]["json"]

def qry(proc, data=None):
    params = {"input": json.dumps({"json": data})} if data else {}
    r = session.get(f"{BASE}/api/trpc/{proc}", params=params)
    return r.json()["result"]["data"]["json"]
```

---

## Core Workflows

### 1. Run the Full Content Pipeline (recommended weekly)

This is the primary autonomous operation. It generates ideas, produces content, runs quality inspection, and returns a run ID to poll.

```python
# Trigger pipeline — runs in background, returns immediately
run = mut("pipeline.run", {
    "brandId": BRAND_ID,
    "ideaCount": 10,           # number of ideas to generate
    "autoApproveIdeas": True,  # auto-approve ideas for content generation
    "runInspector": True,      # run quality inspection after generation
})
run_id = run["runId"]

# Poll status until complete
import time
while True:
    status = qry("pipeline.getRunStatus", {"brandId": BRAND_ID})
    print(status["progress"])
    if status["status"] in ("completed", "failed"):
        break
    time.sleep(10)
```

### 2. Generate Ideas Only

```python
ideas = mut("idea.generateBatch", {
    "brandId": BRAND_ID,
    "count": 10,
    "platform": "instagram",  # optional: instagram | tiktok | linkedin | xiaohongshu
    "pillar": "The Science",  # optional: content pillar name
})
```

### 3. Generate Content for a Specific Idea

```python
# Get list of approved ideas
ideas = qry("idea.list", {"brandId": BRAND_ID, "status": "approved"})
idea_id = ideas[0]["id"]

# Generate full content package (all platform variants)
pkg = mut("content.generate", {"ideaId": idea_id, "brandId": BRAND_ID})
```

### 4. Review Queue — Approve or Reject Content

```python
# Get all packages awaiting review
queue = qry("pipeline.getReviewQueue", {"brandId": BRAND_ID})

for pkg in queue:
    print(f"ID: {pkg['id']} | Hook: {pkg['masterHook']}")
    # Approve for publishing
    mut("pipeline.approveForPublishing", {
        "contentPackageId": pkg["id"],
        "platforms": ["instagram", "tiktok", "linkedin", "xiaohongshu"]
    })
    # OR reject with reason
    # mut("pipeline.rejectPackage", {"contentPackageId": pkg["id"], "reason": "Off-brand tone"})
```

### 5. Regenerate with Feedback

```python
mut("content.regenWithFeedback", {
    "id": package_id,
    "feedback": "Too promotional. Lead with the science problem, not the product."
})
```

### 6. Publish to Webflow

```python
# Publish all approved content to Webflow blog
mut("publishing.publishAllWebflow", {"brandId": BRAND_ID})
```

### 7. Get Analytics Summary

```python
summary = qry("analytics.summary", {"brandId": BRAND_ID})
print(summary)  # ideas count, content count, publish stats
```

---

## Platform Schedules — Set Once

Configure when content should be posted per platform:

```python
schedules = [
    {"platform": "instagram", "enabled": True, "bestPushTime": "09:00",
     "timezone": "Asia/Singapore", "cadenceType": "weekly",
     "cadenceDays": [1, 3, 5], "autoSchedule": True},  # Mon, Wed, Fri
    {"platform": "tiktok", "enabled": True, "bestPushTime": "18:00",
     "timezone": "Asia/Singapore", "cadenceType": "weekly",
     "cadenceDays": [1, 2, 4, 6], "autoSchedule": True},  # Mon, Tue, Thu, Sat
    {"platform": "linkedin", "enabled": True, "bestPushTime": "08:00",
     "timezone": "Asia/Singapore", "cadenceType": "weekly",
     "cadenceDays": [2, 4], "autoSchedule": True},  # Tue, Thu
    {"platform": "xiaohongshu", "enabled": True, "bestPushTime": "20:00",
     "timezone": "Asia/Singapore", "cadenceType": "weekly",
     "cadenceDays": [3, 6], "autoSchedule": True},  # Wed, Sat
]
for s in schedules:
    mut("scheduling.upsertSchedule", {"brandId": BRAND_ID, **s})
```

---

## Integrations — Set Once

### Webflow
```python
mut("integrations.save", {
    "brandId": BRAND_ID,
    "platform": "webflow",
    "apiKey": "<WEBFLOW_API_KEY>"
})
# Get collections to find the blog collection ID
collections = mut("integrations.getWebflowCollections", {"brandId": BRAND_ID})
# Map fields
mut("integrations.saveWebflowFieldMapping", {
    "brandId": BRAND_ID,
    "collectionId": "<collection_id>",
    "titleField": "name",
    "bodyField": "post-body",
    "summaryField": "post-summary",
    "slugField": "slug",
})
```

### Notion
```python
mut("integrations.save", {
    "brandId": BRAND_ID,
    "platform": "notion",
    "apiKey": "<NOTION_API_KEY>"
})
```

---

## Brand Configuration (Already Set — Do Not Overwrite)

| Component | Count | Details |
|---|---|---|
| Brand ID | `2` | NeoLab Care |
| Content Pillars | 6 | The Science, The Problem, The Ritual, The Founder, Social Proof, The Market |
| Audience Profiles | 3 | High-Performance Executive (primary), Informed Minimalist, Grooming-Aware Professional |
| Brand Rules | 8 | Tone guardrails, banned claims, required phrases, CTAs |
| Platform Preferences | 4 | Instagram, TikTok, LinkedIn, Xiaohongshu |
| Prompt Templates | 8 | Platform-specific, pillar-aligned |

---

## Brand Voice Rules (Enforce These in All Content)

1. **Never use superlatives or vague promises.** Use specific numbers and clinical data.
2. **Always cite peer-reviewed sources** for ingredient claims (PubMed ID or Author et al.).
3. **Use physiology-first language:** "sirtuin activation" not "anti-aging", "epidermal recovery" not "skin healing".
4. **Never gender the product.** NeoLab is gender-neutral. No "men's skincare".
5. **Lead with the problem, not the product.** The product earns its place.
6. **Always mention fresh-to-order:** "No retail chain. No shelf time. Maximum potency."
7. **No medical claims.** Use mechanism language: "supports epidermal recovery", not "heals skin".
8. **CTAs are precise and low-pressure:** "See the clinical evidence", not "Buy now!".

---

## Environment Variables (Railway)

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for LLM (gpt-4.1-mini) |
| `DATABASE_URL` | MySQL connection string (Railway internal) |
| `JWT_SECRET` | Session cookie signing secret |
| `WEBFLOW_API_KEY` | Webflow CMS publishing |
| `NOTION_API_KEY` | Notion integration |

To update: `railway variables set KEY="value"` from the repo directory (requires Railway CLI logged in).

---

## Recommended Autonomous Weekly Routine

```python
# Run every Monday morning (or trigger manually)

# 1. Run the full pipeline
run = mut("pipeline.run", {
    "brandId": BRAND_ID,
    "ideaCount": 12,
    "autoApproveIdeas": True,
    "runInspector": True,
})

# 2. Wait for completion (poll every 15s, timeout 10min)
import time
for _ in range(40):
    status = qry("pipeline.getRunStatus", {"brandId": BRAND_ID})
    if status and status["status"] in ("completed", "failed"):
        break
    time.sleep(15)

# 3. Get review queue and approve all passing packages
queue = qry("pipeline.getReviewQueue", {"brandId": BRAND_ID})
passing = [p for p in queue if p.get("status") == "generated"]
for pkg in passing:
    mut("pipeline.approveForPublishing", {
        "contentPackageId": pkg["id"],
        "platforms": ["instagram", "tiktok", "linkedin", "xiaohongshu"]
    })

# 4. Schedule all approved posts
mut("scheduling.scheduleAllApproved", {"brandId": BRAND_ID})

# 5. Publish blog content to Webflow
mut("publishing.publishAllWebflow", {"brandId": BRAND_ID})

# 6. Get analytics summary
summary = qry("analytics.summary", {"brandId": BRAND_ID})
print(f"Pipeline complete: {summary}")
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `No LLM API key configured` | Set `OPENAI_API_KEY` in Railway variables |
| `insufficient_quota` from OpenAI | Top up credits at platform.openai.com/settings/billing |
| `Failed to create user` on signup | `DATABASE_URL` not set — add MySQL service on Railway |
| Content stuck in `generating` status | Call `content.resetStuckPackages` with `brandId: 2` |
| Webflow publish fails | Check `WEBFLOW_API_KEY` and run `integrations.checkWebflowTokenScope` |
| `Brand not found` | Always use `brandId: 2` for NeoLab Care |

---

## Key Files in This Repo

| File | Purpose |
|---|---|
| `server/routers.ts` | All tRPC API procedures (2000+ lines — the full API surface) |
| `server/pipeline-engine.ts` | Core AI content generation logic |
| `server/_core/llm.ts` | LLM invocation (OpenAI primary, Doubao fallback) |
| `server/_core/env.ts` | Environment variable definitions |
| `server/db.ts` | All database operations |
| `drizzle/schema.ts` | Database schema |
| `client/src/` | React frontend |
| `AGENT_SKILL.md` | This file — agent operating guide |
