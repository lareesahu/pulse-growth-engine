import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  CheckCircle2, XCircle, Eye, Zap, Brain, Fingerprint,
  ShieldCheck, Target, Sparkles, Clock, RefreshCw,
  ChevronDown, ChevronUp, Linkedin, Instagram, Globe, MessageSquare,
  AlertTriangle, CheckCheck, Inbox
} from "lucide-react";

const SCORE_DIMS = [
  { key: "humanisationScore", label: "Human", icon: Brain, color: "text-emerald-400" },
  { key: "authenticityScore", label: "Authentic", icon: Fingerprint, color: "text-[#3AC1EC]" },
  { key: "accuracyScore", label: "Accurate", icon: ShieldCheck, color: "text-[#56C4C4]" },
  { key: "platformFitScore", label: "Platform", icon: Target, color: "text-[#2163AF]" },
  { key: "originalityScore", label: "Original", icon: Sparkles, color: "text-purple-400" },
];

const PLATFORM_ICONS: Record<string, any> = {
  linkedin: Linkedin,
  instagram: Instagram,
  webflow: Globe,
  wechat: MessageSquare,
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  const pct = (score / 10) * 100;
  const bg = score >= 8 ? "bg-emerald-500" : score >= 6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-5 text-right ${color}`}>{score}</span>
    </div>
  );
}

function VitalityBadge({ score }: { score: number }) {
  const tier = score >= 80 ? { label: "🔥 Viral", bg: "bg-red-500/20 text-red-400 border-red-500/30" }
    : score >= 65 ? { label: "⚡ High", bg: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
    : score >= 50 ? { label: "✦ Good", bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" }
    : { label: "↗ Moderate", bg: "bg-white/10 text-white/50 border-white/10" };
  return (
    <Badge className={`text-xs border ${tier.bg}`}>
      {tier.label} · {score}/100
    </Badge>
  );
}

function ContentCard({ item, onApprove, onReject }: { item: any; onApprove: () => void; onReject: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("linkedin");
  const [, navigate] = useLocation();

  const report = item.inspectionReports?.[0];
  const pkg = item.contentPackage;
  const variants = item.variants || [];

  const hasIssues = report?.issues?.length > 0;
  const overallScore = report?.overallScore ?? 0;

  return (
    <Card className={`border transition-all ${overallScore >= 70 ? "border-emerald-500/20" : overallScore >= 50 ? "border-amber-500/20" : "border-red-500/20"} bg-white/3 hover:bg-white/5`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm leading-tight">{pkg?.title || "Untitled Content"}</h3>
              {report?.vitalityScore && <VitalityBadge score={report.vitalityScore} />}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className="text-[10px] bg-[#2163AF]/20 text-[#3AC1EC] border-[#2163AF]/30">
                {pkg?.pillar || "Content"}
              </Badge>
              {variants.map((v: any) => {
                const Icon = PLATFORM_ICONS[v.platform] || Globe;
                return (
                  <span key={v.id} className="text-white/30">
                    <Icon className="w-3 h-3 inline" />
                  </span>
                );
              })}
              {report?.attemptNumber > 1 && (
                <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <RefreshCw className="w-2.5 h-2.5 mr-1" />
                  Attempt {report.attemptNumber}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Score Dimensions */}
        {report && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 p-3 bg-white/5 rounded-lg">
            {SCORE_DIMS.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className={`w-3 h-3 ${color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-white/40 text-[10px]">{label}</span>
                  </div>
                  <ScoreBar score={(report as any)[key] ?? 0} color={color} />
                </div>
              </div>
            ))}
            <div className="col-span-2 mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-white/40 text-[10px]">Overall Quality</span>
              <span className={`text-sm font-bold ${overallScore >= 70 ? "text-emerald-400" : overallScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {overallScore}/100
              </span>
            </div>
          </div>
        )}

        {/* Issues */}
        {hasIssues && (
          <div className="mb-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 text-[10px] font-medium">{report.issues.length} issue{report.issues.length > 1 ? "s" : ""} noted (auto-fixed where possible)</span>
            </div>
            {report.issues.slice(0, 2).map((issue: any, i: number) => (
              <p key={i} className="text-white/40 text-[10px] ml-4">• {issue.description}</p>
            ))}
            {report.issues.length > 2 && (
              <p className="text-white/30 text-[10px] ml-4">+{report.issues.length - 2} more</p>
            )}
          </div>
        )}

        {/* Expandable Content Preview */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-white/40 text-xs py-1 hover:text-white/60 transition-colors"
        >
          <span>Preview content</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && variants.length > 0 && (
          <div className="mt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/5 border border-white/10 h-7 w-full overflow-x-auto flex-nowrap">
                {variants.map((v: any) => {
                  const Icon = PLATFORM_ICONS[v.platform] || Globe;
                  return (
                    <TabsTrigger key={v.id} value={v.platform} className="text-[10px] h-6 flex items-center gap-1 flex-shrink-0">
                      <Icon className="w-2.5 h-2.5" />
                      {v.platform}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {variants.map((v: any) => (
                <TabsContent key={v.id} value={v.platform} className="mt-2">
                  <div className="bg-white/5 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">
                      {v.body || v.caption || v.headline || "No content generated yet"}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
          <Button
            onClick={onApprove}
            className="flex-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs h-9"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Approve & Queue
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            className="flex-1 bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 text-xs h-9"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Reject
          </Button>
          <Button
            onClick={() => navigate(`/content/${pkg?.ideaId}`)}
            variant="ghost"
            className="text-white/40 hover:text-white text-xs h-9 w-9 p-0"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReviewQueue() {
  const { activeBrandId } = useBrand();
  const [, navigate] = useLocation();

  const { data: queue = [], isLoading, refetch } = trpc.pipeline.getReviewQueue.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId, refetchInterval: 30000 }
  );

  const approveForPublish = trpc.pipeline.approveForPublishing.useMutation({
    onSuccess: () => { refetch(); toast.success("Content approved and queued for publishing"); },
    onError: () => toast.error("Failed to approve content"),
  });

  const updatePackage = trpc.content.updatePackage.useMutation({
    onSuccess: () => { refetch(); toast.success("Content rejected"); },
  });

  const pendingItems = queue.filter((item: any) => item.status === "review_ready");
  const approvedItems = queue.filter((item: any) => item.status === "approved");

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <CheckCheck className="w-6 h-6 text-[#3AC1EC]" />
              Review Queue
            </h1>
            <p className="text-sm text-white/50 mt-0.5">
              AI-inspected content ready for your final approval before publishing.
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="ghost"
            className="text-white/40 hover:text-white h-9 w-9 p-0 flex-shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Awaiting Review", value: pendingItems.length, color: "text-amber-400" },
            { label: "Approved Today", value: approvedItems.length, color: "text-emerald-400" },
            { label: "Total in Queue", value: queue.length, color: "text-[#3AC1EC]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-white/40 text-[10px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-white/5 rounded-xl animate-pulse border border-white/10" />
            ))}
          </div>
        ) : pendingItems.length === 0 ? (
          <Card className="bg-white/3 border-white/10">
            <CardContent className="py-16 text-center">
              <Inbox className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-white/40 text-base font-medium">Queue is empty</p>
              <p className="text-white/25 text-sm mt-1">
                Run the pipeline from the Dashboard to generate and inspect new content.
              </p>
              <Button
                onClick={() => navigate("/")}
                className="mt-4 bg-[#3AC1EC]/20 text-[#3AC1EC] border border-[#3AC1EC]/30 hover:bg-[#3AC1EC]/30 text-sm"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs">{pendingItems.length} item{pendingItems.length !== 1 ? "s" : ""} awaiting your decision</p>
              <Button
                onClick={() => {
                  pendingItems.forEach((item: any) => {
                    if (item.id) {
                      approveForPublish.mutate({ contentPackageId: item.contentPackage.id });
                    }
                  });
                }}
                className="text-xs h-8 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                disabled={approveForPublish.isPending}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Approve All
              </Button>
            </div>

            {pendingItems.map((item: any) => (
              <ContentCard
                key={item.id}
                item={item}
                onApprove={() => {
                  if (item.id) {
                    approveForPublish.mutate({ contentPackageId: item.contentPackage.id });
                  }
                }}
                onReject={() => {
                  if (item.id) {
                    updatePackage.mutate({ id: item.contentPackage.id, status: "archived" });
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Recently Approved */}
        {approvedItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-white/30 text-xs font-medium uppercase tracking-wider">Recently Approved</p>
            {approvedItems.slice(0, 3).map((item: any) => (
              <div key={item.id}
                className="flex items-center gap-3 p-3 bg-white/3 rounded-lg border border-white/5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-xs truncate">{item.title}</p>
                  <p className="text-white/30 text-[10px]">Queued for publishing</p>
                </div>
                {item.inspectionReports?.[0]?.vitalityScore && (
                  <span className="text-amber-400 text-xs font-bold flex-shrink-0">
                    <Zap className="w-3 h-3 inline mr-0.5" />{item.inspectionReports?.[0].vitalityScore}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
