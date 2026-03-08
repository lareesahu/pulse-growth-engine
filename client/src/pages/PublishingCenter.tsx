import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, CheckCircle, Clock, XCircle, RefreshCw, ExternalLink, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0077B5", instagram: "#E1306C", webflow: "#4353FF",
  wechat: "#07C160", facebook: "#1877F2",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock size={12} className="text-yellow-400" />,
  scheduled: <Clock size={12} className="text-blue-400" />,
  publishing: <RefreshCw size={12} className="text-primary animate-spin" />,
  published: <CheckCircle size={12} className="text-green-400" />,
  failed: <XCircle size={12} className="text-red-400" />,
};

export default function PublishingCenter() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [filterStatus, setFilterStatus] = useState("all");
  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading, refetch } = trpc.publishing.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId, refetchInterval: 10000 }
  );
  const { data: stats } = trpc.publishing.stats.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const markPublished = trpc.publishing.markPublished.useMutation({ onSuccess: () => { refetch(); toast.success("Marked as published"); } });
  const markFailed = trpc.publishing.markFailed.useMutation({ onSuccess: () => { refetch(); toast.error("Marked as failed"); } });
  const retry = trpc.publishing.retry.useMutation({ onSuccess: () => { refetch(); toast.success("Job retried"); } });

  const filtered = filterStatus === "all" ? jobs : jobs.filter(j => j.publishStatus === filterStatus);

  const statCards = [
    { label: "Total Jobs", value: stats?.total || 0, color: "#3AC1EC" },
    { label: "Published", value: stats?.published || 0, color: "#22c55e" },
    { label: "Queued", value: stats?.queued || 0, color: "#eab308" },
    { label: "Failed", value: stats?.failed || 0, color: "#ef4444" },
  ];

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Publishing Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{activeBrand?.name} · Manage and monitor all publish jobs</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "queued", "scheduled", "publishing", "published", "failed"].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Status" : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {statCards.map(s => (
            <Card key={s.label} className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jobs table */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Publish Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Rocket size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No publish jobs yet.</p>
                <p className="text-xs mt-1">Approve content variants and queue them for publishing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(job => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/20 transition-colors">
                    {/* Platform dot */}
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PLATFORM_COLORS[job.platform] || "#3AC1EC" }} />

                    {/* Platform + status */}
                    <div className="flex items-center gap-2 w-32 flex-shrink-0">
                      <span className="text-xs font-medium capitalize">{job.platform}</span>
                      <div className="flex items-center gap-1">
                        {STATUS_ICONS[job.publishStatus] || <Clock size={12} />}
                        <span className={`text-[10px] capitalize status-${job.publishStatus}`}>{job.publishStatus}</span>
                      </div>
                    </div>

                    {/* Action type */}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{job.actionType}</Badge>

                    {/* Dates */}
                    <div className="flex-1 text-xs text-muted-foreground">
                      Created {new Date(job.createdAt).toLocaleDateString()}
                      {job.scheduledFor && ` · Scheduled ${new Date(job.scheduledFor).toLocaleString()}`}
                      {job.publishedAt && ` · Published ${new Date(job.publishedAt).toLocaleString()}`}
                    </div>

                    {/* Error */}
                    {job.errorLog && <span className="text-[10px] text-red-400 max-w-[200px] truncate">{job.errorLog}</span>}

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      {(job.publishStatus === "queued" || job.publishStatus === "scheduled") && (
                        <>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-400 px-2" onClick={() => markPublished.mutate({ jobId: job.id })}>
                            <CheckCircle size={10} className="mr-1" /> Mark Published
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400 px-2" onClick={() => markFailed.mutate({ jobId: job.id })}>
                            <XCircle size={10} className="mr-1" /> Fail
                          </Button>
                        </>
                      )}
                      {job.publishStatus === "failed" && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary px-2" onClick={() => retry.mutate({ jobId: job.id })}>
                          <RefreshCw size={10} className="mr-1" /> Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Platform connection status */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Platform Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
                <div key={platform} className="flex items-center gap-2 p-3 rounded-lg border border-border">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-medium capitalize flex-1">{platform}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                    <a href="/settings" className="hover:text-primary">Configure</a>
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Configure API credentials in <a href="/settings" className="text-primary hover:underline">Settings → Integrations</a></p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
