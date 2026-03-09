import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Rocket, CheckCircle, Clock, XCircle, RefreshCw, ExternalLink, Globe, Linkedin, Instagram, MessageSquare, Send, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0077B5", instagram: "#E1306C", webflow: "#4353FF",
  wechat: "#07C160", facebook: "#1877F2", tiktok: "#000000",
  blog: "#F59E0B", medium: "#000000", reddit: "#FF4500",
  quora: "#B92B27", xiaohongshu: "#FF2442",
};

const PLATFORM_ICONS: Record<string, any> = {
  linkedin: Linkedin, instagram: Instagram, webflow: Globe,
  wechat: MessageSquare, blog: Globe, facebook: Globe,
  tiktok: Globe, medium: Globe, reddit: Globe, quora: Globe, xiaohongshu: Globe,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock size={12} className="text-yellow-400" />,
  scheduled: <Clock size={12} className="text-blue-400" />,
  publishing: <RefreshCw size={12} className="text-primary animate-spin" />,
  published: <CheckCircle size={12} className="text-green-400" />,
  failed: <XCircle size={12} className="text-red-400" />,
};

function JobCard({ job, onMarkPublished, onMarkFailed, onRetry, onPublishToWebflow, isPublishing }: {
  job: any;
  onMarkPublished: () => void;
  onMarkFailed: () => void;
  onRetry: () => void;
  onPublishToWebflow: () => void;
  isPublishing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = PLATFORM_ICONS[job.platform] || Globe;
  const color = PLATFORM_COLORS[job.platform] || "#3AC1EC";

  return (
    <div className="rounded-lg border border-border hover:border-primary/20 transition-colors bg-card/50">
      <div className="flex items-center gap-3 p-3">
        {/* Platform indicator */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
          <Icon size={14} style={{ color }} />
        </div>

        {/* Content info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground capitalize">{job.platform}</span>
            <div className="flex items-center gap-1">
              {STATUS_ICONS[job.publishStatus] || <Clock size={12} />}
              <span className={`text-[10px] capitalize status-${job.publishStatus}`}>{job.publishStatus}</span>
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{job.actionType?.replace("_", " ")}</Badge>
          </div>
          {job.contentTitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.contentTitle}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
            Created {new Date(job.createdAt).toLocaleDateString()}
            {job.scheduledFor && ` · Scheduled ${new Date(job.scheduledFor).toLocaleString()}`}
            {job.publishedAt && ` · Published ${new Date(job.publishedAt).toLocaleString()}`}
          </p>
          {job.errorLog && (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle size={10} className="text-red-400 flex-shrink-0" />
              <span className="text-[10px] text-red-400 truncate">{job.errorLog}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {job.variantBody && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>
          )}
          {(job.publishStatus === "queued" || job.publishStatus === "scheduled") && (
            <>
              {job.platform === "webflow" && (
                <Button size="sm" variant="ghost" className="h-7 text-[10px] text-[#4353FF] px-2 font-medium" onClick={onPublishToWebflow} disabled={isPublishing}>
                  {isPublishing ? <RefreshCw size={10} className="mr-1 animate-spin" /> : <Send size={10} className="mr-1" />}
                  {isPublishing ? "Publishing..." : "Push to Webflow"}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-green-400 px-2" onClick={onMarkPublished}>
                <CheckCircle size={10} className="mr-1" /> Mark Published
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-red-400 px-2" onClick={onMarkFailed}>
                <XCircle size={10} className="mr-1" /> Fail
              </Button>
            </>
          )}
          {job.publishStatus === "failed" && (
            <Button size="sm" variant="ghost" className="h-7 text-[10px] text-primary px-2" onClick={onRetry}>
              <RefreshCw size={10} className="mr-1" /> Retry
            </Button>
          )}
          {job.publishStatus === "published" && (
            <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Published</Badge>
          )}
        </div>
      </div>

      {/* Expanded variant body preview */}
      {expanded && job.variantBody && (
        <div className="px-3 pb-3">
          <div className="bg-background/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap line-clamp-6">{job.variantBody}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublishingCenter() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [filterStatus, setFilterStatus] = useState("all");
  const [publishingJobId, setPublishingJobId] = useState<number | null>(null);
  const [webflowConfirmJob, setWebflowConfirmJob] = useState<any | null>(null);
  const utils = trpc.useUtils();

  const { data: jobs = [], isLoading, refetch } = trpc.publishing.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId, refetchInterval: 10000 }
  );
  const { data: stats } = trpc.publishing.stats.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: integration } = trpc.integrations.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const webflowIntegration = (integration || []).find((i: any) => i.platform === "webflow" && i.status === "connected");

  const markPublished = trpc.publishing.markPublished.useMutation({ onSuccess: () => { refetch(); toast.success("Marked as published"); } });
  const markFailed = trpc.publishing.markFailed.useMutation({ onSuccess: () => { refetch(); toast.error("Marked as failed"); } });
  const retry = trpc.publishing.retry.useMutation({ onSuccess: () => { refetch(); toast.success("Job retried"); } });
  const publishToWebflow = trpc.publishing.publishToWebflow.useMutation({
    onSuccess: (data) => {
      refetch();
      toast.success(`Published to Webflow! Item ID: ${data.webflowItemId || "created"}`);
      setPublishingJobId(null);
      setWebflowConfirmJob(null);
    },
    onError: (e) => {
      toast.error(`Webflow publish failed: ${e.message}`);
      setPublishingJobId(null);
      setWebflowConfirmJob(null);
    },
  });

  const handlePublishToWebflow = (job: any) => {
    if (!webflowIntegration) {
      toast.error("Webflow not connected. Configure it in Settings → Integrations.");
      return;
    }
    setWebflowConfirmJob(job);
  };

  const confirmPublishToWebflow = () => {
    if (!webflowConfirmJob) return;
    setPublishingJobId(webflowConfirmJob.id);
    publishToWebflow.mutate({ jobId: webflowConfirmJob.id, brandId: activeBrandId! });
  };

  const filtered = filterStatus === "all" ? jobs : jobs.filter((j: any) => j.publishStatus === filterStatus);

  const statCards = [
    { label: "Total Jobs", value: stats?.total || 0, color: "#3AC1EC" },
    { label: "Published", value: stats?.published || 0, color: "#22c55e" },
    { label: "Queued", value: stats?.queued || 0, color: "#eab308" },
    { label: "Failed", value: stats?.failed || 0, color: "#ef4444" },
  ];

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Publishing Center</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeBrand?.name} · Publish jobs</p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-9 text-xs flex-shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "queued", "scheduled", "publishing", "published", "failed"].map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All Status" : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Webflow connection banner */}
        {!webflowIntegration && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300 flex-1">Webflow is not connected. Connect it in <a href="/settings" className="underline text-amber-400">Settings → Integrations</a> to enable one-click publishing.</p>
          </div>
        )}
        {webflowIntegration && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-[#4353FF]/30 bg-[#4353FF]/5">
            <Globe size={14} className="text-[#4353FF] flex-shrink-0" />
            <p className="text-xs text-[#4353FF]/80 flex-1">Webflow connected — <span className="font-medium text-[#4353FF]">{webflowIntegration.accountName || "your site"}</span>. Click "Push to Webflow" on any queued Webflow job to publish.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map(s => (
            <Card key={s.label} className="border-border bg-card">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jobs list */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Publish Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Rocket size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No publish jobs yet.</p>
                <p className="text-xs mt-1">Approve content in the Review Queue to create publish jobs.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((job: any) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onMarkPublished={() => markPublished.mutate({ jobId: job.id })}
                    onMarkFailed={() => markFailed.mutate({ jobId: job.id })}
                    onRetry={() => retry.mutate({ jobId: job.id })}
                    onPublishToWebflow={() => handlePublishToWebflow(job)}
                    isPublishing={publishingJobId === job.id}
                  />
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
              {Object.entries(PLATFORM_COLORS).slice(0, 8).map(([platform, color]) => {
                const conn = (integration || []).find((i: any) => i.platform === platform);
                const isConnected = conn?.status === "connected";
                return (
                  <div key={platform} className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${isConnected ? "border-green-500/30 bg-green-500/5" : "border-border"}`}>
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs font-medium capitalize flex-1">{platform}</span>
                    {isConnected ? (
                      <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-400 border-green-500/20">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        <a href="/settings" className="hover:text-primary">Setup</a>
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Configure API credentials in <a href="/settings" className="text-primary hover:underline">Settings → Integrations</a></p>
          </CardContent>
        </Card>
      </div>

      {/* Webflow publish confirmation dialog */}
      <Dialog open={!!webflowConfirmJob} onOpenChange={() => setWebflowConfirmJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to Webflow</DialogTitle>
            <DialogDescription>
              This will create a new CMS item in your Webflow collection using the mapped fields. The content will be published as a draft — you'll need to publish the site in Webflow to make it live.
            </DialogDescription>
          </DialogHeader>
          {webflowConfirmJob && (
            <div className="py-2 space-y-2">
              <div className="rounded-lg border border-border bg-card/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Content</p>
                <p className="text-sm font-medium text-foreground">{webflowConfirmJob.contentTitle || "Untitled"}</p>
              </div>
              {!webflowIntegration && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-xs text-red-400">Webflow is not connected. Go to Settings → Integrations first.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebflowConfirmJob(null)}>Cancel</Button>
            <Button
              onClick={confirmPublishToWebflow}
              disabled={!webflowIntegration || publishToWebflow.isPending}
              style={{ background: "linear-gradient(135deg, #4353FF, #3AC1EC)" }}
            >
              {publishToWebflow.isPending ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
              {publishToWebflow.isPending ? "Publishing..." : "Confirm & Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
