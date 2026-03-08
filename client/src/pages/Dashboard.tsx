import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Brain, Clock, Rocket, Sparkles, TrendingUp, Zap,
  ArrowRight, CheckCircle2, AlertCircle, Plus, RefreshCw,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { activeBrand, activeBrandId, setActiveBrandId, brands } = useBrand();
  const [generatingIdeas, setGeneratingIdeas] = useState(false);

  const { data: ideaStats, isLoading: loadingIdeas } = trpc.idea.stats.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: publishStats, isLoading: loadingPublish } = trpc.publishing.stats.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: activityLog = [], isLoading: loadingActivity } = trpc.activity.list.useQuery(
    { brandId: activeBrandId!, limit: 10 },
    { enabled: !!activeBrandId }
  );
  const { data: analyticsSummary } = trpc.analytics.summary.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const generateBatch = trpc.idea.generateBatch.useMutation();
  const utils = trpc.useUtils();

  const handleQuickGenerate = async () => {
    if (!activeBrandId) return;
    setGeneratingIdeas(true);
    try {
      const result = await generateBatch.mutateAsync({ brandId: activeBrandId, count: 10 });
      toast.success(`Caelum generated ${result.count} new ideas!`);
      utils.idea.stats.invalidate({ brandId: activeBrandId });
      utils.activity.list.invalidate({ brandId: activeBrandId });
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGeneratingIdeas(false);
    }
  };

  if (!activeBrand && brands.length === 0) {
    return (
      <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
        <div className="flex flex-col items-center justify-center h-full gap-6 text-center p-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <Sparkles size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">Welcome to Pulse Content Engine</h2>
            <p className="text-muted-foreground text-sm max-w-sm">Create your first brand workspace to start generating content with Caelum Liu, your AI Growth Officer.</p>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeBrand?.name} · Caelum Liu is active
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 ml-2 mb-0.5" />
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleQuickGenerate} disabled={generatingIdeas}>
              {generatingIdeas ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Brain size={14} className="mr-2" />}
              {generatingIdeas ? "Generating..." : "Quick Generate 10 Ideas"}
            </Button>
            <Button asChild size="sm" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              <Link href="/ideas"><Plus size={14} className="mr-2" /> New Idea</Link>
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingIdeas ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatCard label="Total Ideas" value={ideaStats?.total || 0} icon={<Brain size={18} />} color="#3AC1EC" sub={`${ideaStats?.approved || 0} approved`} />
              <StatCard label="Pending Review" value={ideaStats?.proposed || 0} icon={<Clock size={18} />} color="#56C4C4" sub="In ideas board" />
              <StatCard label="Published" value={publishStats?.published || 0} icon={<CheckCircle2 size={18} />} color="#2163AF" sub={`${publishStats?.publishedToday || 0} today`} />
              <StatCard label="In Queue" value={(publishStats?.queued || 0) + (publishStats?.scheduled || 0)} icon={<Rocket size={18} />} color="#3AC1EC" sub={`${publishStats?.scheduled || 0} scheduled`} />
            </>
          )}
        </div>

        {/* Content pipeline + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline overview */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Content Pipeline</CardTitle>
                  <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                    <Link href="/ideas">View all <ArrowRight size={12} className="ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Proposed", count: ideaStats?.proposed || 0, color: "#3AC1EC", href: "/ideas" },
                  { label: "In Review", count: ideaStats?.in_review || 0, color: "#56C4C4", href: "/ideas" },
                  { label: "Approved", count: ideaStats?.approved || 0, color: "#2163AF", href: "/ideas" },
                  { label: "Published", count: publishStats?.published || 0, color: "#22c55e", href: "/publishing" },
                ].map(stage => (
                  <Link key={stage.label} href={stage.href}>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/50 rounded-md px-2 py-1.5 transition-colors">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                      <span className="text-sm text-muted-foreground flex-1">{stage.label}</span>
                      <span className="text-sm font-semibold text-foreground">{stage.count}</span>
                      <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ((stage.count || 0) / Math.max(1, ideaStats?.total || 1)) * 100)}%`, background: stage.color }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  { label: "Generate Ideas Batch", icon: <Brain size={16} />, href: "/ideas", color: "#3AC1EC" },
                  { label: "Brand Workspace", icon: <Sparkles size={16} />, href: "/workspace", color: "#56C4C4" },
                  { label: "Publishing Queue", icon: <Rocket size={16} />, href: "/publishing", color: "#2163AF" },
                  { label: "Analytics", icon: <BarChart3 size={16} />, href: "/analytics", color: "#291C53" },
                ].map(action => (
                  <Link key={action.label} href={action.href}>
                    <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${action.color}20`, color: action.color }}>
                        {action.icon}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Activity feed */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Activity Feed</CardTitle>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingActivity ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)
              ) : activityLog.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">No activity yet. Start by generating ideas.</div>
              ) : (
                activityLog.map(event => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "oklch(73% 0.17 210 / 0.15)" }}>
                      <Zap size={10} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-tight truncate">{event.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
