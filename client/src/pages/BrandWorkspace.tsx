import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Sparkles, BookOpen, Users, Target, MessageSquare, Settings, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PLATFORMS = ["linkedin", "instagram", "webflow", "wechat", "facebook", "tiktok", "xiaohongshu", "reddit", "quora"];
const RULE_TYPES = ["do_say", "dont_say", "banned_claim", "required_phrase", "cta_style", "platform_rule", "visual_rule", "prompt_guardrail"];

export default function BrandWorkspace() {
  const { activeBrand, activeBrandId, setActiveBrandId, brands } = useBrand();
  const utils = trpc.useUtils();

  // Brand form state
  const [brandForm, setBrandForm] = useState({
    name: "", description: "", mission: "", positioning: "", audienceSummary: "", toneSummary: "", website: "",
    activePlatforms: [] as string[],
  });
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // Load brand data into form
  useEffect(() => {
    if (activeBrand) {
      setBrandForm({
        name: activeBrand.name || "",
        description: activeBrand.description || "",
        mission: activeBrand.mission || "",
        positioning: activeBrand.positioning || "",
        audienceSummary: activeBrand.audienceSummary || "",
        toneSummary: activeBrand.toneSummary || "",
        website: activeBrand.website || "",
        activePlatforms: (activeBrand.activePlatforms as string[]) || [],
      });
    }
  }, [activeBrand?.id]);

  const { data: pillars = [], refetch: refetchPillars } = trpc.brand.getPillars.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });
  const { data: audiences = [], refetch: refetchAudiences } = trpc.brand.getAudiences.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });
  const { data: prompts = [], refetch: refetchPrompts } = trpc.brand.getPrompts.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });
  const { data: rules = [], refetch: refetchRules } = trpc.brand.getRules.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });
  const { data: platformPrefs = [], refetch: refetchPrefs } = trpc.brand.getPlatformPrefs.useQuery({ brandId: activeBrandId! }, { enabled: !!activeBrandId });

  const updateBrand = trpc.brand.update.useMutation({ onSuccess: () => { toast.success("Brand updated"); utils.brand.list.invalidate(); } });
  const createBrand = trpc.brand.create.useMutation({ onSuccess: () => { toast.success("Brand created"); setShowNewBrand(false); setNewBrandName(""); utils.brand.list.invalidate(); } });
  const addPillar = trpc.brand.addPillar.useMutation({ onSuccess: () => { refetchPillars(); toast.success("Pillar added"); } });
  const deletePillar = trpc.brand.deletePillar.useMutation({ onSuccess: () => refetchPillars() });
  const addAudience = trpc.brand.addAudience.useMutation({ onSuccess: () => { refetchAudiences(); toast.success("Audience added"); } });
  const deleteAudience = trpc.brand.deleteAudience.useMutation({ onSuccess: () => refetchAudiences() });
  const addPrompt = trpc.brand.addPrompt.useMutation({ onSuccess: () => { refetchPrompts(); toast.success("Prompt template saved"); } });
  const deletePrompt = trpc.brand.deletePrompt.useMutation({ onSuccess: () => refetchPrompts() });
  const addRule = trpc.brand.addRule.useMutation({ onSuccess: () => { refetchRules(); toast.success("Rule added"); } });
  const deleteRule = trpc.brand.deleteRule.useMutation({ onSuccess: () => refetchRules() });
  const savePlatformPref = trpc.brand.savePlatformPref.useMutation({ onSuccess: () => { refetchPrefs(); toast.success("Platform preference saved"); } });

  // New item forms
  const [newPillar, setNewPillar] = useState({ name: "", description: "" });
  const [newAudience, setNewAudience] = useState({ segment: "", description: "", painPoints: "", goals: "" });
  const [newPrompt, setNewPrompt] = useState({ name: "", platform: "linkedin", pillar: "", promptText: "" });
  const [newRule, setNewRule] = useState({ ruleType: "do_say" as any, content: "", platform: "" });
  const [editingPlatformPref, setEditingPlatformPref] = useState<string | null>(null);
  const [platformPrefForm, setPlatformPrefForm] = useState({ postFormat: "", hashtagStrategy: "", frequency: "", toneNotes: "" });

  const handleSaveBrand = () => {
    if (!activeBrandId) return;
    updateBrand.mutate({ id: activeBrandId, ...brandForm });
  };

  const togglePlatform = (p: string) => {
    setBrandForm(f => ({
      ...f,
      activePlatforms: f.activePlatforms.includes(p) ? f.activePlatforms.filter(x => x !== p) : [...f.activePlatforms, p],
    }));
  };

  const handleEditPlatformPref = (platform: string) => {
    const existing = platformPrefs.find(p => p.platform === platform);
    setPlatformPrefForm({
      postFormat: existing?.postFormat || "",
      hashtagStrategy: existing?.hashtagStrategy || "",
      frequency: existing?.frequency || "",
      toneNotes: existing?.toneNotes || "",
    });
    setEditingPlatformPref(platform);
  };

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">Brand Workspace</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage brand DNA, voice, audience, and content rules</p>
          </div>
          <Dialog open={showNewBrand} onOpenChange={setShowNewBrand}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-shrink-0 min-h-[44px]"><Plus size={14} className="mr-1.5" /> New Brand</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Brand</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Brand Name</Label><Input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="e.g. Pulse Branding" className="mt-1" /></div>
                <Button onClick={() => createBrand.mutate({ name: newBrandName })} disabled={!newBrandName.trim()} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Create Brand</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!activeBrand ? (
          <div className="text-center py-12 text-muted-foreground">No brand selected. Create one to get started.</div>
        ) : (
          <Tabs defaultValue="strategy">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="bg-card border border-border w-max min-w-full">
                <TabsTrigger value="strategy" className="text-xs px-2.5"><BookOpen size={13} className="mr-1 hidden sm:inline" />Strategy</TabsTrigger>
                <TabsTrigger value="voice" className="text-xs px-2.5"><MessageSquare size={13} className="mr-1 hidden sm:inline" />Voice</TabsTrigger>
                <TabsTrigger value="audience" className="text-xs px-2.5"><Users size={13} className="mr-1 hidden sm:inline" />Audience</TabsTrigger>
                <TabsTrigger value="pillars" className="text-xs px-2.5"><Target size={13} className="mr-1 hidden sm:inline" />Pillars</TabsTrigger>
                <TabsTrigger value="prompts" className="text-xs px-2.5"><Sparkles size={13} className="mr-1 hidden sm:inline" />Prompts</TabsTrigger>
                <TabsTrigger value="platforms" className="text-xs px-2.5"><Globe size={13} className="mr-1 hidden sm:inline" />Platforms</TabsTrigger>
                <TabsTrigger value="rules" className="text-xs px-2.5"><Settings size={13} className="mr-1 hidden sm:inline" />Rules</TabsTrigger>
              </TabsList>
            </div>

            {/* ── STRATEGY ── */}
            <TabsContent value="strategy" className="mt-4">
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-sm">Brand Strategy</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><Label className="text-xs">Brand Name</Label><Input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
                    <div><Label className="text-xs">Website</Label><Input value={brandForm.website} onChange={e => setBrandForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Description</Label><Textarea value={brandForm.description} onChange={e => setBrandForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 resize-none" /></div>
                  <div><Label className="text-xs">Mission Statement</Label><Textarea value={brandForm.mission} onChange={e => setBrandForm(f => ({ ...f, mission: e.target.value }))} rows={3} placeholder="What does this brand exist to do?" className="mt-1 resize-none" /></div>
                  <div><Label className="text-xs">Brand Positioning</Label><Textarea value={brandForm.positioning} onChange={e => setBrandForm(f => ({ ...f, positioning: e.target.value }))} rows={3} placeholder="How does this brand differentiate itself?" className="mt-1 resize-none" /></div>
                  <div>
                    <Label className="text-xs mb-2 block">Active Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(p => (
                        <button key={p} onClick={() => togglePlatform(p)} className={`px-3 py-1 rounded-full text-xs border transition-all ${brandForm.activePlatforms.includes(p) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleSaveBrand} disabled={updateBrand.isPending} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                    <Save size={14} className="mr-2" />{updateBrand.isPending ? "Saving..." : "Save Strategy"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── VOICE & TONE ── */}
            <TabsContent value="voice" className="mt-4">
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-sm">Voice & Tone</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label className="text-xs">Audience Summary</Label><Textarea value={brandForm.audienceSummary} onChange={e => setBrandForm(f => ({ ...f, audienceSummary: e.target.value }))} rows={3} placeholder="Who is the target audience?" className="mt-1 resize-none" /></div>
                  <div><Label className="text-xs">Tone of Voice</Label><Textarea value={brandForm.toneSummary} onChange={e => setBrandForm(f => ({ ...f, toneSummary: e.target.value }))} rows={4} placeholder="Describe the brand voice: authoritative, empathetic, forward-thinking..." className="mt-1 resize-none" /></div>
                  <Button onClick={handleSaveBrand} disabled={updateBrand.isPending} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                    <Save size={14} className="mr-2" />{updateBrand.isPending ? "Saving..." : "Save Voice"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── AUDIENCE ── */}
            <TabsContent value="audience" className="mt-4 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Audience Segments</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add Segment</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Audience Segment</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div><Label className="text-xs">Segment Name</Label><Input value={newAudience.segment} onChange={e => setNewAudience(a => ({ ...a, segment: e.target.value }))} placeholder="e.g. SME Founders" className="mt-1" /></div>
                          <div><Label className="text-xs">Description</Label><Textarea value={newAudience.description} onChange={e => setNewAudience(a => ({ ...a, description: e.target.value }))} rows={2} className="mt-1 resize-none" /></div>
                          <div><Label className="text-xs">Pain Points</Label><Textarea value={newAudience.painPoints} onChange={e => setNewAudience(a => ({ ...a, painPoints: e.target.value }))} rows={2} className="mt-1 resize-none" /></div>
                          <div><Label className="text-xs">Goals</Label><Textarea value={newAudience.goals} onChange={e => setNewAudience(a => ({ ...a, goals: e.target.value }))} rows={2} className="mt-1 resize-none" /></div>
                          <Button onClick={() => addAudience.mutate({ brandId: activeBrandId!, ...newAudience })} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Add Segment</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No audience segments yet.</p>
                  ) : audiences.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-sm text-foreground">{a.segment}</div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteAudience.mutate({ id: a.id })}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      {a.painPoints && <p className="text-xs text-muted-foreground mt-1"><span className="text-foreground/60">Pain:</span> {a.painPoints}</p>}
                      {a.goals && <p className="text-xs text-muted-foreground mt-1"><span className="text-foreground/60">Goals:</span> {a.goals}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PILLARS ── */}
            <TabsContent value="pillars" className="mt-4 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Content Pillars</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add Pillar</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Content Pillar</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div><Label className="text-xs">Pillar Name</Label><Input value={newPillar.name} onChange={e => setNewPillar(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Brand Strategy Insights" className="mt-1" /></div>
                          <div><Label className="text-xs">Description</Label><Textarea value={newPillar.description} onChange={e => setNewPillar(p => ({ ...p, description: e.target.value }))} rows={3} className="mt-1 resize-none" /></div>
                          <Button onClick={() => addPillar.mutate({ brandId: activeBrandId!, ...newPillar })} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Add Pillar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pillars.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No content pillars yet.</p>
                  ) : pillars.map((p, i) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: ["#3AC1EC", "#56C4C4", "#2163AF", "#291C53", "#0A1931", "#3AC1EC"][i % 6] }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground">{p.name}</div>
                        {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => deletePillar.mutate({ id: p.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PROMPTS ── */}
            <TabsContent value="prompts" className="mt-4 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Validated Prompt Templates</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add Prompt</Button></DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add Prompt Template</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div><Label className="text-xs">Template Name</Label><Input value={newPrompt.name} onChange={e => setNewPrompt(p => ({ ...p, name: e.target.value }))} placeholder="e.g. LinkedIn Thought Leadership" className="mt-1" /></div>
                            <div>
                              <Label className="text-xs">Platform</Label>
                              <Select value={newPrompt.platform} onValueChange={v => setNewPrompt(p => ({ ...p, platform: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div><Label className="text-xs">Pillar (optional)</Label><Input value={newPrompt.pillar} onChange={e => setNewPrompt(p => ({ ...p, pillar: e.target.value }))} placeholder="e.g. Brand Strategy" className="mt-1" /></div>
                          <div><Label className="text-xs">Prompt Text</Label><Textarea value={newPrompt.promptText} onChange={e => setNewPrompt(p => ({ ...p, promptText: e.target.value }))} rows={8} placeholder="Write your validated prompt here..." className="mt-1 resize-none font-mono text-xs" /></div>
                          <Button onClick={() => addPrompt.mutate({ brandId: activeBrandId!, ...newPrompt })} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Save Prompt Template</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prompts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No prompt templates yet. Add your validated prompts here.</p>
                  ) : prompts.map(p => (
                    <div key={p.id} className="p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium text-sm text-foreground">{p.name}</span>
                          <div className="flex gap-1.5 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.platform}</Badge>
                            {p.pillar && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.pillar}</Badge>}
                            {!p.isActive && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">inactive</Badge>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deletePrompt.mutate({ id: p.id })}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                      <pre className="text-xs text-muted-foreground bg-background/50 rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap font-mono">{p.promptText}</pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── PLATFORMS ── */}
            <TabsContent value="platforms" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(brandForm.activePlatforms.length > 0 ? brandForm.activePlatforms : PLATFORMS.slice(0, 4)).map(platform => {
                  const pref = platformPrefs.find(p => p.platform === platform);
                  return (
                    <Card key={platform} className="border-border bg-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm capitalize">{platform}</CardTitle>
                          <Button size="sm" variant="outline" onClick={() => handleEditPlatformPref(platform)}>
                            {pref ? "Edit" : "Configure"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground space-y-1">
                        {pref ? (
                          <>
                            {pref.postFormat && <p><span className="text-foreground/60">Format:</span> {pref.postFormat}</p>}
                            {pref.frequency && <p><span className="text-foreground/60">Frequency:</span> {pref.frequency}</p>}
                            {pref.hashtagStrategy && <p><span className="text-foreground/60">Hashtags:</span> {pref.hashtagStrategy}</p>}
                          </>
                        ) : <p>Not configured yet.</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Platform pref edit dialog */}
              <Dialog open={!!editingPlatformPref} onOpenChange={o => !o && setEditingPlatformPref(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Configure {editingPlatformPref}</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div><Label className="text-xs">Post Format</Label><Textarea value={platformPrefForm.postFormat} onChange={e => setPlatformPrefForm(f => ({ ...f, postFormat: e.target.value }))} rows={2} placeholder="e.g. Hook + 3 insights + CTA" className="mt-1 resize-none" /></div>
                    <div><Label className="text-xs">Hashtag Strategy</Label><Input value={platformPrefForm.hashtagStrategy} onChange={e => setPlatformPrefForm(f => ({ ...f, hashtagStrategy: e.target.value }))} placeholder="e.g. 5-8 niche tags + 2 broad" className="mt-1" /></div>
                    <div><Label className="text-xs">Posting Frequency</Label><Input value={platformPrefForm.frequency} onChange={e => setPlatformPrefForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. 3x per week" className="mt-1" /></div>
                    <div><Label className="text-xs">Tone Notes</Label><Textarea value={platformPrefForm.toneNotes} onChange={e => setPlatformPrefForm(f => ({ ...f, toneNotes: e.target.value }))} rows={2} className="mt-1 resize-none" /></div>
                    <Button onClick={() => { savePlatformPref.mutate({ brandId: activeBrandId!, platform: editingPlatformPref!, ...platformPrefForm }); setEditingPlatformPref(null); }} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* ── RULES ── */}
            <TabsContent value="rules" className="mt-4 space-y-4">
              <Card className="border-border bg-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Brand Rules & Guardrails</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add Rule</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Add Brand Rule</DialogTitle></DialogHeader>
                        <div className="space-y-3 pt-2">
                          <div>
                            <Label className="text-xs">Rule Type</Label>
                            <Select value={newRule.ruleType} onValueChange={v => setNewRule(r => ({ ...r, ruleType: v as any }))}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div><Label className="text-xs">Rule Content</Label><Textarea value={newRule.content} onChange={e => setNewRule(r => ({ ...r, content: e.target.value }))} rows={3} placeholder="Describe the rule..." className="mt-1 resize-none" /></div>
                          <Button onClick={() => addRule.mutate({ brandId: activeBrandId!, ruleType: newRule.ruleType, content: newRule.content })} className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>Add Rule</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No rules yet. Add do's, don'ts, and guardrails.</p>
                  ) : rules.map(r => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 mt-0.5 ${r.ruleType === "do_say" ? "border-green-500/40 text-green-400" : r.ruleType === "dont_say" || r.ruleType === "banned_claim" ? "border-red-500/40 text-red-400" : "border-primary/40 text-primary"}`}>
                        {r.ruleType.replace(/_/g, " ")}
                      </Badge>
                      <p className="text-xs text-foreground flex-1">{r.content}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => deleteRule.mutate({ id: r.id })}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
