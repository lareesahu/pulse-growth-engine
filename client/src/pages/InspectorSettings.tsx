import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShieldCheck, Brain, Fingerprint, Target, Sparkles, Zap,
  Plus, Trash2, TrendingUp, AlertCircle, CheckCircle2, Info
} from "lucide-react";

const DIMENSIONS = [
  {
    key: "humanisation",
    label: "Humanisation",
    icon: Brain,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
    description: "Reads like a real person — natural flow, varied sentence length, no robotic phrasing",
  },
  {
    key: "authenticity",
    label: "Authenticity",
    icon: Fingerprint,
    color: "text-[#3AC1EC]",
    bg: "bg-[#3AC1EC]/10",
    border: "border-[#3AC1EC]/30",
    description: "Consistent with the brand's actual voice — not generic marketing speak",
  },
  {
    key: "accuracy",
    label: "Accuracy",
    icon: ShieldCheck,
    color: "text-[#56C4C4]",
    bg: "bg-[#56C4C4]/10",
    border: "border-[#56C4C4]/30",
    description: "Claims are grounded, no hallucinated stats, brand facts are correct",
  },
  {
    key: "platformFit",
    label: "Platform Fit",
    icon: Target,
    color: "text-[#2163AF]",
    bg: "bg-[#2163AF]/10",
    border: "border-[#2163AF]/30",
    description: "Format, length, tone, and hashtag count match the platform's best practices",
  },
  {
    key: "originality",
    label: "Originality",
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    description: "Fresh angle — not repetitive vs. past content",
  },
  {
    key: "virality",
    label: "Virality Score",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    description: "Likelihood of content going viral — composite prediction of engagement, reach, and shareability potential",
  },
];

const RULE_TYPES = [
  { value: "banned_phrase", label: "Banned Phrase" },
  { value: "formatting_rule", label: "Formatting Rule" },
  { value: "tone_rule", label: "Tone Rule" },
  { value: "char_limit", label: "Character Limit" },
  { value: "image_rule", label: "Image Rule" },
  { value: "custom_prompt", label: "Custom Prompt" },
];

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 10) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="rotate-[-90deg]">
      <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor" strokeWidth="4"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" className={color} />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[11px] font-bold" style={{ transform: "rotate(90deg)", transformOrigin: "26px 26px" }}>
        {score}
      </text>
    </svg>
  );
}

export default function InspectorSettings() {
  const { activeBrandId } = useBrand();
  const [newRule, setNewRule] = useState({ ruleType: "banned_phrase", ruleValue: "", platform: "", severity: "warning", autoFix: false, autoFixInstruction: "" });
  const [showAddRule, setShowAddRule] = useState(false);

  const { data: thresholds = [], refetch: refetchThresholds } = trpc.inspector.listThresholds.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: rules = [], refetch: refetchRules } = trpc.inspector.listRules.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const { data: accuracy } = trpc.inspector.getModelAccuracy.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );

  const updateThreshold = trpc.inspector.upsertThreshold.useMutation({
    onSuccess: () => { refetchThresholds(); toast.success("Threshold updated"); },
  });
  const createRule = trpc.inspector.createRule.useMutation({
    onSuccess: () => { refetchRules(); setShowAddRule(false); setNewRule({ ruleType: "banned_phrase", ruleValue: "", platform: "", severity: "warning", autoFix: false, autoFixInstruction: "" }); toast.success("Rule added"); },
  });
  const deleteRule = trpc.inspector.deleteRule.useMutation({
    onSuccess: () => { refetchRules(); toast.success("Rule deleted"); },
  });
  const toggleRule = trpc.inspector.updateRule.useMutation({
    onSuccess: () => refetchRules(),
  });

  const getThreshold = (dim: string) => thresholds.find((t: any) => t.dimension === dim);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#3AC1EC]" />
            AI Inspector Settings
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Configure quality thresholds, inspection rules, and track the learning engine's accuracy over time.
          </p>
        </div>

        <Tabs defaultValue="thresholds">
          <TabsList className="bg-white/5 border border-white/10 w-full overflow-x-auto flex-nowrap">
            <TabsTrigger value="thresholds" className="text-xs flex-1">Thresholds</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs flex-1">Rules</TabsTrigger>
            <TabsTrigger value="accuracy" className="text-xs flex-1">Learning Engine</TabsTrigger>
          </TabsList>

          {/* ── Thresholds Tab ── */}
          <TabsContent value="thresholds" className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">How Thresholds Work</CardTitle>
                <CardDescription className="text-white/50 text-xs">
                  Content scoring below any active threshold is automatically sent back to the AI for regeneration with specific feedback.
                  After 2 failed attempts, it is flagged for manual review. Only content passing all thresholds reaches your Review Queue.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {DIMENSIONS.map((dim) => {
                const threshold = getThreshold(dim.key);
                const minScore = threshold?.minScore ?? 7;
                const isActive = threshold?.isActive ?? true;
                const weight = threshold?.weight ?? 1;
                const Icon = dim.icon;

                return (
                  <Card key={dim.key} className={`border ${dim.border} bg-white/3`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${dim.bg} flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${dim.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div>
                              <span className="text-white font-medium text-sm">{dim.label}</span>
                              {dim.key === "virality" && (
                                <Badge className="ml-2 text-[10px] bg-amber-400/20 text-amber-400 border-amber-400/30">Composite</Badge>
                              )}
                            </div>
                            <Switch
                              checked={isActive}
                              onCheckedChange={(v) => updateThreshold.mutate({ brandId: activeBrandId!, dimension: dim.key, isActive: v })}
                            />
                          </div>
                          <p className="text-white/40 text-xs mb-3">{dim.description}</p>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-white/60 text-xs">Minimum Score</span>
                              <span className={`text-sm font-bold ${dim.color}`}>{minScore}/10</span>
                            </div>
                            <Slider
                              min={1} max={10} step={1}
                              value={[minScore]}
                              disabled={!isActive}
                              onValueCommit={([v]) => updateThreshold.mutate({ brandId: activeBrandId!, dimension: dim.key, minScore: v })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-white/30">
                              <span>1 — Lenient</span>
                              <span>10 — Strict</span>
                            </div>
                          </div>

                          {dim.key !== "virality" && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-white/40 text-xs">Weight in Virality:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3].map((w) => (
                                  <button key={w}
                                    onClick={() => updateThreshold.mutate({ brandId: activeBrandId!, dimension: dim.key, weight: w })}
                                    className={`w-6 h-6 rounded text-xs font-bold transition-all ${weight >= w ? `${dim.bg} ${dim.color} border ${dim.border}` : "bg-white/5 text-white/30"}`}>
                                    {w}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Rules Tab ── */}
          <TabsContent value="rules" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs">{rules.length} rules active</p>
              <Button size="sm" onClick={() => setShowAddRule(!showAddRule)}
                className="bg-[#3AC1EC]/20 text-[#3AC1EC] border border-[#3AC1EC]/30 hover:bg-[#3AC1EC]/30 text-xs h-8">
                <Plus className="w-3 h-3 mr-1" /> Add Rule
              </Button>
            </div>

            {showAddRule && (
              <Card className="bg-white/5 border-[#3AC1EC]/30">
                <CardContent className="p-4 space-y-3">
                  <p className="text-white text-sm font-medium">New Inspection Rule</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newRule.ruleType} onValueChange={(v) => setNewRule(p => ({ ...p, ruleType: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={newRule.severity} onValueChange={(v) => setNewRule(p => ({ ...p, severity: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error (blocks)</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="info">Info only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Rule value (e.g. no em-dashes, no **, max 1800 chars...)"
                    value={newRule.ruleValue}
                    onChange={(e) => setNewRule(p => ({ ...p, ruleValue: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" />
                  <Input placeholder="Platform (leave blank for all platforms)"
                    value={newRule.platform}
                    onChange={(e) => setNewRule(p => ({ ...p, platform: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" />
                  <div className="flex items-center gap-2">
                    <Switch checked={newRule.autoFix} onCheckedChange={(v) => setNewRule(p => ({ ...p, autoFix: v }))} />
                    <span className="text-white/60 text-xs">Enable auto-fix</span>
                  </div>
                  {newRule.autoFix && (
                    <Input placeholder="Auto-fix instruction (e.g. Replace em-dashes with commas)"
                      value={newRule.autoFixInstruction}
                      onChange={(e) => setNewRule(p => ({ ...p, autoFixInstruction: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white text-xs h-9" />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => createRule.mutate({ brandId: activeBrandId!, ruleType: newRule.ruleType as any, name: newRule.ruleValue.substring(0, 50), ruleValue: newRule.ruleValue, platform: newRule.platform || undefined, severity: newRule.severity as any, autoFix: newRule.autoFix })}
                      className="bg-[#3AC1EC] text-[#0A1931] text-xs h-8 flex-1">Save Rule</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddRule(false)} className="text-xs h-8 border-white/10">Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Default rules hint */}
            {rules.length === 0 && (
              <Card className="bg-white/3 border-white/10">
                <CardContent className="p-6 text-center">
                  <Info className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">No rules yet. Add rules to guide the AI Inspector.</p>
                  <p className="text-white/25 text-xs mt-1">Examples: "no em-dashes", "no ** markdown", "no phrases like 'game-changer'"</p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {rules.map((rule: any) => (
                <Card key={rule.id} className={`border ${rule.isActive ? "border-white/10" : "border-white/5 opacity-50"} bg-white/3`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Switch checked={rule.isActive}
                      onCheckedChange={(v) => toggleRule.mutate({ id: rule.id, isActive: v })} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-xs font-medium truncate">{rule.ruleValue}</span>
                        <Badge className={`text-[10px] flex-shrink-0 ${rule.severity === "error" ? "bg-red-500/20 text-red-400 border-red-500/30" : rule.severity === "warning" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}`}>
                          {rule.severity}
                        </Badge>
                        {rule.platform && <Badge className="text-[10px] bg-white/10 text-white/60 border-white/10">{rule.platform}</Badge>}
                        {rule.autoFix && <Badge className="text-[10px] bg-emerald-500/20 text-emerald-400 border-emerald-500/30">auto-fix</Badge>}
                      </div>
                      <p className="text-white/30 text-[10px] mt-0.5">{rule.ruleType.replace(/_/g, " ")}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule.mutate({ id: rule.id })}
                      className="text-white/30 hover:text-red-400 p-1 h-7 w-7 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Learning Engine Tab ── */}
          <TabsContent value="accuracy" className="space-y-4 mt-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Virality Prediction Accuracy
                </CardTitle>
                <CardDescription className="text-white/50 text-xs">
                  The learning engine compares Virality Score predictions against actual post performance. 
                  As more posts are published and performance data is logged, predictions become more accurate over time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accuracy ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{accuracy.accuracy}%</p>
                      <p className="text-white/40 text-xs mt-1">Prediction Accuracy</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white">{accuracy.totalPredictions}</p>
                      <p className="text-white/40 text-xs mt-1">Total Predictions</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-[#3AC1EC]">{accuracy.resolvedPredictions}</p>
                      <p className="text-white/40 text-xs mt-1">Resolved (vs. actual)</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-white/60">{accuracy.avgError}</p>
                      <p className="text-white/40 text-xs mt-1">Avg. Prediction Error</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Zap className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">No prediction data yet</p>
                    <p className="text-white/25 text-xs mt-1">Run the pipeline and publish content to start building the learning model</p>
                  </div>
                )}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-white/60 text-xs font-medium mb-2">How the Learning Engine Works</p>
                  <div className="space-y-2">
                    {[
                      { icon: CheckCircle2, color: "text-emerald-400", text: "Every generated content package receives a Virality Score prediction (1–100)" },
                      { icon: TrendingUp, color: "text-[#3AC1EC]", text: "When you log actual performance data (views, likes, shares) for published posts, the engine compares prediction vs. reality" },
                      { icon: Brain, color: "text-purple-400", text: "Weekly, the model recalibrates — patterns that consistently outperform get weighted higher in future predictions" },
                      { icon: AlertCircle, color: "text-amber-400", text: "The prediction accuracy score improves over time as more data is collected" },
                    ].map(({ icon: Icon, color, text }, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Icon className={`w-3.5 h-3.5 ${color} flex-shrink-0 mt-0.5`} />
                        <p className="text-white/40 text-xs">{text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
