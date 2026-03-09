import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Copy, RefreshCw, Sparkles, Rocket, Image, FileText, CheckCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0077B5", instagram: "#E1306C", webflow: "#4353FF",
  wechat: "#07C160", facebook: "#1877F2", tiktok: "#000000",
};

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const { activeBrandId, setActiveBrandId } = useBrand();
  const utils = trpc.useUtils();
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);

  // Parse id: could be "idea-123" or just "123"
  const isIdeaRef = id?.startsWith("idea-");
  const ideaId = isIdeaRef ? parseInt(id!.replace("idea-", "")) : null;
  const packageId = !isIdeaRef ? parseInt(id!) : null;

  const { data: pkg, isLoading, refetch } = isIdeaRef
    ? trpc.content.getPackage.useQuery({ ideaId: ideaId! }, { enabled: !!ideaId })
    : trpc.content.getPackageById.useQuery({ id: packageId! }, { enabled: !!packageId });

  // Fetch idea directly so we can show info even when package is empty/stuck
  const { data: idea } = trpc.idea.get.useQuery({ id: ideaId! }, { enabled: !!ideaId && isIdeaRef === true });
  const [retrying, setRetrying] = useState(false);

  const generateVariants = trpc.content.generate.useMutation();
  const generateImages = trpc.content.generateImage.useMutation();
  const approveVariant = trpc.content.updateVariant.useMutation({ onSuccess: () => refetch() });
  const schedulePublish = trpc.publishing.createJob.useMutation({
    onSuccess: () => { toast.success("Scheduled for publishing!"); utils.publishing.stats.invalidate(); }
  });

  const handleGenerateVariants = async () => {
    if (!pkg) return;
    // generate uses ideaId, so we need the ideaId from the package
    setGeneratingVariants(true);
    try {
      await generateVariants.mutateAsync({ ideaId: pkg.ideaId });
      toast.success("Platform variants generated!");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate variants");
    } finally {
      setGeneratingVariants(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!pkg) return;
    setGeneratingImages(true);
    try {
      await generateImages.mutateAsync({ contentPackageId: pkg.id });
      toast.success("Image prompts generated!");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to generate images");
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleSchedule = async (variantId: number, platform: string) => {
    if (!activeBrandId || !pkg) return;
    try {
      await schedulePublish.mutateAsync({ variantId, contentPackageId: pkg.id, platform, brandId: activeBrandId, actionType: "publish_now" });
      toast.success(`Queued for ${platform}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to schedule");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return (
      <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!pkg) {
    const handleRetryGenerate = async () => {
      if (!ideaId) return;
      setRetrying(true);
      try {
        await generateVariants.mutateAsync({ ideaId });
        toast.success("Content generation started! Refresh in a moment.");
        setTimeout(() => refetch(), 3000);
      } catch (e: any) {
        toast.error(e.message || "Failed to start generation");
      } finally {
        setRetrying(false);
      }
    };
    return (
      <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
        <div className="p-6 space-y-4">
          <Link href="/ideas">
            <Button variant="ghost" size="sm"><ArrowLeft size={14} className="mr-2" /> Back to Ideas</Button>
          </Link>
          {idea ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <h2 className="text-base font-bold text-foreground">{idea.title}</h2>
                {idea.angle && <p className="text-sm text-muted-foreground">{idea.angle}</p>}
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{idea.funnelStage}</Badge>
                  <Badge variant="outline" className="text-xs">{idea.status}</Badge>
                </div>
              </div>
              <div className="text-center py-8 text-muted-foreground space-y-3">
                <Sparkles size={32} className="mx-auto opacity-30" />
                <p className="text-sm">No content package yet. Click below to generate content for this idea.</p>
                <Button onClick={handleRetryGenerate} disabled={retrying} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                  {retrying ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
                  {retrying ? "Generating..." : "Generate Content Package"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <p className="text-sm">No content package found for this idea.</p>
              <Button asChild style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                <Link href="/ideas">Go to Ideas Board</Link>
              </Button>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  const variants = (pkg as any).variants || [];
  const assets = (pkg as any).assets || [];
  const isStuck = (pkg.status === 'needs_revision' || pkg.status === 'generating') && variants.length === 0 && !pkg.masterHook;

  const handleRetryFromPackage = async () => {
    setRetrying(true);
    try {
      await generateVariants.mutateAsync({ ideaId: pkg.ideaId });
      toast.success("Regenerating content package...");
      setTimeout(() => refetch(), 4000);
    } catch (e: any) {
      toast.error(e.message || "Failed to regenerate");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Stuck package banner */}
        {isStuck && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
            <p className="text-xs text-amber-400">This package has no content yet (generation failed previously). Click Regenerate to retry.</p>
            <Button size="sm" className="text-xs shrink-0" onClick={handleRetryFromPackage} disabled={retrying}
              style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              {retrying ? <RefreshCw size={12} className="mr-1 animate-spin" /> : <Sparkles size={12} className="mr-1" />}
              {retrying ? "Regenerating..." : "Regenerate"}
            </Button>
          </div>
        )}
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link href="/ideas">
              <Button variant="ghost" size="sm" className="h-9 px-2"><ArrowLeft size={14} className="mr-1" /> Ideas</Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight truncate">{pkg.masterHook || "Content Package"}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 status-${pkg.status}`}>{pkg.status}</Badge>
                <span className="text-[10px] text-muted-foreground">{new Date(pkg.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 min-h-[44px] text-xs" onClick={handleGenerateVariants} disabled={generatingVariants}>
              {generatingVariants ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Sparkles size={13} className="mr-1.5" />}
              {generatingVariants ? "Generating..." : "Generate Variants"}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 min-h-[44px] text-xs" onClick={handleGenerateImages} disabled={generatingImages}>
              {generatingImages ? <RefreshCw size={13} className="mr-1.5 animate-spin" /> : <Image size={13} className="mr-1.5" />}
              {generatingImages ? "Generating..." : "Images"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="bg-card border border-border w-max">
              <TabsTrigger value="overview" className="text-xs px-3"><FileText size={13} className="mr-1 hidden sm:inline" />Overview</TabsTrigger>
              <TabsTrigger value="blog" className="text-xs px-3"><FileText size={13} className="mr-1 hidden sm:inline" />Blog</TabsTrigger>
              <TabsTrigger value="variants" className="text-xs px-3"><Sparkles size={13} className="mr-1 hidden sm:inline" />Variants ({variants.length})</TabsTrigger>
              <TabsTrigger value="assets" className="text-xs px-3"><Image size={13} className="mr-1 hidden sm:inline" />Assets ({assets.length})</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-sm">Master Hook & Angle</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hook</p>
                    <p className="text-sm text-foreground font-medium">{pkg.masterHook || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Angle</p>
                    <p className="text-sm text-foreground">{pkg.masterAngle || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CTA</p>
                    <p className="text-sm text-foreground">{pkg.cta || "—"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border bg-card">
                <CardHeader><CardTitle className="text-sm">Key Points</CardTitle></CardHeader>
                <CardContent>
                  {pkg.keyPoints && Array.isArray(pkg.keyPoints) && pkg.keyPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {(pkg.keyPoints as string[]).map((kp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5" style={{ background: "#3AC1EC" }}>{i + 1}</span>
                          {kp}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-muted-foreground">No key points yet. Generate content to populate.</p>}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Blog Post */}
          <TabsContent value="blog" className="mt-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Blog Article</CardTitle>
                  {pkg.blogContent && (
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(pkg.blogContent || "")}>
                      <Copy size={14} className="mr-1.5" /> Copy
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pkg.blogContent ? (
                  <Textarea value={pkg.blogContent} readOnly rows={20} className="font-mono text-xs resize-none bg-background/50" />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm mb-3">No blog content yet.</p>
                    <Button onClick={handleGenerateVariants} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                      <Sparkles size={14} className="mr-2" /> Generate Content
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Variants */}
          <TabsContent value="variants" className="mt-4">
            {variants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">No platform variants yet.</p>
                <Button onClick={handleGenerateVariants} disabled={generatingVariants} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                  {generatingVariants ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Sparkles size={14} className="mr-2" />}
                  Generate Platform Variants
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {variants.map((v: any) => (
                  <Card key={v.id} className="border-border bg-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PLATFORM_COLORS[v.platform] || "#3AC1EC" }} />
                          <span className="text-sm font-medium capitalize">{v.platform}</span>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 status-${v.status}`}>{v.status}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(v.caption || v.body || "")}>
                            <Copy size={11} />
                          </Button>
                          {v.status !== "approved" && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-green-400" onClick={() => approveVariant.mutate({ id: v.id })}>
                              <CheckCircle size={11} />
                            </Button>
                          )}
                          {v.status === "approved" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary px-2" onClick={() => handleSchedule(v.id, v.platform)}>
                              <Rocket size={10} className="mr-1" /> Queue
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Textarea value={v.caption || v.body || v.content || ""} readOnly rows={6} className="text-xs resize-none bg-background/50" />
                      {v.hashtags && Array.isArray(v.hashtags) && v.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(v.hashtags as string[]).slice(0, 8).map((h: string) => (
                            <span key={h} className="text-[10px] text-primary/70">#{h}</span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Assets */}
          <TabsContent value="assets" className="mt-4">
            {assets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Image size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm mb-3">No image assets yet.</p>
                <Button onClick={handleGenerateImages} disabled={generatingImages} style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                  {generatingImages ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <Image size={14} className="mr-2" />}
                  Generate Image Assets
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assets.map((a: any) => (
                  <Card key={a.id} className="border-border bg-card overflow-hidden">
                    {a.url ? (
                      <img src={a.url} alt={a.altText || "Asset"} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-secondary flex items-center justify-center">
                        <Image size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{a.assetType} · {a.platform || "all"}</p>
                      {a.promptUsed && <p className="text-[10px] text-muted-foreground/60 mt-1 line-clamp-2">{a.promptUsed}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
