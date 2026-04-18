import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { pipelineRuns, scheduledPosts, systemHealthLog } from "../../drizzle/schema";
import { eq, lt, lte, and, gte, count, sql } from "drizzle-orm";
import { notifyOwner } from "./notification";

// ─── Health Monitoring Helpers ───────────────────────────────────────────────

/** Log a health event to the system_health_log table (non-fatal). */
async function logHealth(event: typeof systemHealthLog.$inferInsert["event"], detail?: string, platform?: string) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(systemHealthLog).values({ event, detail: detail?.slice(0, 2000), platform });
  } catch {
    // Never let health logging crash the scheduler
  }
}

/**
 * Checks all pipeline health conditions and sends owner notifications when
 * human action is needed. Called every 10 scheduler ticks (~10 min).
 */
let _healthCheckTick = 0;
let _lastNotifiedSchedulerDown: number | null = null;
let _lastNotifiedQueueStale: number | null = null;
let _lastNotifiedHighFailures: number | null = null;

async function runHealthChecks() {
  try {
    const db = await getDb();
    if (!db) return;
    const now = Date.now();
    const NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours between repeat alerts

    // ── 1. Scheduler heartbeat: check if we've had a tick in the last 5 min ──
    // (This check runs inside the scheduler itself, so if we reach here the scheduler IS running.
    // We log a tick so the health panel can show "last seen" time.)
    await logHealth("scheduler_tick", `Scheduler alive at ${new Date().toISOString()}`);

    // ── 2. Stale queue: pending scheduled_posts older than 48h ──
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);
    const [staleResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "pending"), lt(scheduledPosts.scheduledAt, fortyEightHoursAgo)));
    const staleCount = Number(staleResult?.cnt ?? 0);
    if (staleCount > 0 && (!_lastNotifiedQueueStale || now - _lastNotifiedQueueStale > NOTIFY_COOLDOWN_MS)) {
      _lastNotifiedQueueStale = now;
      await logHealth("queue_stale_warning", `${staleCount} post(s) pending for >48h`);
      await notifyOwner({
        title: "Action needed: Scheduled posts are overdue",
        content: `${staleCount} scheduled post(s) have been pending for more than 48 hours and haven't published.\n\nPossible causes:\n• The platform integration (LinkedIn, Instagram, etc.) may need reconnecting\n• The MCP connection may have expired\n• The posts may need manual review\n\nGo to the Publishing Center to check and retry failed jobs.`,
      });
    }

    // ── 3. High publish failure rate: >20% failures in last 24h ──
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const [failResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "failed"), gte(scheduledPosts.updatedAt, oneDayAgo)));
    const [totalResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(gte(scheduledPosts.updatedAt, oneDayAgo));
    const failCount = Number(failResult?.cnt ?? 0);
    const totalCount = Number(totalResult?.cnt ?? 0);
    if (totalCount > 2 && failCount / totalCount > 0.2 && (!_lastNotifiedHighFailures || now - _lastNotifiedHighFailures > NOTIFY_COOLDOWN_MS)) {
      _lastNotifiedHighFailures = now;
      await logHealth("publish_failure", `High failure rate: ${failCount}/${totalCount} in last 24h`);
      await notifyOwner({
        title: `High publish failure rate: ${failCount} of ${totalCount} posts failed`,
        content: `${failCount} out of ${totalCount} scheduled posts failed to publish in the last 24 hours (${Math.round(failCount/totalCount*100)}% failure rate).\n\nThis usually means:\n• A platform API token has expired (check Settings → Integrations)\n• The Webflow MCP connection needs re-authentication\n• A platform's API rate limit was hit\n\nGo to the Publishing Center, filter by "Failed", and retry or re-authenticate.`,
      });
    }
  } catch (err: any) {
    console.warn("[HealthCheck] Error during health checks:", err?.message);
  }
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * On server startup, reset any pipeline runs that are stuck in 'running' state
 * (e.g. from a previous server crash or restart mid-run).
 */
async function resetStalePipelineRuns() {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const db = await getDb();
    if (!db) return;
    await db.update(pipelineRuns)
      .set({ status: "failed", stage: "failed", completedAt: new Date(), errorLog: "Server restarted mid-run — auto-reset on startup" })
      .where(and(eq(pipelineRuns.status, "running"), lt(pipelineRuns.startedAt, thirtyMinutesAgo)));
    console.log("[Startup] Stale pipeline runs reset.");
  } catch (err) {
    console.warn("[Startup] Could not reset stale pipeline runs:", err);
  }
}

/**
 * Background scheduler — runs every 60 seconds and publishes any pending
 * scheduled posts whose scheduledAt time has passed.
 * Every 10 ticks (~10 min) it also runs health checks and sends owner alerts.
 */
function startScheduler() {
  let tickCount = 0;
  const tick = async () => {
    tickCount++;
    try {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const duePosts = await db.select().from(scheduledPosts)
        .where(and(eq(scheduledPosts.status, "pending"), lte(scheduledPosts.scheduledAt, now)));
      if (duePosts.length > 0) {
        console.log(`[Scheduler] ${duePosts.length} post(s) due for publishing`);
        for (const post of duePosts) {
          try {
            // Mark as publishing to prevent double-publish
            await db.update(scheduledPosts)
              .set({ status: "publishing" })
              .where(eq(scheduledPosts.id, post.id));
            // Trigger the publish via the publishing router
            const { publishVariantToWebflow } = await import("../routers") as any;
            if (post.platform === "webflow" && publishVariantToWebflow) {
              await publishVariantToWebflow(post.variantId, post.contentPackageId);
            }
            await db.update(scheduledPosts)
              .set({ status: "published", publishedAt: new Date() })
              .where(eq(scheduledPosts.id, post.id));
            await logHealth("publish_success", `Post ${post.id} published`, post.platform);
            console.log(`[Scheduler] Published post ${post.id} (${post.platform})`);
          } catch (err: any) {
            const errMsg = err?.message || String(err);
            console.error(`[Scheduler] Failed to publish post ${post.id}:`, errMsg);
            await db.update(scheduledPosts)
              .set({ status: "failed", errorMessage: errMsg })
              .where(eq(scheduledPosts.id, post.id));
            await logHealth("publish_failure", `Post ${post.id} failed: ${errMsg.slice(0, 200)}`, post.platform);
            // Check if this looks like an MCP auth error
            if (errMsg.toLowerCase().includes("unauthorized") || errMsg.toLowerCase().includes("401") || errMsg.toLowerCase().includes("auth")) {
              await logHealth("mcp_auth_error", `Possible auth expiry on ${post.platform}: ${errMsg.slice(0, 200)}`, post.platform);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[Scheduler] tick error:", err);
      await logHealth("scheduler_error", String(err).slice(0, 500));
    }
    // Run full health checks every 10 ticks (~10 min)
    if (tickCount % 10 === 0) {
      await runHealthChecks();
    }
  };
  // Run immediately on start, then every 60 seconds
  tick();
  setInterval(tick, 60_000);
  console.log("[Scheduler] Background scheduler started (60s interval, health checks every 10 min)");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Email/password auth routes
  registerAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Reset any stale pipeline runs from previous server crashes
  resetStalePipelineRuns();
  // Start background scheduler — checks every 60s for posts due to publish
  startScheduler();

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
