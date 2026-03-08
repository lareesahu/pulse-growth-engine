import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Copy, ExternalLink, RefreshCw, Loader2,
  MessageSquare, Globe, Linkedin, TrendingUp, CheckCheck,
  ChevronDown, ChevronUp, Sparkles, Filter
} from "lucide-react";

const PLATFORM_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reddit: { label: "Reddit", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  quora: { label: "Quora", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  linkedin: { label: "LinkedIn", color: "text-[#3AC1EC]", bg: "bg-[#3AC1EC]/10", border: "border-[#3AC1EC]/20" },
};

interface Opportunity {
  platform: string;
  title: string;
  url: string;
  snippet: string;
  keyword: string;
  suggestedReply: string;
  status: string;
}

export default function ForumOpportunities() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["all"]);
  const [hasScanned, setHasScanned] = useState(false);

  const scanMutation = trpc.forum.scan.useMutation({
    onSuccess: (data: any) => {
      setOpportunities(data.opportunities ?? []);
      setHasScanned(true);
      if (data.count === 0) {
        toast.info("No opportunities found — try again later or check your brand keywords");
      } else {
        toast.success(`Found ${data.count} forum opportunities with AI-drafted replies`);
      }
    },
    onError: (err: any) => {
      toast.error("Scan failed: " + err.message);
    },
  });

  const handleScan = () => {
    if (!activeBrandId) return toast.error("Select a brand first");
    scanMutation.mutate({
      brandId: activeBrandId,
      platforms: selectedPlatforms as any,
      forceRefresh: true,
    });
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Reply copied to clipboard");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const togglePlatform = (platform: string) => {
    if (platform === "all") {
      setSelectedPlatforms(["all"]);
    } else {
      const current = selectedPlatforms.filter(p => p !== "all");
      if (current.includes(platform)) {
        const next = current.filter(p => p !== platform);
        setSelectedPlatforms(next.length === 0 ? ["all"] : next);
      } else {
        setSelectedPlatforms([...current, platform]);
      }
    }
  };

  const filteredOpps = selectedPlatforms.includes("all")
    ? opportunities
    : opportunities.filter(o => selectedPlatforms.includes(o.platform));

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Forum Opportunities
            </h1>
            <p className="text-sm text-white/40 mt-0.5">
              Caelum finds relevant discussions and drafts replies for you to copy and post
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={scanMutation.isPending || !activeBrandId}
            className="bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 h-10 gap-2 flex-shrink-0"
          >
            {scanMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</>
            ) : (
              <><Search className="w-4 h-4" /> Scan Now</>
            )}
          </Button>
        </div>

        {/* Platform Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          {["all", "reddit", "quora", "linkedin"].map(platform => {
            const isActive = selectedPlatforms.includes(platform);
            const cfg = platform === "all" ? null : PLATFORM_CONFIG[platform];
            return (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? platform === "all"
                      ? "bg-white/10 text-white border-white/20"
                      : `${cfg?.bg} ${cfg?.color} ${cfg?.border}`
                    : "bg-transparent text-white/30 border-white/10 hover:border-white/20"
                }`}
              >
                {platform === "all" ? "All Platforms" : PLATFORM_CONFIG[platform].label}
              </button>
            );
          })}
          {opportunities.length > 0 && (
            <span className="text-white/30 text-xs ml-auto">
              {filteredOpps.length} of {opportunities.length} shown
            </span>
          )}
        </div>

        {/* Empty / Loading State */}
        {!hasScanned && !scanMutation.isPending && (
          <Card className="bg-white/3 border-white/10">
            <CardContent className="p-10 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Find Your Audience Where They Already Are</p>
                <p className="text-white/40 text-sm mt-1 max-w-sm">
                  Caelum scans Reddit, Quora, and LinkedIn for discussions relevant to {activeBrand?.name ?? "your brand"}, then drafts a genuine, helpful reply for each one. You just copy and paste.
                </p>
              </div>
              <Button
                onClick={handleScan}
                disabled={!activeBrandId}
                className="bg-amber-500 hover:bg-amber-500/90 text-black font-bold gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>
        )}

        {scanMutation.isPending && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="bg-white/3 border-white/10 animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-5 bg-white/10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-full" />
                      <div className="h-3 bg-white/5 rounded w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <p className="text-center text-white/30 text-sm animate-pulse">
              Caelum is scanning forums and drafting replies...
            </p>
          </div>
        )}

        {/* Opportunity Cards */}
        {hasScanned && !scanMutation.isPending && filteredOpps.length === 0 && (
          <Card className="bg-white/3 border-white/10">
            <CardContent className="p-8 text-center">
              <p className="text-white/40 text-sm">No opportunities found for the selected platforms. Try scanning again or broaden your brand keywords in the Brand Workspace.</p>
              <Button onClick={handleScan} variant="ghost" className="mt-4 text-amber-400 gap-2">
                <RefreshCw className="w-4 h-4" /> Scan Again
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredOpps.map((opp, idx) => {
          const cfg = PLATFORM_CONFIG[opp.platform] ?? PLATFORM_CONFIG.reddit;
          const isExpanded = expandedIdx === idx;
          return (
            <Card key={idx} className={`border transition-all ${isExpanded ? "border-white/20 bg-white/5" : "border-white/10 bg-white/3 hover:border-white/15"}`}>
              <CardContent className="p-4 space-y-3">
                {/* Card Header */}
                <div className="flex items-start gap-3">
                  <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-[10px] flex-shrink-0 mt-0.5`}>
                    {cfg.label}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-snug line-clamp-2">{opp.title}</p>
                    <p className="text-white/35 text-xs mt-1 line-clamp-2">{opp.snippet}</p>
                  </div>
                </div>

                {/* Keyword tag */}
                <div className="flex items-center gap-2">
                  <span className="text-white/20 text-[10px]">Matched keyword:</span>
                  <span className="text-[#3AC1EC] text-[10px] bg-[#3AC1EC]/10 px-2 py-0.5 rounded-full">{opp.keyword}</span>
                </div>

                {/* Suggested Reply Preview */}
                {opp.suggestedReply && (
                  <div className={`rounded-lg p-3 border ${cfg.border} ${cfg.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
                        Caelum's Suggested Reply
                      </p>
                      <button
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className={`text-white/70 text-xs leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}>
                      {opp.suggestedReply}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {opp.suggestedReply && (
                    <Button
                      onClick={() => handleCopy(opp.suggestedReply, idx)}
                      className={`${cfg.bg} ${cfg.color} ${cfg.border} border hover:opacity-80 text-xs h-8 gap-1.5 flex-1 sm:flex-none`}
                    >
                      {copiedIdx === idx ? (
                        <><CheckCheck className="w-3.5 h-3.5" /> Copied!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy Reply</>
                      )}
                    </Button>
                  )}
                  {opp.url && (
                    <Button
                      onClick={() => window.open(opp.url, "_blank")}
                      variant="ghost"
                      className="text-white/30 hover:text-white/60 text-xs h-8 gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Thread
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Rescan footer */}
        {hasScanned && filteredOpps.length > 0 && (
          <div className="flex items-center justify-center pt-2">
            <Button
              onClick={handleScan}
              variant="ghost"
              disabled={scanMutation.isPending}
              className="text-white/30 hover:text-white/60 text-xs gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Opportunities
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
