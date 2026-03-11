import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";
import { pipelineRuns, scheduledPosts } from "../../drizzle/schema";
import { eq, lt, lte, and } from "drizzle-orm";

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
 */
function startScheduler() {
  const tick = async () => {
    try {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const duePosts = await db.select().from(scheduledPosts)
        .where(and(eq(scheduledPosts.status, "pending"), lte(scheduledPosts.scheduledAt, now)));
      if (duePosts.length === 0) return;
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
          console.log(`[Scheduler] Published post ${post.id} (${post.platform})`);
        } catch (err: any) {
          console.error(`[Scheduler] Failed to publish post ${post.id}:`, err.message);
          await db.update(scheduledPosts)
            .set({ status: "failed", errorMessage: err.message })
            .where(eq(scheduledPosts.id, post.id));
        }
      }
    } catch (err) {
      console.warn("[Scheduler] tick error:", err);
    }
  };
  // Run immediately on start, then every 60 seconds
  tick();
  setInterval(tick, 60_000);
  console.log("[Scheduler] Background scheduler started (60s interval)");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
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
