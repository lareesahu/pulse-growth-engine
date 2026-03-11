import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { getDb } from "../db";
import { systemHealthLog, scheduledPosts, publishJobs } from "../../drizzle/schema";
import { eq, and, gte, lt, count, desc } from "drizzle-orm";

export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0) }))
    .query(() => ({ ok: true })),

  /**
   * Returns a full pipeline health snapshot:
   * - Scheduler last heartbeat (is it alive?)
   * - Pending/failed/published post counts
   * - Stale queue count (pending >48h)
   * - Recent health events
   */
  pipelineHealth: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;

    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Last scheduler tick
    const [lastTick] = await db.select()
      .from(systemHealthLog)
      .where(eq(systemHealthLog.event, "scheduler_tick"))
      .orderBy(desc(systemHealthLog.createdAt))
      .limit(1);

    const schedulerAlive = lastTick
      ? lastTick.createdAt.getTime() > fiveMinAgo.getTime()
      : false;

    // Scheduled posts health
    const [pendingResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(eq(scheduledPosts.status, "pending"));
    const [staleResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "pending"), lt(scheduledPosts.scheduledAt, fortyEightHoursAgo)));
    const [failedResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "failed"), gte(scheduledPosts.updatedAt, oneDayAgo)));
    const [publishedResult] = await db.select({ cnt: count() }).from(scheduledPosts)
      .where(and(eq(scheduledPosts.status, "published"), gte(scheduledPosts.publishedAt, oneDayAgo)));

    // Platform breakdown from publish_jobs
    const platformBreakdown = await db.select({
      platform: publishJobs.platform,
      status: publishJobs.publishStatus,
      cnt: count(),
    }).from(publishJobs).groupBy(publishJobs.platform, publishJobs.publishStatus);

    // Recent health events (last 20)
    const recentEvents = await db.select()
      .from(systemHealthLog)
      .orderBy(desc(systemHealthLog.createdAt))
      .limit(20);

    // MCP auth errors in last 24h
    const [mcpAuthErrors] = await db.select({ cnt: count() }).from(systemHealthLog)
      .where(and(eq(systemHealthLog.event, "mcp_auth_error"), gte(systemHealthLog.createdAt, oneDayAgo)));

    const pendingCount = Number(pendingResult?.cnt ?? 0);
    const staleCount = Number(staleResult?.cnt ?? 0);
    const failedCount = Number(failedResult?.cnt ?? 0);
    const publishedCount = Number(publishedResult?.cnt ?? 0);
    const mcpAuthErrorCount = Number(mcpAuthErrors?.cnt ?? 0);

    // Determine overall health
    let overallStatus: "healthy" | "warning" | "critical" = "healthy";
    const warnings: string[] = [];
    const actions: string[] = [];

    if (!schedulerAlive) {
      overallStatus = "critical";
      warnings.push("Scheduler has not ticked in the last 5 minutes");
      actions.push("Restart the server to resume the background scheduler");
    }
    if (staleCount > 0) {
      if (overallStatus !== "critical") overallStatus = "warning";
      warnings.push(`${staleCount} scheduled post(s) are overdue by >48 hours`);
      actions.push("Go to Publishing Center and retry or cancel overdue posts");
    }
    if (mcpAuthErrorCount > 0) {
      if (overallStatus !== "critical") overallStatus = "warning";
      warnings.push(`${mcpAuthErrorCount} MCP auth error(s) in the last 24 hours`);
      actions.push("Re-authenticate Webflow in Settings -> Integrations");
    }
    if (failedCount > 0 && publishedCount > 0 && failedCount / (failedCount + publishedCount) > 0.2) {
      if (overallStatus !== "critical") overallStatus = "warning";
      warnings.push(`High failure rate: ${failedCount} failed vs ${publishedCount} published today`);
      actions.push("Check platform API tokens in Settings -> Integrations");
    }

    return {
      overallStatus,
      warnings,
      actions,
      scheduler: {
        alive: schedulerAlive,
        lastSeen: lastTick?.createdAt ?? null,
      },
      queue: {
        pending: pendingCount,
        stale: staleCount,
        failedToday: failedCount,
        publishedToday: publishedCount,
      },
      mcpAuthErrors: mcpAuthErrorCount,
      platformBreakdown,
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        event: e.event,
        platform: e.platform,
        detail: e.detail,
        createdAt: e.createdAt,
      })),
    };
  }),

  notifyOwner: adminProcedure
    .input(z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required"),
    }))
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return { success: delivered } as const;
    }),
});
