import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, CheckCircle2, Clock, Archive, Rocket, AlertCircle,
  ChevronRight, Eye, Trash2, BarChart2, Linkedin, Instagram, Globe, MessageSquare, RefreshCw,
  CheckSquare, Square, XCircle, Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

const STATUS_TABS = [
  { key: "all",                  label: "All",         color: "text-muted-foreground" },
  { key: "generated",            label: "Generated",   color: "text-[#5E6AD2]" },
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
    generated:            { label: "Generated", cls: "bg-[#5E6AD2]/20 text-[#5E6AD2] border-[#5E6AD2]/30" },
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

/** Display dimension score (1-10 scale) with color coding */
function DimScore({ val, label }: { val: number | null; label: string }) {
  const display = val !== null && val !== undefined && val !== 0 ? val : null;
  const color = display === null ? "text-muted-foreground" :
    display >= 8 ? "text-emerald-400" :
    display >= 6 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[11px] font-bold ${color}`}>{display ?? "—"}</span>
      <span className="text-[9px] text-muted-foreground/60">{label}</span>
    </div>
  );
}

export default function ContentPackages() {
  const { activeBrandId } = useBrand();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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
    onSuccess: () => { refetch(); toast.success("Package approved for publishing"); utils.scheduling.getScheduledPosts.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const resetStuck = trpc.content.resetStuckPackages.useMutation({
    onSuccess: (r) => { refetch(); toast.success(r.count > 0 ? `Reset ${r.count} stuck package${r.count > 1 ? "s" : ""}` : "No stuck packages found"); },
    onError: (e) => toast.error(e.message),
  });

  // Batch mutations
  const batchApprove = trpc.content.batchApprove.useMutation({
    onSuccess: (r) => {
      refetch(); setSelectedIds(new Set());
      const autoMsg = r.autoScheduled && r.autoScheduled > 0 ? ` · ${r.autoScheduled} auto-scheduled` : "";
      toast.success(`${r.count} packages approved${autoMsg}`);
      utils.scheduling.getScheduledPosts.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const batchArchive = trpc.content.batchArchive.useMutation({
    onSuccess: (r) => { refetch(); setSelectedIds(new Set()); toast.success(`${r.count} packages archived`); },
    onError: (e) => toast.error(e.message),
  });
  const batchReject = trpc.content.batchReject.useMutation({
    onSuccess: (r) => { refetch(); setSelectedIds(new Set()); toast.success(`${r.count} packages marked for revision`); },
    onError: (e) => toast.error(e.message),
  });

  const batchRegenerate = trpc.content.batchRegenerate.useMutation({
    onSuccess: (r) => { refetch(); setSelectedIds(new Set()); toast.success(`${r.count} package${r.count !== 1 ? "s" : ""} queued for regeneration`); },
    onError: (e) => toast.error(e.message),
  });

  const batchLoading = batchApprove.isPending || batchArchive.isPending || batchReject.isPending || batchRegenerate.isPending;

  const stuckCount = packages.filter(p => p.status === "generating" || p.status === "pending_generation").length;

  const filtered = activeTab === "all"
    ? packages.filter(p => p.status !== "archived")
    : packages.filter(p => p.status === activeTab);

  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === "all"
      ? packages.filter(p => p.status !== "archived").length
      : packages.filter(p => p.status === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  // Selection helpers
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => {
    const ids = filtered.map(p => p.id);
    setSelectedIds(new Set(ids));
  };
  const deselectAll = () => setSelectedIds(new Set());
  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  // Clear selection when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

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

        {/* Stuck packages banner */}
        {stuckCount > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300 flex-1">{stuckCount} package{stuckCount > 1 ? "s" : ""} stuck in Generating state</p>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-400 hover:bg-amber-500/20 px-2 flex-shrink-0" onClick={() => activeBrandId && resetStuck.mutate({ brandId: activeBrandId })} disabled={resetStuck.isPending}>
              {resetStuck.isPending ? <RefreshCw size={11} className="animate-spin mr-1" /> : null}Fix
            </Button>
          </div>
        )}

        {/* Batch action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/5 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="text-xs text-[#5E6AD2] font-medium flex-1">
              {selectedIds.size} selected
            </span>
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 px-3"
              onClick={() => batchApprove.mutate({ ids: Array.from(selectedIds) })}
              disabled={batchLoading}
            >
              {batchApprove.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <CheckCircle2 size={11} className="mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 px-3"
              onClick={() => batchReject.mutate({ ids: Array.from(selectedIds) })}
              disabled={batchLoading}
            >
              {batchReject.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <XCircle size={11} className="mr-1" />}
              Reject
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 px-3"
              onClick={() => batchArchive.mutate({ ids: Array.from(selectedIds) })}
              disabled={batchLoading}
            >
              {batchArchive.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <Trash2 size={11} className="mr-1" />}
              Archive
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 px-3"
              onClick={() => batchRegenerate.mutate({ ids: Array.from(selectedIds) })}
              disabled={batchLoading}
            >
              {batchRegenerate.isPending ? <Loader2 size={11} className="animate-spin mr-1" /> : <RefreshCw size={11} className="mr-1" />}
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-white px-2"
              onClick={deselectAll}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
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

        {/* Select all toggle */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={allSelected ? deselectAll : selectAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
            >
              {allSelected ? <CheckSquare size={14} className="text-[#5E6AD2]" /> : <Square size={14} />}
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-[10px] text-muted-foreground/40">
              {filtered.length} package{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

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
              const isSelected = selectedIds.has(pkg.id);
              return (
                <Card
                  key={pkg.id}
                  className={`border overflow-hidden transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#5E6AD2]/50 bg-[#5E6AD2]/5"
                      : "border-border bg-card/50 hover:border-border/80"
                  }`}
                  onClick={() => toggleSelect(pkg.id)}
                >
                  <CardContent className="p-0">
                    {/* Top row */}
                    <div className="flex items-start gap-3 p-4 pb-3">
                      {/* Checkbox */}
                      <button
                        className="flex-shrink-0 mt-1"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(pkg.id); }}
                      >
                        {isSelected
                          ? <CheckSquare size={16} className="text-[#5E6AD2]" />
                          : <Square size={16} className="text-muted-foreground/40 hover:text-muted-foreground" />
                        }
                      </button>
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

                    {/* Inspector scores row — dimension scores are 1-10, virality is 0-100 */}
                    {report && (
                      <div className="px-4 pb-3">
                        <div className="grid grid-cols-6 gap-1 bg-secondary/30 rounded-lg p-2">
                          <DimScore val={report.humanisationScore} label="Human" />
                          <DimScore val={report.authenticityScore} label="Auth" />
                          <DimScore val={report.accuracyScore} label="Acc" />
                          <DimScore val={report.platformFitScore} label="Fit" />
                          <DimScore val={report.originalityScore} label="Orig" />
                          <DimScore val={report.viralityScore} label="Viral" />
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-2 px-4 pb-3 border-t border-border/50 pt-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-8 text-xs text-muted-foreground hover:text-white hover:bg-secondary"
                        onClick={() => navigate(`/content/idea-${pkg.ideaId}`)}
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
                          className="flex-1 h-8 text-xs bg-[#5E6AD2]/20 text-[#5E6AD2] border border-[#5E6AD2]/30 hover:bg-[#5E6AD2]/30"
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
