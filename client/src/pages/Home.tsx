import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Rocket, BarChart3, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [bannerHeight, setBannerHeight] = useState(0);

  // Detect Manus billing banner and push page content below it
  useEffect(() => {
    const measure = () => {
      const mcr = document.querySelector('manus-content-root') as any;
      if (mcr?.shadowRoot) {
        const banner = mcr.shadowRoot.querySelector('.billing-banner') as HTMLElement | null;
        if (banner) {
          const rect = banner.getBoundingClientRect();
          if (rect.height > 0 && rect.top <= 4) { setBannerHeight(rect.height); return; }
        }
      }
      const root = document.getElementById('root');
      if (root) setBannerHeight(Math.max(0, Math.round(root.getBoundingClientRect().top)));
    };
    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1000);
    const obs = new ResizeObserver(measure);
    obs.observe(document.body);
    return () => { clearTimeout(t1); clearTimeout(t2); obs.disconnect(); };
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return null;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ marginTop: `${bannerHeight}px` }}>
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-base text-foreground">Pulse Content Engine</div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">by Pulse Branding</div>
          </div>
        </div>
        <Button asChild style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
          <a href={getLoginUrl()}>Sign In <ArrowRight size={14} className="ml-1" /></a>
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto py-20">
        {/* Glow orb */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #3AC1EC 0%, #2163AF 40%, transparent 70%)" }} />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles size={12} />
            Powered by Caelum Liu · AI Growth Officer
          </div>

          <h1 className="text-5xl font-bold text-foreground mb-4 leading-tight">
            Your autonomous<br />
            <span style={{ background: "linear-gradient(135deg, #3AC1EC, #56C4C4, #2163AF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              content growth engine
            </span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Generate, review, schedule, and publish brand content across all platforms — fully automated. Set it up once, let it run forever.
          </p>

          <Button asChild size="lg" className="text-base px-8 py-3" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <a href={getLoginUrl()}>Launch Engine <ArrowRight size={16} className="ml-2" /></a>
          </Button>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 w-full">
          {[
            { icon: <Brain size={20} />, title: "AI Idea Generation", desc: "Batch-generate 10–30 content ideas aligned to your brand DNA" },
            { icon: <Sparkles size={20} />, title: "Content Packages", desc: "Blog + social captions + image prompts generated in one click" },
            { icon: <Rocket size={20} />, title: "Multi-Platform", desc: "LinkedIn, Instagram, WeChat, Webflow — all from one queue" },
            { icon: <BarChart3 size={20} />, title: "Analytics", desc: "Track performance and get AI-powered content recommendations" },
          ].map((f, i) => (
            <div key={i} className="p-4 rounded-xl border border-border bg-card text-left">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 text-primary" style={{ background: "oklch(73% 0.17 210 / 0.15)" }}>
                {f.icon}
              </div>
              <div className="text-sm font-semibold text-foreground mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        Pulse Content Engine · Built by Pulse Branding · Operated by Caelum Liu, AI CGO
      </footer>
    </div>
  );
}
