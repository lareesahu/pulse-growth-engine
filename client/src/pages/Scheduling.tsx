import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar, Clock, Globe, Linkedin, Instagram, Trash2, RefreshCw,
  Settings2, List, CalendarDays, CheckCircle, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Plus, Zap
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "webflow",   label: "Webflow Blog",  icon: Globe,     color: "#4353FF" },
  { id: "linkedin",  label: "LinkedIn",       icon: Linkedin,  color: "#0077B5" },
  { id: "instagram", label: "Instagram",      icon: Instagram, color: "#E1306C" },
  { id: "wechat",    label: "WeChat",         icon: Globe,     color: "#07C160" },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMEZONES = [
  "Australia/Sydney", "Australia/Melbourne", "Asia/Singapore", "Asia/Shanghai",
  "America/New_York", "America/Los_Angeles", "Europe/London", "UTC",
];

function PlatformIcon({ platform, size = 14 }: { platform: string; size?: number }) {
  const p = PLATFORMS.find(x => x.id === platform);
  if (!p) return <Globe size={size} />;
  const Icon = p.icon;
  return <Icon size={size} style={{ color: p.color }} />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:    { label: "Scheduled",  className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    publishing: { label: "Publishing", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    published:  { label: "Published",  className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    failed:     { label: "Failed",     className: "bg-red-500/15 text-red-400 border-red-500/30" },
    cancelled:  { label: "Cancelled",  className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  };
  const s = map[status] ?? map.pending;
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.className}`}>{s.label}</Badge>;
}

// ─── Schedule Settings Panel ──────────────────────────────────────────────────
function ScheduleSettingsPanel({ brandId }: { brandId: number }) {
  const utils = trpc.useUtils();
  const { data: schedules = [] } = trpc.scheduling.getSchedules.useQuery({ brandId });
  const upsert = trpc.scheduling.upsertSchedule.useMutation({
    onSuccess: () => { utils.scheduling.getSchedules.invalidate(); toast.success("Schedule saved"); },
    onError: (e) => toast.error(e.message),
  });

  // Local state for each platform's form
  const [forms, setForms] = useState<Record<string, any>>({});

  function getForm(platform: string) {
    const saved = schedules.find(s => s.platform === platform);
    const local = forms[platform];
    return {
      enabled:             local?.enabled             ?? saved?.enabled             ?? true,
      bestPushTime:        local?.bestPushTime        ?? saved?.bestPushTime        ?? "09:00",
      timezone:            local?.timezone            ?? saved?.timezone            ?? "Australia/Sydney",
      cadenceType:         local?.cadenceType         ?? saved?.cadenceType         ?? "weekly",
      cadenceDays:         local?.cadenceDays         ?? saved?.cadenceDays         ?? [1, 4], // Mon+Thu
      cadenceDayOfMonth:   local?.cadenceDayOfMonth   ?? saved?.cadenceDayOfMonth   ?? 1,
      cadenceIntervalDays: local?.cadenceIntervalDays ?? saved?.cadenceIntervalDays ?? 7,
      autoSchedule:        local?.autoSchedule        ?? saved?.autoSchedule        ?? false,
    };
  }

  function setField(platform: string, field: string, value: any) {
    setForms(prev => ({ ...prev, [platform]: { ...getForm(platform), [field]: value } }));
  }

  function toggleDay(platform: string, day: number) {
    const form = getForm(platform);
    const days: number[] = form.cadenceDays ?? [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setField(platform, "cadenceDays", next);
  }

  function save(platform: string) {
    const form = getForm(platform);
    upsert.mutate({ brandId, platform, ...form });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Platform Schedules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Set the cadence and optimal push time for each platform. Approved content will be dripped out on this schedule.</p>
        </div>
      </div>
      {PLATFORMS.map(platform => {
        const form = getForm(platform.id);
        const Icon = platform.icon;
        return (
          <Card key={platform.id} className="border-border/50 bg-card/50">
            <CardHeader className="pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${platform.color}20`, border: `1px solid ${platform.color}40` }}>
                    <Icon size={16} style={{ color: platform.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{platform.label}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {form.cadenceType === "daily" ? "Every day" :
                       form.cadenceType === "weekly" ? `${(form.cadenceDays as number[]).map(d => DAYS_OF_WEEK[d]).join(", ")} weekly` :
                       form.cadenceType === "monthly" ? `Day ${form.cadenceDayOfMonth} monthly` :
                       `Every ${form.cadenceIntervalDays} days`}
                      {" · "}{form.bestPushTime} {form.timezone.split("/")[1]?.replace("_", " ")}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.enabled}
                  onCheckedChange={v => setField(platform.id, "enabled", v)}
                />
              </div>
            </CardHeader>
            {form.enabled && (
              <CardContent className="px-4 pb-4 space-y-3">
                <Separator className="mb-3" />
                {/* Cadence type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Cadence</label>
                    <Select value={form.cadenceType} onValueChange={v => setField(platform.id, "cadenceType", v)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly (pick days)</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom interval</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Best push time</label>
                    <Input
                      type="time"
                      value={form.bestPushTime}
                      onChange={e => setField(platform.id, "bestPushTime", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Weekly day picker */}
                {form.cadenceType === "weekly" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium mb-1.5 block">Publish days</label>
                    <div className="flex gap-1.5">
                      {DAYS_OF_WEEK.map((day, i) => {
                        const active = (form.cadenceDays as number[]).includes(i);
                        return (
                          <button
                            key={day}
                            onClick={() => toggleDay(platform.id, i)}
                            className={`w-9 h-9 rounded-lg text-[11px] font-medium transition-all border ${
                              active
                                ? "text-white border-transparent"
                                : "text-muted-foreground border-border/50 hover:border-border"
                            }`}
                            style={active ? { background: platform.color, borderColor: platform.color } : {}}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monthly day picker */}
                {form.cadenceType === "monthly" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Day of month</label>
                    <Input
                      type="number"
                      min={1} max={28}
                      value={form.cadenceDayOfMonth}
                      onChange={e => setField(platform.id, "cadenceDayOfMonth", parseInt(e.target.value))}
                      className="h-8 text-xs w-24"
                    />
                  </div>
                )}

                {/* Custom interval */}
                {form.cadenceType === "custom" && (
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Every N days</label>
                    <Input
                      type="number"
                      min={1} max={365}
                      value={form.cadenceIntervalDays}
                      onChange={e => setField(platform.id, "cadenceIntervalDays", parseInt(e.target.value))}
                      className="h-8 text-xs w-24"
                    />
                  </div>
                )}

                {/* Timezone */}
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Timezone</label>
                  <Select value={form.timezone} onValueChange={v => setField(platform.id, "timezone", v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-schedule toggle */}
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className={form.autoSchedule ? "text-amber-400" : "text-muted-foreground"} />
                    <div>
                      <p className="text-xs font-medium text-foreground">Auto-schedule on approval</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">When content is approved, automatically queue it to the next available slot on this platform</p>
                    </div>
                  </div>
                  <Switch
                    checked={form.autoSchedule}
                    onCheckedChange={v => setField(platform.id, "autoSchedule", v)}
                  />
                </div>

                <Button
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => save(platform.id)}
                  disabled={upsert.isPending}
                >
                  Save
                </Button>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Queue Panel ──────────────────────────────────────────────────────────────
function QueuePanel({ brandId }: { brandId: number }) {
  const utils = trpc.useUtils();
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const { data: posts = [], isLoading } = trpc.scheduling.getScheduledPosts.useQuery({
    brandId,
    platform: filterPlatform === "all" ? undefined : filterPlatform,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const scheduleAll = trpc.scheduling.scheduleAllApproved.useMutation({
    onSuccess: (r) => {
      utils.scheduling.getScheduledPosts.invalidate();
      toast.success(`Scheduled ${r.scheduled} posts across all platforms`);
    },
    onError: (e) => toast.error(e.message),
  });

  const cancel = trpc.scheduling.cancelPost.useMutation({
    onSuccess: () => { utils.scheduling.getScheduledPosts.invalidate(); toast.success("Post cancelled"); },
  });

  const del = trpc.scheduling.deletePost.useMutation({
    onSuccess: () => { utils.scheduling.getScheduledPosts.invalidate(); toast.success("Post removed"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Schedule Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{posts.length} posts in queue</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="h-7 text-xs w-32">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-xs w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => scheduleAll.mutate({ brandId })}
            disabled={scheduleAll.isPending}
          >
            <Zap size={12} />
            Auto-schedule approved
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar size={32} className="text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No posts scheduled yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Configure platform schedules, then click "Auto-schedule approved" to fill the queue</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post: any) => {
            const scheduledDate = new Date(post.scheduledAt);
            const isOverdue = post.status === "pending" && scheduledDate < new Date();
            return (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-card/60 transition-colors group"
              >
                {/* Platform icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-muted/30">
                  <PlatformIcon platform={post.platform} size={16} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{post.contentTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {scheduledDate.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {scheduledDate.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOverdue && <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-400 border-orange-500/30">Overdue</Badge>}
                  </div>
                </div>

                {/* Status */}
                <StatusBadge status={post.status} />

                {/* Actions */}
                {post.status === "pending" && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => cancel.mutate({ id: post.id })}>
                          <XCircle size={12} className="text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Cancel</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => del.mutate({ id: post.id })}>
                          <Trash2 size={12} className="text-muted-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────
function CalendarPanel({ brandId }: { brandId: number }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const startOfMonth = useMemo(() => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    return d;
  }, [currentDate]);

  const endOfMonth = useMemo(() => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  }, [currentDate]);

  const { data: posts = [] } = trpc.scheduling.getScheduledPosts.useQuery({
    brandId,
    platform: filterPlatform === "all" ? undefined : filterPlatform,
    from: startOfMonth,
    to: endOfMonth,
  });

  const postsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    posts.forEach((p: any) => {
      const d = new Date(p.scheduledAt).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(p);
    });
    return map;
  }, [posts]);

  // Build calendar grid
  const firstDow = startOfMonth.getDay(); // 0=Sun
  const daysInMonth = endOfMonth.getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === currentDate.getMonth();

  function prevMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {currentDate.toLocaleString("en-AU", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="h-7 text-xs w-36">
            <SelectValue placeholder="All platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          const dayPosts = day ? (postsByDay[day] ?? []) : [];
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <div
              key={i}
              className={`min-h-[72px] rounded-lg p-1.5 border transition-colors ${
                day
                  ? isToday
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/30 bg-card/30 hover:bg-card/50"
                  : "border-transparent bg-transparent"
              }`}
            >
              {day && (
                <>
                  <span className={`text-[11px] font-medium block mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((p: any) => {
                      const platform = PLATFORMS.find(x => x.id === p.platform);
                      return (
                        <Tooltip key={p.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center gap-1 rounded px-1 py-0.5 cursor-default truncate"
                              style={{ background: `${platform?.color ?? "#888"}20` }}
                            >
                              <PlatformIcon platform={p.platform} size={9} />
                              <span className="text-[9px] truncate" style={{ color: platform?.color ?? "#888" }}>
                                {p.contentTitle?.split(" ").slice(0, 3).join(" ")}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[200px]">
                            <p className="text-xs font-medium">{p.contentTitle}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(p.scheduledAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}{platform?.label}
                            </p>
                            <StatusBadge status={p.status} />
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <span className="text-[9px] text-muted-foreground px-1">+{dayPosts.length - 3} more</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 flex-wrap">
        {PLATFORMS.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="text-[10px] text-muted-foreground">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Scheduling() {
  const { activeBrandId: brandId } = useBrand();

  if (!brandId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">No brand selected. Go to Brand Workspace first.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3AC1EC22, #2163AF22)", border: "1px solid #3AC1EC40" }}>
            <CalendarDays size={20} className="text-[#3AC1EC]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Content Scheduling</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Set cadence per platform, queue approved content, and visualize your calendar</p>
          </div>
        </div>

        <Tabs defaultValue="settings">
          <TabsList className="mb-5 h-8">
            <TabsTrigger value="settings" className="text-xs gap-1.5 h-7">
              <Settings2 size={12} /> Schedule Settings
            </TabsTrigger>
            <TabsTrigger value="queue" className="text-xs gap-1.5 h-7">
              <List size={12} /> Queue
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs gap-1.5 h-7">
              <CalendarDays size={12} /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <ScheduleSettingsPanel brandId={brandId} />
          </TabsContent>

          <TabsContent value="queue">
            <QueuePanel brandId={brandId} />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarPanel brandId={brandId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
