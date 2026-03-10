import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, BookOpen, Brain, CheckCheck, ChevronDown, ChevronRight, Cpu,
  FileText, Globe, LayoutDashboard, LogOut, Menu, Plus, Rocket, Settings,
  Shield, Sparkles, TrendingUp, X, Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Skeleton } from "./ui/skeleton";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  mobileIcon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",       href: "/dashboard",    icon: <LayoutDashboard size={16} />, mobileIcon: <LayoutDashboard size={20} /> },
  { label: "Brand",           href: "/workspace",    icon: <BookOpen size={16} />,        mobileIcon: <BookOpen size={20} /> },
  { label: "Ideas",           href: "/ideas",        icon: <Brain size={16} />,           mobileIcon: <Brain size={20} /> },
  { label: "Content",         href: "/content",      icon: <FileText size={16} />,        mobileIcon: <FileText size={20} /> },
  { label: "Publishing",      href: "/publishing",   icon: <Rocket size={16} />,          mobileIcon: <Rocket size={20} /> },
  { label: "Analytics",       href: "/analytics",    icon: <BarChart3 size={16} />,       mobileIcon: <BarChart3 size={20} /> },
  { label: "Review",          href: "/review",       icon: <CheckCheck size={16} />,      mobileIcon: <CheckCheck size={20} /> },
  { label: "Forums",          href: "/forums",       icon: <TrendingUp size={16} />,      mobileIcon: <TrendingUp size={20} /> },
  { label: "Inspector",       href: "/inspector",    icon: <Shield size={16} />,          mobileIcon: <Shield size={20} /> },
  { label: "AI Models",       href: "/ai-models",    icon: <Cpu size={16} />,             mobileIcon: <Cpu size={20} /> },
  { label: "Settings",        href: "/integrations", icon: <Zap size={16} />,             mobileIcon: <Zap size={20} /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
  brandId?: number;
  onBrandChange?: (id: number) => void;
}

export default function AppLayout({ children, brandId, onBrandChange }: AppLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Detect Manus billing banner height and offset content accordingly.
  // The banner is a fixed div.billing-banner inside the <manus-content-root> shadow DOM.
  useEffect(() => {
    const measure = () => {
      let height = 0;
      // Primary: read from shadow DOM of manus-content-root
      const mcr = document.querySelector('manus-content-root');
      if (mcr?.shadowRoot) {
        const banner = mcr.shadowRoot.querySelector('.billing-banner') as HTMLElement | null;
        if (banner) {
          const rect = banner.getBoundingClientRect();
          // Only count it if it's visible (height > 0) and at the top of the screen
          if (rect.height > 0 && rect.top <= 4) {
            height = rect.height;
          }
        }
      }
      // Fallback: if #root is pushed down (older injection method)
      if (height === 0) {
        const appRoot = document.getElementById('root');
        if (appRoot) {
          const rect = appRoot.getBoundingClientRect();
          height = Math.max(0, Math.round(rect.top));
        }
      }
      setBannerHeight(height);
    };
    measure();
    // Re-measure on resize (banner can appear/disappear)
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    // Also poll briefly on mount in case shadow DOM isn't ready immediately
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 1000);
    return () => { observer.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const { data: brands = [] } = trpc.brand.list.useQuery(undefined, { enabled: isAuthenticated });
  const currentBrand = brands.find(b => b.id === brandId) || brands[0];

  // Pending review count for badge
  const activeBrandId = brandId || currentBrand?.id;
  const { data: reviewQueue = [] } = trpc.pipeline.getReviewQueue.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId && isAuthenticated, refetchInterval: 30000 }
  );
  const pendingReviewCount = reviewQueue.length;

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden md:flex w-60 border-r border-border p-4 space-y-3 flex-col">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex-1 p-4 md:p-6"><Skeleton className="h-full w-full" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-6">
        <div className="text-center space-y-6 w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-xl text-foreground">Pulse Content Engine</div>
              <div className="text-xs text-muted-foreground">by Pulse Branding</div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to access your autonomous content growth engine.</p>
          <Button asChild className="w-full h-12 text-base" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <a href={getLoginUrl()}>Sign in to continue</a>
          </Button>
        </div>
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Link href="/dashboard">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <div className="font-semibold text-sm text-foreground leading-tight">Pulse Content</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Growth Engine</div>
            </div>
          </div>
        </Link>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-secondary text-muted-foreground"
          onClick={() => setDrawerOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* Brand Switcher */}
      {brands.length > 0 && (
        <div className="p-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2.5 py-2.5 rounded-md hover:bg-secondary transition-colors text-left min-h-[44px]">
                <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3AC1EC, #291C53)" }}>
                  {(currentBrand?.name || "P")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{currentBrand?.name || "Select Brand"}</div>
                  <div className="text-[10px] text-muted-foreground">Active workspace</div>
                </div>
                <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {brands.map(b => (
                <DropdownMenuItem key={b.id} onClick={() => { onBrandChange?.(b.id); setDrawerOpen(false); }} className="cursor-pointer min-h-[44px]">
                  <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0" style={{ background: "linear-gradient(135deg, #3AC1EC, #291C53)" }}>
                    {b.name[0].toUpperCase()}
                  </div>
                  <span className="truncate">{b.name}</span>
                  {b.id === currentBrand?.id && <ChevronRight size={12} className="ml-auto text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="min-h-[44px]">
                <Link href="/workspace">
                  <Plus size={14} className="mr-2" /> Add Brand
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all min-h-[44px] ${
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
                <span className={isActive ? "text-primary" : ""}>{item.icon}</span>
                {item.label}
                {isActive && <div className="ml-auto w-1 h-4 rounded-full bg-primary" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Caelum Liu badge */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-md bg-primary/10 border border-primary/20">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <Sparkles size={11} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-primary leading-tight">Caelum Liu · CGO</div>
            <div className="text-[9px] text-muted-foreground leading-tight">AI Growth Officer</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-secondary transition-colors min-h-[44px]">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                {(user?.name || user?.email || "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-foreground truncate">{user?.name || "User"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</div>
              </div>
              <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem asChild className="min-h-[44px]">
              <Link href="/integrations"><Settings size={14} className="mr-2" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer min-h-[44px]">
              <LogOut size={14} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex bg-background overflow-hidden" style={{ height: `calc(100dvh - ${bannerHeight}px)`, marginTop: `${bannerHeight}px` }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 border-r border-border flex-col" style={{ background: "oklch(12% 0.045 268)" }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col border-r border-border transition-transform duration-300 ease-in-out md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "oklch(12% 0.045 268)" }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0" style={{ background: "oklch(12% 0.045 268)" }}>
          <button
            className="p-2 -ml-2 rounded-md hover:bg-secondary text-muted-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link href="/dashboard">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-semibold text-sm text-foreground">Pulse Content</span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] text-muted-foreground">Caelum</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* ── Mobile Bottom Tab Bar ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border flex items-center justify-around px-2" style={{ background: "oklch(12% 0.045 268)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Ideas */}
          {[{ label: "Ideas", href: "/ideas", icon: <Brain size={20} /> }, { label: "Content", href: "/content", icon: <FileText size={20} /> }].map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] min-w-[52px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  <span>{item.icon}</span>
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </div>
              </Link>
            );
          })}
          {/* Dashboard — big center button */}
          <Link href="/dashboard">
            <div className="flex flex-col items-center justify-center -mt-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                location === "/dashboard" || location === "/"
                  ? "bg-primary text-primary-foreground shadow-primary/40"
                  : "bg-primary/90 text-primary-foreground hover:bg-primary"
              }`} style={{ boxShadow: "0 0 20px oklch(70% 0.2 200 / 0.4)" }}>
                <LayoutDashboard size={24} />
              </div>
              <span className="text-[9px] font-medium mt-1 text-muted-foreground">Home</span>
            </div>
          </Link>
          {/* Review + Publishing */}
          {[{ label: "Review", href: "/review", icon: <CheckCheck size={20} />, badge: pendingReviewCount }, { label: "Publish", href: "/publishing", icon: <Rocket size={20} />, badge: 0 }].map(item => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[56px] min-w-[52px] transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  <span className="relative">
                    {item.icon}
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                  {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
