import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Zap, CheckCheck, Rocket, Brain, RefreshCw,
  Lightbulb, FileText, Globe, Send, Clock,
  TrendingUp, Activity, ChevronRight, Sparkles,
  Loader2, CheckCircle2, AlertCircle, Play, Plus,
  ShieldCheck, ShieldAlert, ShieldX
} from "lucide-react";
import { Link } from "wouter";

const PIPELINE_STEPS = [
  { key: "ideas", label: "Generating Ideas", icon: Lightbulb, color: "text-amber-400" },
  { key: "packages", label: "Building Content", icon: FileText, color: "text-[#5E6AD2]" },
  { key: "variants", label: "Crafting Variants", icon: Globe, color: "text-[#7C3AED]" },
  { key: "images", label: "Generating Images", icon: Sparkles, color: "text-purple-400" },
  { key: "inspection", label: "AI Inspection", icon: Brain, color: "text-[#5E6AD2]" },
  { key: "done", label: "Ready to Review", icon: CheckCheck, color: "text-emerald-400" },
];

type PipelineStatus = "idle" | "running" | "done" | "error";

interface PipelineState {
  status: PipelineStatus;
  currentStep: number;
  stepLabel: string;
  ideasGenerated: number;
  ideasApproved: number;
  packagesGenerated: number;
  variantsGenerated: number;
  packagesInspected: number;
  readyForReview: number;
  totalIdeas: number;
  error?: string;
}

export default function Dashboard() {
  const { activeBrand, activeBrandId, setActiveBrandId, brands } = useBrand();
  const [, navigate] = useLocation();
  const [pipeline, setPipeline] = useState<PipelineState>({
    status: "idle", currentStep: -1, stepLabel: "",
    ideasGenerated: 0, ideasApproved: 0, packagesGenerated: 0, variantsGenerated: 0, packagesInspected: 0, readyForReview: 0, totalIdeas: 10,
  });

  const { data: summary, refetch: refetchSummary } = trpc.analytics.summary.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const { data: latestRun, refetch: refetchRun } = trpc.pipeline.getLatestRun.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const { data: reviewQueue = [] } = trpc.pipeline.getReviewQueue.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId, refetchInterval: pipeline.status === "running" ? 5000 : 30000 }
  );

  const { data: recentActivity = [] } = trpc.activity.list.useQuery(
    { brandId: activeBrandId!, limit: 5 },
    { enabled: !!activeBrandId }
  );

  const { data: publishStats } = trpc.publishing.stats.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: pipelineHealth } = trpc.system.pipelineHealth.useQuery(
    undefined,
    { refetchInterval: 60_000 }
  );

  // Pipeline status polling for background job
  const { data: runStatus, refetch: refetchRunStatus } = trpc.pipeline.getRunStatus.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId && pipeline.status === "running", refetchInterval: 3000 }
  );

  const runPipeline = trpc.pipeline.run.useMutation({
    onMutate: () => {
      setPipeline(p => ({ ...p, status: "running", currentStep: 0, stepLabel: "Generating Ideas...", totalIdeas: 10, ideasGenerated: 0, ideasApproved: 0, packagesGenerated: 0, packagesInspected: 0 }));
    },
    onSuccess: () => {
      // Pipeline is now running in background — polling will track progress
      toast.success("Pipeline started! Running in background — you can switch tabs safely.");
    },
    onError: (err: any) => {
      setPipeline(p => ({ ...p, status: "error", error: err.message }));
      toast.error("Pipeline failed to start: " + err.message);
    },
  });

  // Map stage to step index for progress display
  const stageToStep: Record<string, number> = {
    generating_ideas: 0,
    saving_ideas: 0,
    generating_content: 1,
    generating_images: 3,
    inspecting: 4,
    completed: 5,
  };

  // Track background pipeline progress via polling
  useEffect(() => {
    if (pipeline.status !== "running" || !runStatus) return;
    const progress = (runStatus as any)?.progress;
    const status = (runStatus as any)?.status;
    if (!progress) return;

    if (status === "completed" || status === "partial") {
      setPipeline(p => ({
        ...p,
        status: "done",
        currentStep: 5,
        stepLabel: "Ready to Review",
        ideasGenerated: progress.ideasGenerated ?? p.ideasGenerated,
        ideasApproved: progress.ideasApproved ?? p.ideasApproved,
        packagesGenerated: progress.packagesGenerated ?? p.packagesGenerated,
        variantsGenerated: progress.packagesGenerated ?? p.packagesGenerated,
        packagesInspected: progress.packagesInspected ?? p.packagesInspected,
        readyForReview: progress.packagesPassedInspection ?? 0,
      }));
      refetchSummary();
      refetchRun();
      toast.success(`Pipeline complete — ${progress.packagesPassedInspection ?? 0} pieces ready for review`);
    } else if (status === "failed") {
      setPipeline(p => ({ ...p, status: "error", error: progress.error || "Pipeline failed" }));
      toast.error("Pipeline failed: " + (progress.error || "Unknown error"));
    } else {
      // Still running — update step indicator with live counts
      const step = stageToStep[progress.stage] ?? 0;
      const label = PIPELINE_STEPS[Math.min(step, PIPELINE_STEPS.length - 1)]?.label || progress.stage;
      setPipeline(p => ({
        ...p,
        currentStep: step,
        stepLabel: label,
        ideasGenerated: progress.ideasGenerated ?? p.ideasGenerated,
        ideasApproved: progress.ideasApproved ?? p.ideasApproved,
        packagesGenerated: progress.packagesGenerated ?? p.packagesGenerated,
        packagesInspected: progress.packagesInspected ?? p.packagesInspected,
      }));
    }
  }, [runStatus]);

  // On mount, check if a pipeline is already running or recently completed (e.g. user switched tabs and came back)
  useEffect(() => {
    if (!latestRun) return;
    const run = latestRun as any;
    if (run.status === "running" && pipeline.status === "idle") {
      // Pipeline is running on server — resume tracking
      setPipeline(p => ({ ...p, status: "running", currentStep: 0, stepLabel: "Resuming...", totalIdeas: (run as any).ideasGenerated || 10 }));
    } else if ((run.status === "completed" || run.status === "partial") && pipeline.status === "idle") {
      // Pipeline finished while user was away — show completed state briefly, then reset to idle so they can run again
      const completedRecently = run.completedAt && (Date.now() - new Date(run.completedAt).getTime()) < 5 * 60 * 1000; // 5 min
      if (completedRecently) {
        setPipeline(p => ({
          ...p,
          status: "done",
          currentStep: 5,
          stepLabel: "Ready to Review",
          ideasGenerated: run.ideasGenerated ?? p.ideasGenerated,
          ideasApproved: run.ideasApproved ?? p.ideasApproved,
          packagesGenerated: run.packagesGenerated ?? p.packagesGenerated,
          variantsGenerated: run.packagesGenerated ?? p.packagesGenerated,
          packagesInspected: run.packagesInspected ?? p.packagesInspected,
          readyForReview: run.packagesPassedInspection ?? 0,
        }));
      }
    }
  }, [latestRun]);

  const pendingReview = (reviewQueue as any[]).filter(
    item => item.status === "generated" || item.status === "needs_revision"
  ).length;

  const handleRunPipeline = () => {
    if (!activeBrandId) return toast.error("Select a brand first");
    runPipeline.mutate({
      brandId: activeBrandId,
      ideaCount: 10,
      autoApproveIdeas: true,
      runInspector: true,
    });
  };

  if (!activeBrand && brands.length === 0) {
    return (
      <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
        <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to Pulse Content Engine</h2>
            <p className="text-white/50 text-sm max-w-sm">Create your first brand workspace to start generating content with Caelum Liu, your AI Growth Officer.</p>
          </div>
          <Button asChild style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>
            <Link href="/workspace"><Plus size={16} className="mr-2" /> Create Brand Workspace</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Growth Engine</h1>
            <p className="text-sm text-white/40 mt-0.5">
              {activeBrand?.name} · Caelum Liu
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 ml-2 mb-0.5 animate-pulse" />
            </p>
          </div>
          {pendingReview > 0 && (
            <Button
              onClick={() => navigate("/review")}
              className="flex-shrink-0 bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-xs h-9 gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {pendingReview} to review
            </Button>
          )}
        </div>

        {/* ── RUN PIPELINE CARD ── */}
        <Card className={`border transition-all duration-500 ${
          pipeline.status === "running" ? "border-[#5E6AD2]/40 bg-[#5E6AD2]/5" :
          pipeline.status === "done" ? "border-emerald-500/40 bg-emerald-500/5" :
          pipeline.status === "error" ? "border-red-500/40 bg-red-500/5" :
          "border-white/10 bg-white/3 hover:border-[#5E6AD2]/30"
        }`}>
          <CardContent className="p-5">
            {pipeline.status === "idle" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#5E6AD2]" />
                    Run Content Pipeline
                  </h2>
                  <p className="text-white/40 text-sm mt-1">
                    Caelum generates 10 ideas → builds all variants → inspects quality → delivers to your review queue. Zero clicks needed after this.
                  </p>
                </div>
                <Button
                  onClick={handleRunPipeline}
                  className="flex-shrink-0 bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-[#0F0F10] font-bold text-sm h-11 px-6 gap-2 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4" />
                  Run Now
                </Button>
              </div>
            )}

            {pipeline.status === "running" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-[#5E6AD2] animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm">Pipeline Running</p>
                    <p className="text-[#5E6AD2] text-xs">{PIPELINE_STEPS[Math.max(0, pipeline.currentStep)]?.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isDone = idx < pipeline.currentStep;
                    const isActive = idx === pipeline.currentStep;
                    // Live count badge per stage
                    const countBadge = (() => {
                      if (idx === 0) return pipeline.ideasGenerated > 0 ? `${pipeline.ideasGenerated}` : null;
                      if (idx === 1) return pipeline.packagesGenerated > 0 ? `${pipeline.packagesGenerated}/${pipeline.ideasApproved || pipeline.totalIdeas}` : null;
                      if (idx === 2) return pipeline.packagesGenerated > 0 ? `${pipeline.packagesGenerated}` : null;
                      if (idx === 3) return pipeline.packagesGenerated > 0 ? `${pipeline.packagesGenerated}` : null;
                      if (idx === 4) return pipeline.packagesInspected > 0 ? `${pipeline.packagesInspected}` : null;
                      return null;
                    })();
                    return (
                      <div key={step.key} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isActive ? "bg-[#5E6AD2]/10 border border-[#5E6AD2]/30" :
                        isDone ? "bg-emerald-500/10" : "bg-white/3"
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <Loader2 className={`w-4 h-4 ${step.color} animate-spin`} />
                        ) : (
                          <Icon className="w-4 h-4 text-white/20" />
                        )}
                        <span className={`text-[9px] text-center leading-tight ${
                          isActive ? "text-[#5E6AD2]" : isDone ? "text-emerald-400" : "text-white/20"
                        }`}>{step.label}</span>
                        {(isDone || isActive) && countBadge && (
                          <span className={`text-[9px] font-bold tabular-nums ${
                            isActive ? step.color : "text-emerald-400"
                          }`}>{countBadge}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pipeline.status === "done" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">Pipeline Complete</p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {[
                        { label: "Ideas", value: pipeline.ideasGenerated, color: "text-amber-400" },
                        { label: "Packages", value: pipeline.packagesGenerated, color: "text-[#5E6AD2]" },
                        { label: "Variants", value: pipeline.variantsGenerated, color: "text-[#7C3AED]" },
                        { label: "Ready", value: pipeline.readyForReview, color: "text-emerald-400" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-white/30 text-[10px]">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      onClick={() => navigate("/review")}
                      className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs h-8 gap-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Review
                    </Button>
                    <Button
                      onClick={() => setPipeline(p => ({ ...p, status: "idle" }))}
                      variant="ghost"
                      className="text-white/30 hover:text-white text-xs h-8 gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Run again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {pipeline.status === "error" && (
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Pipeline Failed</p>
                  <p className="text-red-400/70 text-xs mt-0.5">{pipeline.error}</p>
                </div>
                <Button
                  onClick={handleRunPipeline}
                  className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs h-8 flex-shrink-0"
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Ideas Generated", value: summary?.totalIdeas ?? 0, icon: Lightbulb, color: "text-amber-400", path: "/ideas" },
            { label: "Content Packages", value: summary?.totalPackages ?? 0, icon: FileText, color: "text-[#5E6AD2]", path: "/ideas" },
            { label: "Published", value: publishStats?.published ?? 0, icon: Send, color: "text-emerald-400", path: "/publishing" },
            { label: "Pending Review", value: pendingReview, icon: CheckCheck, color: "text-purple-400", path: "/review" },
          ].map(({ label, value, icon: Icon, color, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="bg-white/3 hover:bg-white/6 border border-white/10 hover:border-white/20 rounded-xl p-3 text-left transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${color}`} />
                <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-white/40 text-[10px] mt-0.5 leading-tight">{label}</p>
            </button>
          ))}
        </div>

        {/* ── LAST PIPELINE RUN ── */}
        {latestRun && (
          <Card className="bg-white/3 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  Last Pipeline Run
                </p>
                <Badge className={`text-[10px] border ${
                  (latestRun as any).status === "completed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  (latestRun as any).status === "running" ? "bg-[#5E6AD2]/20 text-[#5E6AD2] border-[#5E6AD2]/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                }`}>
                  {(latestRun as any).status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Ideas", value: (latestRun as any).ideasGenerated ?? 0 },
                  { label: "Packages", value: (latestRun as any).packagesGenerated ?? 0 },
                  { label: "Passed Inspection", value: (latestRun as any).packagesPassedInspection ?? (latestRun as any).passedInspection ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-white font-bold text-lg">{value}</p>
                    <p className="text-white/30 text-[10px]">{label}</p>
                  </div>
                ))}
              </div>
              {(latestRun as any).startedAt && (
                <p className="text-white/20 text-[10px] mt-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date((latestRun as any).startedAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Review Queue", desc: `${pendingReview} waiting`, icon: CheckCheck, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", path: "/review" },
            { label: "Brand Workspace", desc: "Edit DNA & prompts", icon: Brain, color: "text-[#5E6AD2]", bg: "bg-[#5E6AD2]/10 border-[#5E6AD2]/20", path: "/workspace" },
            { label: "Publishing Center", desc: "Manage publish jobs", icon: Rocket, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", path: "/publishing" },
            { label: "Forum Opportunities", desc: "Find & reply to threads", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", path: "/forums" },
          ].map(({ label, desc, icon: Icon, color, bg, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className={`${bg} border rounded-xl p-3 text-left hover:opacity-80 transition-opacity`}
            >
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{desc}</p>
            </button>
          ))}
        </div>

        {/* ── RECENT ACTIVITY ── */}
        {/* ── SYSTEM HEALTH PANEL ── */}
        {pipelineHealth && (
          <div className={`rounded-xl border p-4 ${
            pipelineHealth.overallStatus === "critical" ? "border-red-500/30 bg-red-500/5" :
            pipelineHealth.overallStatus === "warning" ? "border-amber-500/30 bg-amber-500/5" :
            "border-emerald-500/20 bg-emerald-500/5"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              {pipelineHealth.overallStatus === "critical" ? (
                <ShieldX className="w-4 h-4 text-red-400" />
              ) : pipelineHealth.overallStatus === "warning" ? (
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              )}
              <span className={`text-xs font-semibold ${
                pipelineHealth.overallStatus === "critical" ? "text-red-400" :
                pipelineHealth.overallStatus === "warning" ? "text-amber-400" :
                "text-emerald-400"
              }`}>
                Pipeline Health: {pipelineHealth.overallStatus === "healthy" ? "All Systems Operational" :
                  pipelineHealth.overallStatus === "warning" ? "Attention Required" : "Action Needed"}
              </span>
              <span className="ml-auto text-[10px] text-white/25">
                {pipelineHealth.scheduler.lastSeen
                  ? `Scheduler last seen ${new Date(pipelineHealth.scheduler.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "Scheduler: no heartbeat yet"}
              </span>
            </div>
            {/* Status row */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: "Scheduler", ok: pipelineHealth.scheduler.alive, okText: "Running", failText: "Stopped" },
                { label: "Queue", ok: pipelineHealth.queue.stale === 0, okText: `${pipelineHealth.queue.pending} pending`, failText: `${pipelineHealth.queue.stale} overdue` },
                { label: "Published Today", ok: true, okText: `${pipelineHealth.queue.publishedToday}`, failText: "0" },
                { label: "Failed Today", ok: pipelineHealth.queue.failedToday === 0, okText: "0", failText: `${pipelineHealth.queue.failedToday}` },
              ].map(({ label, ok, okText, failText }) => (
                <div key={label} className="bg-white/3 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-white/30 mb-1">{label}</p>
                  <p className={`text-xs font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}>{ok ? okText : failText}</p>
                </div>
              ))}
            </div>
            {/* Warnings and actions */}
            {pipelineHealth.warnings.length > 0 && (
              <div className="space-y-1.5">
                {pipelineHealth.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertCircle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-white/60">{w}</span>
                  </div>
                ))}
                {pipelineHealth.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 text-[#5E6AD2] mt-0.5 flex-shrink-0" />
                    <span className="text-[11px] text-[#5E6AD2]">{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(recentActivity as any[]).length > 0 && (
          <div className="space-y-2">
            <p className="text-white/30 text-xs font-medium uppercase tracking-wider">Recent Activity</p>
            {(recentActivity as any[]).slice(0, 5).map((event: any) => (
              <div key={event.id} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#5E6AD2] mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-xs truncate">{event.description}</p>
                  <p className="text-white/25 text-[10px] mt-0.5">
                    {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
