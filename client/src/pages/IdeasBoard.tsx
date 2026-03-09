import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain, Plus, RefreshCw, Sparkles, Trash2, CheckCircle,
  XCircle, BarChart2, List, CheckSquare, CheckCheck, X
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const STATUSES = [
  { key: "proposed",  label: "Proposed",  color: "#3AC1EC" },
  { key: "in_review", label: "In Review", color: "#56C4C4" },
  { key: "approved",  label: "Approved",  color: "#2163AF" },
  { key: "rejected",  label: "Rejected",  color: "#ef4444" },
  { key: "archived",  label: "Archived",  color: "#6b7280" },
];

export default function IdeasBoard() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const utils = trpc.useUtils();
  const [generating, setGenerating] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [filterPillar, setFilterPillar] = useState("all");
  const [newIdea, setNewIdea] = useState({ title: "", pillar: "", platform: "linkedin", angle: "" });
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [generatingContentFor, setGeneratingContentFor] = useState<number | null>(null);

  const { data: ideas = [], isLoading, refetch } = trpc.idea.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: pillars = [] } = trpc.brand.getPillars.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });

  const generateBatch = trpc.idea.generateBatch.useMutation();
  const createIdea = trpc.idea.create.useMutation({ onSuccess: () => { refetch(); setShowNewIdea(false); toast.success("Idea added"); } });
  const updateStatus = trpc.idea.updateStatus.useMutation({ onSuccess: () => refetch() });
  const deleteIdea = trpc.idea.updateStatus.useMutation({ onSuccess: () => refetch() });
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

  const handleGenerateContent = async (ideaId: number) => {
    if (!activeBrandId) return;
    setGeneratingContentFor(ideaId);
    try {
      const result = await generateContent.mutateAsync({ ideaId });
      toast.success("Content package generated!");
      utils.activity.list.invalidate({ brandId: activeBrandId });
    } catch (e: any) {
      toast.error(e.message || "Content generation failed");
    } finally {
      setGeneratingContentFor(null);
    }
  };

  const pillarMap = Object.fromEntries(pillars.map(p => [p.id, p.name]));
  const filteredIdeas = filterPillar === "all" ? ideas : ideas.filter(i => i.pillarId !== null && pillarMap[i.pillarId] === filterPillar);

  const ideasByStatus = STATUSES.reduce((acc, s) => {
    acc[s.key] = filteredIdeas.filter(i => i.status === s.key);
    return acc;
  }, {} as Record<string, typeof ideas>);

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">Ideas Board</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{activeBrand?.name} · {ideas.length} ideas total</p>
            </div>
          </div>
          {/* Controls row — scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {/* Pillar filter */}
            <Select value={filterPillar} onValueChange={setFilterPillar}>
              <SelectTrigger className="w-36 h-9 text-xs flex-shrink-0"><SelectValue placeholder="All pillars" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {pillars.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Batch generate */}
            <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden flex-shrink-0">
              <Select value={String(batchCount)} onValueChange={v => setBatchCount(Number(v))}>
                <SelectTrigger className="w-14 h-9 text-xs border-0 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-9 rounded-none text-xs px-3 flex-shrink-0" onClick={handleBatchGenerate} disabled={generating} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                {generating ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Brain size={12} className="mr-1.5" />}
                {generating ? "Generating..." : "Generate"}
              </Button>
            </div>

            <Dialog open={showNewIdea} onOpenChange={setShowNewIdea}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 flex-shrink-0"><Plus size={14} className="mr-1" /> Add</Button>
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
                          {["linkedin", "instagram", "webflow", "wechat", "all"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label className="text-xs">Angle / Notes</Label><Textarea value={newIdea.angle} onChange={e => setNewIdea(i => ({ ...i, angle: e.target.value }))} rows={3} className="mt-1 resize-none" /></div>
                  <Button onClick={() => createIdea.mutate({ brandId: activeBrandId!, title: newIdea.title, angle: newIdea.angle, targetPlatforms: [newIdea.platform] })} disabled={!newIdea.title.trim()} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Add Idea</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban board */}
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STATUSES.map(s => <Skeleton key={s.key} className="h-64 min-w-[240px]" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:gap-4 snap-x snap-mandatory">
            {STATUSES.map(status => (
              <div key={status.key} className="min-w-[260px] md:min-w-0 flex-shrink-0 snap-start">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-xs font-semibold text-foreground">{status.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{ideasByStatus[status.key]?.length || 0}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {(ideasByStatus[status.key] || []).map(idea => (
                    <Card key={idea.id} className="border-border bg-card hover:border-primary/30 transition-colors group cursor-pointer" onClick={() => window.location.href = `/content/${idea.id}`}>
                      <CardContent className="p-3">
                        <div className="text-xs font-medium text-foreground leading-snug mb-2">{idea.title}</div>
                        {idea.pillarId && pillarMap[idea.pillarId] && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-2 border-primary/30 text-primary/80">{pillarMap[idea.pillarId]}</Badge>
                        )}
                        {idea.angle && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{idea.angle}</p>}

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-2">
                          {status.key === "proposed" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: idea.id, status: "approved" }); }}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: idea.id, status: "rejected" }); }}>
                                <XCircle size={12} />
                              </Button>
                            </>
                          )}
                          {status.key === "in_review" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: idea.id, status: "approved" }); }}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: idea.id, status: "rejected" }); }}>
                                <XCircle size={12} />
                              </Button>
                            </>
                          )}
                          {status.key === "approved" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:text-primary/80 px-2" onClick={(e) => { e.stopPropagation(); handleGenerateContent(idea.id); }} disabled={generatingContentFor === idea.id}>
                              {generatingContentFor === idea.id ? <RefreshCw size={10} className="mr-1 animate-spin" /> : <Sparkles size={10} className="mr-1" />}
                              Generate
                            </Button>
                          )}
                          {(status.key === "rejected" || status.key === "proposed") && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-muted-foreground/60" onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: idea.id, status: "archived" }); }}>
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive ml-auto" onClick={(e) => { e.stopPropagation(); deleteIdea.mutate({ id: idea.id, status: "archived" }); }}>
                            <Trash2 size={10} />
                          </Button>
                        </div>

                        {/* View content link */}
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-primary/60">
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {(ideasByStatus[status.key] || []).length === 0 && (
                    <div className="border border-dashed border-border rounded-lg p-4 text-center text-[10px] text-muted-foreground">
                      {status.key === "proposed" ? "Generate ideas to fill this column" : `No ${status.label.toLowerCase()} ideas`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
