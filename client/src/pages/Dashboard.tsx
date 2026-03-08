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
  Loader2, CheckCircle2, AlertCircle, Play, Plus
} from "lucide-react";
import { Link } from "wouter";

const PIPELINE_STEPS = [
  { key: "ideas", label: "Generating Ideas", icon: Lightbulb, color: "text-amber-400" },
  { key: "packages", label: "Building Content", icon: FileText, color: "text-[#3AC1EC]" },
  { key: "variants", label: "Crafting Variants", icon: Globe, color: "text-[#56C4C4]" },
  { key: "images", label: "Generating Images", icon: Sparkles, color: "text-purple-400" },
  { key: "inspection", label: "AI Inspection", icon: Brain, color: "text-[#2163AF]" },
  { key: "done", label: "Ready to Review", icon: CheckCheck, color: "text-emerald-400" },
];

type PipelineStatus = "idle" | "running" | "done" | "error";

interface PipelineState {
  status: PipelineStatus;
  currentStep: number;
  stepLabel: string;
  ideasGenerated: number;
  packagesGenerated: number;
  variantsGenerated: number;
  readyForReview: number;
  error?: string;
}

export default function Dashboard() {
  const { activeBrand, activeBrandId, setActiveBrandId, brands } = useBrand();
  const [, navigate] = useLocation();
  const [pipeline, setPipeline] = useState<PipelineState>({
    status: "idle", currentStep: -1, stepLabel: "",
    ideasGenerated: 0, packagesGenerated: 0, variantsGenerated: 0, readyForReview: 0,
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

  const runPipeline = trpc.pipeline.run.useMutation({
    onMutate: () => {
      setPipeline(p => ({ ...p, status: "running", currentStep: 0, stepLabel: "Generating Ideas..." }));
    },
    onSuccess: (data: any) => {
      setPipeline(p => ({
        ...p,
        status: "done",
        currentStep: 5,
        stepLabel: "Ready to Review",
        ideasGenerated: data.ideasGenerated ?? 0,
        packagesGenerated: data.packagesGenerated ?? 0,
        variantsGenerated: data.variantsGenerated ?? 0,
        readyForReview: data.readyForReview ?? 0,
      }));
      refetchSummary();
      refetchRun();
      toast.success(`Pipeline complete — ${data.readyForReview ?? 0} pieces ready for review`);
    },
    onError: (err: any) => {
      setPipeline(p => ({ ...p, status: "error", error: err.message }));
      toast.error("Pipeline failed: " + err.message);
    },
  });

  useEffect(() => {
    if (pipeline.status !== "running") return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < PIPELINE_STEPS.length - 2) {
        i++;
        setPipeline(p => ({ ...p, currentStep: i, stepLabel: PIPELINE_STEPS[i].label }));
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [pipeline.status]);

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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome to Pulse Content Engine</h2>
            <p className="text-white/50 text-sm max-w-sm">Create your first brand workspace to start generating content with Caelum Liu, your AI Growth Officer.</p>
          </div>
          <Button asChild style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
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
          pipeline.status === "running" ? "border-[#3AC1EC]/40 bg-[#3AC1EC]/5" :
          pipeline.status === "done" ? "border-emerald-500/40 bg-emerald-500/5" :
          pipeline.status === "error" ? "border-red-500/40 bg-red-500/5" :
          "border-white/10 bg-white/3 hover:border-[#3AC1EC]/30"
        }`}>
          <CardContent className="p-5">
            {pipeline.status === "idle" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <h2 className="text-white font-bold text-base flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#3AC1EC]" />
                    Run Content Pipeline
                  </h2>
                  <p className="text-white/40 text-sm mt-1">
                    Caelum generates 10 ideas → builds all variants → inspects quality → delivers to your review queue. Zero clicks needed after this.
                  </p>
                </div>
                <Button
                  onClick={handleRunPipeline}
                  className="flex-shrink-0 bg-[#3AC1EC] hover:bg-[#3AC1EC]/90 text-[#0A1931] font-bold text-sm h-11 px-6 gap-2 w-full sm:w-auto"
                >
                  <Play className="w-4 h-4" />
                  Run Now
                </Button>
              </div>
            )}

            {pipeline.status === "running" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-[#3AC1EC] animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm">Pipeline Running</p>
                    <p className="text-[#3AC1EC] text-xs">{PIPELINE_STEPS[Math.max(0, pipeline.currentStep)]?.label}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PIPELINE_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isDone = idx < pipeline.currentStep;
                    const isActive = idx === pipeline.currentStep;
                    return (
                      <div key={step.key} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isActive ? "bg-[#3AC1EC]/10 border border-[#3AC1EC]/30" :
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
                          isActive ? "text-[#3AC1EC]" : isDone ? "text-emerald-400" : "text-white/20"
                        }`}>{step.label}</span>
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
                        { label: "Packages", value: pipeline.packagesGenerated, color: "text-[#3AC1EC]" },
                        { label: "Variants", value: pipeline.variantsGenerated, color: "text-[#56C4C4]" },
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
            { label: "Content Packages", value: summary?.totalPackages ?? 0, icon: FileText, color: "text-[#3AC1EC]", path: "/ideas" },
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
                  (latestRun as any).status === "running" ? "bg-[#3AC1EC]/20 text-[#3AC1EC] border-[#3AC1EC]/30" :
                  "bg-red-500/20 text-red-400 border-red-500/30"
                }`}>
                  {(latestRun as any).status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Ideas", value: (latestRun as any).ideasGenerated ?? 0 },
                  { label: "Packages", value: (latestRun as any).packagesGenerated ?? 0 },
                  { label: "Passed Inspection", value: (latestRun as any).passedInspection ?? 0 },
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
            { label: "Brand Workspace", desc: "Edit DNA & prompts", icon: Brain, color: "text-[#3AC1EC]", bg: "bg-[#3AC1EC]/10 border-[#3AC1EC]/20", path: "/workspace" },
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
        {(recentActivity as any[]).length > 0 && (
          <div className="space-y-2">
            <p className="text-white/30 text-xs font-medium uppercase tracking-wider">Recent Activity</p>
            {(recentActivity as any[]).slice(0, 5).map((event: any) => (
              <div key={event.id} className="flex items-start gap-2.5 py-2 border-b border-white/5 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3AC1EC] mt-1.5 flex-shrink-0" />
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
