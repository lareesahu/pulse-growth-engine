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
import { Brain, Plus, RefreshCw, Sparkles, ChevronRight, Trash2, CheckCircle, XCircle, Archive, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideas Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{activeBrand?.name} · {ideas.length} ideas total</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Pillar filter */}
            <Select value={filterPillar} onValueChange={setFilterPillar}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All pillars" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pillars</SelectItem>
                {pillars.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Batch generate */}
            <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
              <Select value={String(batchCount)} onValueChange={v => setBatchCount(Number(v))}>
                <SelectTrigger className="w-16 h-8 text-xs border-0 rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 30].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 rounded-none text-xs" onClick={handleBatchGenerate} disabled={generating} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                {generating ? <RefreshCw size={12} className="mr-1.5 animate-spin" /> : <Brain size={12} className="mr-1.5" />}
                {generating ? "Generating..." : "Generate Ideas"}
              </Button>
            </div>

            <Dialog open={showNewIdea} onOpenChange={setShowNewIdea}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8"><Plus size={14} className="mr-1" /> Add Idea</Button>
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
          <div className="grid grid-cols-5 gap-4">
            {STATUSES.map(s => <Skeleton key={s.key} className="h-64" />)}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-4 overflow-x-auto pb-2">
            {STATUSES.map(status => (
              <div key={status.key} className="min-w-[220px]">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-xs font-semibold text-foreground">{status.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{ideasByStatus[status.key]?.length || 0}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {(ideasByStatus[status.key] || []).map(idea => (
                    <Card key={idea.id} className="border-border bg-card hover:border-primary/30 transition-colors group">
                      <CardContent className="p-3">
                        <div className="text-xs font-medium text-foreground leading-snug mb-2">{idea.title}</div>
                        {idea.pillarId && pillarMap[idea.pillarId] && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mb-2 border-primary/30 text-primary/80">{pillarMap[idea.pillarId]}</Badge>
                        )}
                        {idea.angle && <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{idea.angle}</p>}

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {status.key === "proposed" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={() => updateStatus.mutate({ id: idea.id, status: "approved" })}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => updateStatus.mutate({ id: idea.id, status: "rejected" })}>
                                <XCircle size={12} />
                              </Button>
                            </>
                          )}
                          {status.key === "in_review" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400 hover:text-green-300" onClick={() => updateStatus.mutate({ id: idea.id, status: "approved" })}>
                                <CheckCircle size={12} />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400 hover:text-red-300" onClick={() => updateStatus.mutate({ id: idea.id, status: "rejected" })}>
                                <XCircle size={12} />
                              </Button>
                            </>
                          )}
                          {status.key === "approved" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary hover:text-primary/80 px-2" onClick={() => handleGenerateContent(idea.id)} disabled={generatingContentFor === idea.id}>
                              {generatingContentFor === idea.id ? <RefreshCw size={10} className="mr-1 animate-spin" /> : <Sparkles size={10} className="mr-1" />}
                              Generate
                            </Button>
                          )}
                          {(status.key === "rejected" || status.key === "proposed") && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-muted-foreground/60" onClick={() => updateStatus.mutate({ id: idea.id, status: "archived" })}>
                              <Archive size={12} />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive ml-auto" onClick={() => deleteIdea.mutate({ id: idea.id, status: "archived" })}>
                            <Trash2 size={10} />
                          </Button>
                        </div>

                        {/* View content link - navigate to content page for this idea */}
                        {status.key === "approved" && (
                          <Link href={`/content/idea-${idea.id}`}>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-primary cursor-pointer hover:underline">
                              <Zap size={10} /> View content <ChevronRight size={10} />
                            </div>
                          </Link>
                        )}
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
