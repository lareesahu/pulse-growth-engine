import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Brain, Image, Video, Zap, Star, Cpu } from "lucide-react";

// ─── Model Catalogue ──────────────────────────────────────────────────────────
const TEXT_MODELS = [
  { id: "doubao-1-5-pro-32k-250115",   label: "Doubao 1.5 Pro 32K",     tier: "recommended", note: "Best balance of quality & speed" },
  { id: "doubao-1-5-pro-256k-250115",  label: "Doubao 1.5 Pro 256K",    tier: "high",        note: "Very long context window" },
  { id: "deepseek-v3-250324",          label: "DeepSeek V3.2",          tier: "high",        note: "Strong reasoning, open-source" },
  { id: "doubao-seed-2-0-pro",         label: "Doubao Seed 2.0 Pro",    tier: "high",        note: "Latest Doubao flagship" },
  { id: "doubao-seed-2-0-lite",        label: "Doubao Seed 2.0 Lite",   tier: "fast",        note: "Faster, lower cost" },
  { id: "doubao-1-5-lite-32k-250115",  label: "Doubao 1.5 Lite 32K",   tier: "fast",        note: "Fastest text model" },
  { id: "qwen3-32b-250428",            label: "Qwen3 32B",              tier: "high",        note: "Strong multilingual" },
  { id: "qwen3-8b-250428",             label: "Qwen3 8B",               tier: "fast",        note: "Lightweight Qwen" },
  { id: "kimi-k2-250711",              label: "Kimi K2",                tier: "high",        note: "Moonshot AI flagship" },
  { id: "glm-4-5-air-250414",          label: "GLM-4.5 Air",            tier: "fast",        note: "Zhipu AI, fast & capable" },
];

const IMAGE_MODELS = [
  { id: "doubao-seedream-3-0-t2i-250415", label: "Seedream 3.0",    tier: "recommended", note: "Fast, great quality (default)" },
  { id: "doubao-seedream-4-0-250828",     label: "Seedream 4.0",    tier: "high",        note: "Highest quality, slower" },
  { id: "doubao-seedream-5-0-lite",       label: "Seedream 5.0 Lite", tier: "fast",      note: "Fastest image generation" },
];

const VIDEO_MODELS = [
  { id: "doubao-seedance-1-0-lite-t2v-250428", label: "Seedance 1.0 Lite",  tier: "recommended", note: "Fast video, good quality (default)" },
  { id: "doubao-seedance-1-0-pro-250528",      label: "Seedance 1.0 Pro",   tier: "high",        note: "Highest quality video" },
  { id: "doubao-seedance-2-0-pro",             label: "Seedance 2.0 Pro",   tier: "high",        note: "Latest flagship video model" },
  { id: "doubao-seedance-1-5-pro-250614",      label: "Seedance 1.5 Pro",   tier: "high",        note: "Balanced quality & speed" },
];

const TIER_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  recommended: { label: "Recommended", variant: "default" },
  high:        { label: "High Quality", variant: "secondary" },
  fast:        { label: "Fast",         variant: "outline" },
};

function ModelSelect({
  models,
  value,
  onChange,
}: {
  models: typeof TEXT_MODELS;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select model..." />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => {
          const tier = TIER_BADGE[m.tier];
          return (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex items-center gap-2 w-full">
                <span className="flex-1">{m.label}</span>
                <Badge variant={tier.variant} className="text-[10px] px-1.5 py-0 ml-auto shrink-0">
                  {tier.label}
                </Badge>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export default function AIModelSettings() {
  const { data: current, isLoading } = trpc.modelSettings.get.useQuery();
  const saveMutation = trpc.modelSettings.save.useMutation({
    onSuccess: () => toast.success("Model settings saved"),
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const [textModel, setTextModel] = useState("");
  const [zhTextModel, setZhTextModel] = useState("");
  const [imageModel, setImageModel] = useState("");
  const [videoModel, setVideoModel] = useState("");

  useEffect(() => {
    if (current) {
      setTextModel(current.textModel);
      setZhTextModel((current as any).zhTextModel || "doubao-1-5-pro-32k-250115");
      setImageModel(current.imageModel);
      setVideoModel(current.videoModel);
    }
  }, [current]);

  const handleSave = () => {
    saveMutation.mutate({ textModel, zhTextModel, imageModel, videoModel } as any);
  };

  const getModelNote = (models: typeof TEXT_MODELS, id: string) =>
    models.find((m) => m.id === id)?.note ?? "";

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Model Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose which Doubao/Ark models power each part of the pipeline. Changes take effect immediately for all new runs.
          </p>
        </div>

        {/* Text Model */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain size={18} className="text-primary" />
              <CardTitle className="text-base">Text Generation</CardTitle>
            </div>
            <CardDescription>
              Used for idea generation, blog articles, social captions, and all written content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Active model</Label>
            {isLoading ? (
              <div className="h-10 bg-muted rounded animate-pulse" />
            ) : (
              <ModelSelect models={TEXT_MODELS} value={textModel} onChange={setTextModel} />
            )}
            {textModel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu size={12} /> {getModelNote(TEXT_MODELS, textModel)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Image Model */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Image size={18} className="text-primary" />
              <CardTitle className="text-base">Image Generation</CardTitle>
            </div>
            <CardDescription>
              Used when generating visual assets for content packages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Active model</Label>
            {isLoading ? (
              <div className="h-10 bg-muted rounded animate-pulse" />
            ) : (
              <ModelSelect models={IMAGE_MODELS} value={imageModel} onChange={setImageModel} />
            )}
            {imageModel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu size={12} /> {getModelNote(IMAGE_MODELS, imageModel)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Video Model */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Video size={18} className="text-primary" />
              <CardTitle className="text-base">Video Generation</CardTitle>
            </div>
            <CardDescription>
              Used for short-form video content. Switch to Seedance 2.0 Pro for highest quality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Active model</Label>
            {isLoading ? (
              <div className="h-10 bg-muted rounded animate-pulse" />
            ) : (
              <ModelSelect models={VIDEO_MODELS} value={videoModel} onChange={setVideoModel} />
            )}
            {videoModel && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu size={12} /> {getModelNote(VIDEO_MODELS, videoModel)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading} className="gap-2">
            <Zap size={14} />
            {saveMutation.isPending ? "Saving..." : "Save Model Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
