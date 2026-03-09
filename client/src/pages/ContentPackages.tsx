import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, CheckCircle2, Clock, Archive, Rocket, AlertCircle,
  ChevronRight, Eye, Trash2, BarChart2, Linkedin, Instagram, Globe, MessageSquare, RefreshCw
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const STATUS_TABS = [
  { key: "all",                  label: "All",         color: "text-muted-foreground" },
  { key: "generated",            label: "Generated",   color: "text-[#3AC1EC]" },
  { key: "approved_for_publish", label: "Approved",    color: "text-emerald-400" },
  { key: "needs_revision",       label: "Needs Fix",   color: "text-amber-400" },
  { key: "archived",             label: "Archived",    color: "text-gray-500" },
];

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin:  <Linkedin size={12} />,
  instagram: <Instagram size={12} />,
  webflow:   <Globe size={12} />,
  wechat:    <MessageSquare size={12} />,
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_generation:   { label: "Pending",   cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    generating:           { label: "Generating",cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    generated:            { label: "Generated", cls: "bg-[#3AC1EC]/20 text-[#3AC1EC] border-[#3AC1EC]/30" },
    needs_revision:       { label: "Needs Fix", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    approved_for_publish: { label: "Approved",  cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    archived:             { label: "Archived",  cls: "bg-gray-500/20 text-gray-500 border-gray-500/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-400 border-gray-500/30" };
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

function ScoreRing({ score, size = 36 }: { score: number | null; size?: number }) {
  if (score === null) return <div className="text-[10px] text-muted-foreground">—</div>;
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 75 ? "#22c55e" : pct >= 55 ? "#f59e0b" : "#ef4444";
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[9px] font-bold" style={{ color }}>{pct}</span>
    </div>
  );
}

export default function ContentPackages() {
  const { activeBrandId } = useBrand();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const utils = trpc.useUtils();

  const { data: packages = [], isLoading, refetch } = trpc.content.listPackagesWithDetails.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const archiveMut = trpc.content.archivePackage.useMutation({
    onSuccess: () => { refetch(); toast.success("Package archived"); },
    onError: (e) => toast.error(e.message),
  });
  const approveMut = trpc.content.approvePackage.useMutation({
    onSuccess: () => { refetch(); toast.success("Package approved for publishing"); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = activeTab === "all"
    ? packages.filter(p => p.status !== "archived")
    : packages.filter(p => p.status === activeTab);

  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "all"
      ? packages.filter(p => p.status !== "archived").length
      : packages.filter(p => p.status === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="px-4 pt-5 pb-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Content Packages</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {packages.filter(p => p.status !== "archived").length} packages · {packages.filter(p => p.status === "generated").length} ready to review
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-border text-muted-foreground hover:text-white min-h-[36px]"
          >
            <RefreshCw size={14} />
          </Button>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                activeTab === tab.key
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? "bg-primary/30 text-primary" : "bg-secondary text-muted-foreground"
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Package list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No packages here yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run the pipeline from the Dashboard to generate content</p>
            <Button variant="outline" size="sm" className="mt-4 border-border text-muted-foreground hover:text-white" onClick={() => navigate("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(pkg => {
              const report = pkg.inspectionReport as any;
              const overall = report?.overallScore ?? null;
              const platforms = (pkg.variants as any[]).map(v => v.platform);
              const uniquePlatforms = Array.from(new Set(platforms));
              return (
                <Card key={pkg.id} className="border-border bg-card/50 overflow-hidden">
                  <CardContent className="p-0">
                    {/* Top row */}
                    <div className="flex items-start gap-3 p-4 pb-3">
                      {/* Score ring */}
                      <div className="flex-shrink-0 mt-0.5">
                        <ScoreRing score={overall} size={40} />
                      </div>
                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
                            {(pkg.idea as any)?.title ?? `Package #${pkg.id}`}
                          </p>
                          {statusBadge(pkg.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {pkg.masterHook ?? (pkg.idea as any)?.angle ?? "No hook generated"}
                        </p>
                        {/* Platforms */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {uniquePlatforms.map(p => (
                            <span key={p} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded">
                              {PLATFORM_ICONS[p] ?? <Globe size={12} />}
                              {p}
                            </span>
                          ))}
                          {uniquePlatforms.length === 0 && (
                            <span className="text-[10px] text-muted-foreground/50">No variants yet</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inspector scores row */}
                    {report && (
                      <div className="px-4 pb-3">
                        <div className="grid grid-cols-6 gap-1 bg-secondary/30 rounded-lg p-2">
                          {[
                            { label: "Human", val: report.humanisationScore },
                            { label: "Auth",  val: report.authenticityScore },
                            { label: "Acc",   val: report.accuracyScore },
                            { label: "Fit",   val: report.platformFitScore },
                            { label: "Orig",  val: report.originalityScore },
                            { label: "Vital", val: report.vitalityScore },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex flex-col items-center gap-0.5">
                              <span className={`text-[11px] font-bold ${
                                val === null ? "text-muted-foreground" :
                                val >= 75 ? "text-emerald-400" :
                                val >= 55 ? "text-amber-400" : "text-red-400"
                              }`}>{val ?? "—"}</span>
                              <span className="text-[9px] text-muted-foreground/60">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 text-xs text-muted-foreground hover:text-white hover:bg-secondary"
                        onClick={() => navigate(`/content/${pkg.ideaId}`)}
                      >
                        <Eye size={13} className="mr-1.5" /> View
                      </Button>
                      {pkg.status === "generated" && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                          onClick={() => approveMut.mutate({ id: pkg.id })}
                          disabled={approveMut.isPending}
                        >
                          <CheckCircle2 size={13} className="mr-1.5" /> Approve
                        </Button>
                      )}
                      {pkg.status === "approved_for_publish" && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-[#2163AF]/20 text-[#3AC1EC] border border-[#3AC1EC]/30 hover:bg-[#2163AF]/30"
                          onClick={() => navigate("/publishing")}
                        >
                          <Rocket size={13} className="mr-1.5" /> Publish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => archiveMut.mutate({ id: pkg.id })}
                        disabled={archiveMut.isPending}
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
