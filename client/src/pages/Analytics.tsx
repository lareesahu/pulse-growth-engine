import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Brain, TrendingUp, Lightbulb, ArrowRight, Zap, Target, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const COLORS = ["#5E6AD2", "#7C3AED", "#8B5CF6", "#A78BFA", "#C4B5FD"];

export default function Analytics() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [loadingRecs, setLoadingRecs] = useState(false);

  const { data: summary, isLoading } = trpc.analytics.summary.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const aiRecs = trpc.analytics.aiRecommendations.useMutation();

  const handleGetRecommendations = async () => {
    if (!activeBrandId) return;
    setLoadingRecs(true);
    try {
      await aiRecs.mutateAsync({ brandId: activeBrandId });
      toast.success("AI recommendations generated!");
    } catch (e: any) {
      toast.error(e.message || "Failed to get recommendations");
    } finally {
      setLoadingRecs(false);
    }
  };

  const statCards = [
    { label: "Total Ideas", value: summary?.totalIdeas || 0, icon: <Lightbulb size={16} />, color: "#5E6AD2" },
    { label: "Approved Ideas", value: summary?.approvedIdeas || 0, icon: <Target size={16} />, color: "#7C3AED" },
    { label: "Content Packages", value: summary?.totalPackages || 0, icon: <FileText size={16} />, color: "#5E6AD2" },
    { label: "Published", value: summary?.totalPublished || 0, icon: <Zap size={16} />, color: "#22c55e" },
  ];

  const funnelData = summary?.ideaStatusBreakdown
    ? Object.entries(summary.ideaStatusBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  const pillarData: { name: string; value: number }[] = summary?.pillarBreakdown
    ? Object.entries(summary.pillarBreakdown)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
    : [];

  const platformData = summary?.platformBreakdown
    ? Object.entries(summary.platformBreakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">Analytics</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{activeBrand?.name} · Content performance</p>
            </div>
          </div>
          <Button onClick={handleGetRecommendations} disabled={loadingRecs} className="w-full min-h-[44px]" style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>
            <Brain size={14} className="mr-2" />
            {loadingRecs ? "Analysing..." : "Get AI Recommendations from Caelum"}
          </Button>
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map(s => (
              <Card key={s.label} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}<span className="text-xs text-muted-foreground">{s.label}</span></div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Ideas by Funnel */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-sm">Ideas by Funnel Stage</CardTitle></CardHeader>
            <CardContent>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={funnelData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {funnelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0F0F10", border: "1px solid #5E6AD2", borderRadius: "6px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No data yet</div>}
            </CardContent>
          </Card>

          {/* Ideas by Pillar */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-sm">Ideas by Content Pillar</CardTitle></CardHeader>
            <CardContent>
              {pillarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pillarData} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#7C3AED" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} stroke="#7C3AED" />
                    <Tooltip contentStyle={{ background: "#0F0F10", border: "1px solid #5E6AD2", borderRadius: "6px", fontSize: "11px" }} />
                    <Bar dataKey="value" fill="#5E6AD2" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No data yet</div>}
            </CardContent>
          </Card>

          {/* Jobs by Platform */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-sm">Published by Platform</CardTitle></CardHeader>
            <CardContent>
              {platformData.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={platformData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#7C3AED" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#7C3AED" />
                    <Tooltip contentStyle={{ background: "#0F0F10", border: "1px solid #5E6AD2", borderRadius: "6px", fontSize: "11px" }} />
                    <Bar dataKey="value" fill="#5E6AD2" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No data yet</div>}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations */}
        {aiRecs.data && (
          <Card className="border-border bg-card border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain size={16} className="text-primary" />
                <CardTitle className="text-sm">Caelum's Recommendations</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(aiRecs.data as any).recommendations?.map((rec: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg border border-border bg-background/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rec.priority === "high" ? "border-red-500/50 text-red-400" : rec.priority === "medium" ? "border-yellow-500/50 text-yellow-400" : "border-green-500/50 text-green-400"}`}>
                        {rec.priority}
                      </Badge>
                      <span className="text-xs font-medium text-foreground">{rec.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                    {rec.action && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-primary">
                        <ArrowRight size={10} /> {rec.action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent activity summary - inline */}
        {activeBrandId && <InlineActivityPanel brandId={activeBrandId} />}
      </div>
    </AppLayout>
  );
}

function InlineActivityPanel({ brandId }: { brandId: number }) {
  const { data: events = [] } = trpc.activity.list.useQuery({ brandId, limit: 10 });
  if (events.length === 0) return null;
  return (
    <Card className="border-border bg-card">
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp size={14} />Recent Activity</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground w-28 flex-shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{a.action}</Badge>
              <span className="text-foreground/80 truncate">{a.description}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
