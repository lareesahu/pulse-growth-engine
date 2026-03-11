import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Plus, RefreshCw, Sparkles, Trash2, CheckCircle,
  XCircle, ChevronRight, AlertTriangle, Filter
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  proposed:  { label: "Proposed",  color: "text-[#5E6AD2]",  dot: "bg-[#5E6AD2]" },
  in_review: { label: "In Review", color: "text-[#7C3AED]",  dot: "bg-[#7C3AED]" },
  approved:  { label: "Approved",  color: "text-emerald-400", dot: "bg-emerald-400" },
  rejected:  { label: "Rejected",  color: "text-red-400",    dot: "bg-red-400" },
  archived:  { label: "Archived",  color: "text-white/30",   dot: "bg-white/20" },
  generated: { label: "Generated", color: "text-violet-400", dot: "bg-violet-400" },
};

export default function IdeasBoard() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPillar, setFilterPillar] = useState("all");
  const [newIdea, setNewIdea] = useState({ title: "", pillar: "", platform: "linkedin", angle: "" });
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [generatingContentFor, setGeneratingContentFor] = useState<number | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const { data: ideas = [], isLoading, refetch } = trpc.idea.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: pillars = [] } = trpc.brand.getPillars.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });

  const generateBatch = trpc.idea.generateBatch.useMutation();
  const createIdea = trpc.idea.create.useMutation({ onSuccess: () => { refetch(); setShowNewIdea(false); toast.success("Idea added"); } });
  const updateStatus = trpc.idea.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteAllMutation = trpc.idea.deleteAll.useMutation();
  const generateContent = trpc.content.generate.useMutation();

  const handleBatchGenerate = async () => {
    if (!activeBrandId) return;
    setGenerating(true);
    try {
      const result = await generateBatch.mutateAsync({ brandId: activeBrandId, count: batchCount });
      toast.success(`Caelum generated ${result.count} ideas!`);
      refetch();
      utils.activity.list.invalidate({ brandId: activeBrandId });
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!activeBrandId) return;
    setDeletingAll(true);
    try {
      const result = await deleteAllMutation.mutateAsync({ brandId: activeBrandId, hardDelete: true });
      toast.success(`Deleted ${result.count} ideas`);
      refetch();
      setShowDeleteAll(false);
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleGenerateContent = async (ideaId: number) => {
    if (!activeBrandId) return;
    setGeneratingContentFor(ideaId);
    try {
      await generateContent.mutateAsync({ ideaId });
      toast.success("Content package generated!");
      utils.activity.list.invalidate({ brandId: activeBrandId });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Content generation failed");
    } finally {
      setGeneratingContentFor(null);
    }
  };

  const pillarMap = Object.fromEntries(pillars.map(p => [p.id, p.name]));

  const filteredIdeas = ideas.filter(i => {
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    if (filterPillar !== "all" && (i.pillarId === null || pillarMap[i.pillarId] !== filterPillar)) return false;
    return true;
  });

  // Status counts for filter tabs
  const statusCounts = ideas.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideas</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{activeBrand?.name} · {ideas.length} total</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Batch generate */}
            <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden">
              <Select value={String(batchCount)} onValueChange={v => setBatchCount(Number(v))}>
                <SelectTrigger className="w-14 h-8 text-xs border-0 rounded-none focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 rounded-none text-xs px-3" onClick={handleBatchGenerate} disabled={generating} style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>
                {generating ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Brain size={12} className="mr-1.5" />}
                {generating ? "Generating..." : "Generate"}
              </Button>
            </div>

            {/* Add idea */}
            <Dialog open={showNewIdea} onOpenChange={setShowNewIdea}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-3"><Plus size={13} /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add New Idea</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label className="text-xs">Title</Label><Input value={newIdea.title} onChange={e => setNewIdea(i => ({ ...i, title: e.target.value }))} placeholder="Content idea title..." className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Pillar</Label>
                      <Select value={newIdea.pillar} onValueChange={v => setNewIdea(i => ({ ...i, pillar: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select pillar" /></SelectTrigger>
                        <SelectContent>{pillars.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Platform</Label>
                      <Select value={newIdea.platform} onValueChange={v => setNewIdea(i => ({ ...i, platform: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["linkedin", "instagram", "webflow", "blog", "all"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label className="text-xs">Angle / Notes</Label><Textarea value={newIdea.angle} onChange={e => setNewIdea(i => ({ ...i, angle: e.target.value }))} rows={3} className="mt-1 resize-none" /></div>
                  <Button onClick={() => createIdea.mutate({ brandId: activeBrandId!, title: newIdea.title, angle: newIdea.angle, targetPlatforms: [newIdea.platform] })} disabled={!newIdea.title.trim()} className="w-full" style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>Add Idea</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${filterStatus === "all" ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/70"}`}
            >
              All <span className="ml-1 opacity-60">{ideas.length}</span>
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = statusCounts[key] || 0;
              if (count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all flex items-center gap-1.5 ${filterStatus === key ? "bg-white/10 text-white font-medium" : "text-white/40 hover:text-white/70"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                  <span className="opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Pillar filter */}
          {pillars.length > 0 && (
            <Select value={filterPillar} onValueChange={setFilterPillar}>
              <SelectTrigger className="h-7 text-xs w-auto min-w-[110px] border-border/50 ml-auto">
                <Filter size={10} className="mr-1.5 opacity-50" />
                <SelectValue placeholder="All pillars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {pillars.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {/* Clear all */}
          {ideas.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 px-2"
              onClick={() => setShowDeleteAll(true)}
            >
              <Trash2 size={11} className="mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Delete All confirmation */}
        <Dialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={16} /> Delete All Ideas?
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                This will permanently delete all <strong className="text-foreground">{ideas.length} ideas</strong> for <strong className="text-foreground">{activeBrand?.name}</strong>. This cannot be undone.
              </p>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteAll(false)} disabled={deletingAll}>Cancel</Button>
                <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0" onClick={handleDeleteAll} disabled={deletingAll}>
                  {deletingAll ? <><RefreshCw size={12} className="mr-1.5 animate-spin" />Deleting...</> : <><Trash2 size={12} className="mr-1.5" />Delete All</>}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Ideas list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : filteredIdeas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              <Brain size={22} className="text-white/20" />
            </div>
            <p className="text-sm text-white/40">
              {ideas.length === 0 ? "No ideas yet — hit Generate to let Caelum create some" : "No ideas match this filter"}
            </p>
            {ideas.length === 0 && (
              <Button size="sm" onClick={handleBatchGenerate} disabled={generating} style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}>
                {generating ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Brain size={12} className="mr-1.5" />}
                Generate 10 Ideas
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredIdeas.map(idea => {
              const cfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.proposed;
              const pillarName = idea.pillarId ? pillarMap[idea.pillarId] : null;
              return (
                <div
                  key={idea.id}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 hover:bg-white/6 border border-transparent hover:border-white/8 transition-all cursor-pointer"
                  onClick={() => navigate(`/content/idea-${idea.id}`)}
                >
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-snug">{idea.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`text-[10px] ${cfg.color}`}>{cfg.label}</span>
                      {pillarName && (
                        <span className="text-[10px] text-white/30 border border-white/10 rounded px-1.5 py-0">{pillarName}</span>
                      )}
                      {idea.angle && (
                        <span className="text-[10px] text-white/25 truncate max-w-[200px] hidden sm:block">{idea.angle}</span>
                      )}
                    </div>
                  </div>

                  {/* Quick actions — visible on hover */}
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {(idea.status === "proposed" || idea.status === "in_review") && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" title="Approve"
                          onClick={() => updateStatus.mutate({ id: idea.id, status: "approved" })}>
                          <CheckCircle size={13} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10" title="Reject"
                          onClick={() => updateStatus.mutate({ id: idea.id, status: "rejected" })}>
                          <XCircle size={13} />
                        </Button>
                      </>
                    )}
                    {idea.status === "approved" && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                        onClick={() => { toast.info("Generating content..."); handleGenerateContent(idea.id); }}
                        disabled={generatingContentFor === idea.id}>
                        {generatingContentFor === idea.id
                          ? <><RefreshCw size={10} className="mr-1 animate-spin" />Generating</>
                          : <><Sparkles size={10} className="mr-1" />Generate</>}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/20 hover:text-red-400 hover:bg-red-500/10" title="Archive"
                      onClick={() => updateStatus.mutate({ id: idea.id, status: "archived" })}>
                      <Trash2 size={11} />
                    </Button>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={14} className="text-white/15 flex-shrink-0 group-hover:text-white/40 transition-colors" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
