import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3, BookOpen, Brain, ChevronDown, ChevronRight,
  Globe, LayoutDashboard, LogOut, Plus, Rocket, Settings,
  Sparkles, Zap,
} from "lucide-react";
import { useState } from "react";
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
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",       href: "/dashboard",    icon: <LayoutDashboard size={16} /> },
  { label: "Brand Workspace", href: "/workspace",    icon: <BookOpen size={16} /> },
  { label: "Ideas Board",     href: "/ideas",        icon: <Brain size={16} /> },
  { label: "Publishing",      href: "/publishing",   icon: <Rocket size={16} /> },
  { label: "Analytics",       href: "/analytics",    icon: <BarChart3 size={16} /> },
  { label: "Integrations",    href: "/integrations", icon: <Zap size={16} /> },
];

interface AppLayoutProps {
  children: React.ReactNode;
  brandId?: number;
  onBrandChange?: (id: number) => void;
}

export default function AppLayout({ children, brandId, onBrandChange }: AppLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: brands = [] } = trpc.brand.list.useQuery(undefined, { enabled: isAuthenticated });
  const currentBrand = brands.find(b => b.id === brandId) || brands[0];

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-60 border-r border-border p-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="flex-1 p-6"><Skeleton className="h-full w-full" /></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-sm">
          {/* Pulse Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">Pulse Content Engine</div>
              <div className="text-xs text-muted-foreground">by Pulse Branding</div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to access your autonomous content growth engine.</p>
          <Button asChild className="w-full" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
            <a href={getLoginUrl()}>Sign in to continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-border flex flex-col" style={{ background: "oklch(12% 0.045 268)" }}>
        {/* Logo */}
        <div className="p-4 border-b border-border">
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
        </div>

        {/* Brand Switcher */}
        {brands.length > 0 && (
          <div className="p-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-secondary transition-colors text-left">
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3AC1EC, #291C53)" }}>
                    {(currentBrand?.name || "P")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{currentBrand?.name || "Select Brand"}</div>
                    <div className="text-[10px] text-muted-foreground">Active workspace</div>
                  </div>
                  <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {brands.map(b => (
                  <DropdownMenuItem key={b.id} onClick={() => onBrandChange?.(b.id)} className="cursor-pointer">
                    <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0" style={{ background: "linear-gradient(135deg, #3AC1EC, #291C53)" }}>
                      {b.name[0].toUpperCase()}
                    </div>
                    <span className="truncate">{b.name}</span>
                    {b.id === currentBrand?.id && <ChevronRight size={12} className="ml-auto text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
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
                <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm cursor-pointer transition-all ${
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
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/20">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}>
              <Sparkles size={10} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-primary leading-tight">Caelum Liu · CGO</div>
              <div className="text-[9px] text-muted-foreground leading-tight">AI Growth Officer</div>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          </div>
        </div>

        {/* User */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
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
              <DropdownMenuItem asChild>
                <Link href="/integrations"><Settings size={14} className="mr-2" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                <LogOut size={14} className="mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
