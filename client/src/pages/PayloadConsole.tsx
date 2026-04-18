import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { CheckCircle, ClipboardCopy, ExternalLink, Send, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  approved: "bg-blue-500/20 text-blue-400",
  handed_off: "bg-yellow-500/20 text-yellow-400",
  executed: "bg-green-500/20 text-green-400",
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  webflow: "Webflow",
  reddit: "Reddit",
  email: "Email",
};

function PayloadCard({ payload, onStatusChange }: {
  payload: any;
  onStatusChange: () => void;
}) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const updateStatus = trpc.payload.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); onStatusChange(); },
    onError: (e) => toast.error(e.message),
  });

  const sendWebhook = trpc.payload.sendToWebhook.useMutation({
    onSuccess: () => {
      toast.success("Payload sent to agent");
      setDialogOpen(false);
      onStatusChange();
    },
    onError: (e) => toast.error(`Webhook failed: ${e.message}`),
  });

  const fullPayloadJson = useMemo(() => JSON.stringify({
    id: String(payload.id),
    ideaId: payload.ideaId,
    platform: payload.platform,
    status: payload.status,
    content: payload.content,
    metadata: payload.metadata,
    instructions: payload.instructions,
  }, null, 2), [payload]);

  function copyToClipboard() {
    navigator.clipboard.writeText(fullPayloadJson);
    toast.success("Payload copied to clipboard");
  }

  function handleApprove() {
    updateStatus.mutate({ id: payload.id, status: "approved" });
  }

  function handleSendWebhook() {
    if (!webhookUrl) { toast.error("Enter a webhook URL"); return; }
    sendWebhook.mutate({ id: payload.id, webhookUrl, secret: webhookSecret || undefined });
  }

  const optimalDate = payload.metadata?.optimal_time
    ? new Date(payload.metadata.optimal_time).toLocaleString()
    : "—";

  return (
    <Card className="flex flex-col gap-0">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">
                {payload.content?.headline ?? `Payload #${payload.id}`}
              </span>
              <Badge className={`text-xs px-2 py-0 ${STATUS_COLORS[payload.status] ?? ""}`}>
                {payload.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {PLATFORM_LABELS[payload.platform] ?? payload.platform} &middot; Idea #{payload.ideaId}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        <Tabs defaultValue="content">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1 text-xs">Content</TabsTrigger>
            <TabsTrigger value="metadata" className="flex-1 text-xs">Metadata</TabsTrigger>
            <TabsTrigger value="instructions" className="flex-1 text-xs">Instructions</TabsTrigger>
            <TabsTrigger value="json" className="flex-1 text-xs">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-3 space-y-2">
            {payload.content?.body && (
              <p className="text-sm leading-relaxed line-clamp-4">{payload.content.body}</p>
            )}
            {payload.content?.caption && (
              <p className="text-xs text-muted-foreground italic">{payload.content.caption}</p>
            )}
            {payload.content?.cta_url && (
              <a
                href={payload.content.cta_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {payload.content.cta_url}
              </a>
            )}
          </TabsContent>

          <TabsContent value="metadata" className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Optimal post time</p>
              <p className="text-sm">{optimalDate}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Trending score: {payload.metadata?.trending_score ?? "—"}/100
              </p>
            </div>
            {payload.metadata?.hashtags?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Hashtags</p>
                <div className="flex flex-wrap gap-1">
                  {payload.metadata.hashtags.map((h: string) => (
                    <Badge key={h} variant="secondary" className="text-xs">#{h}</Badge>
                  ))}
                </div>
              </div>
            )}
            {payload.metadata?.tags?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {payload.metadata.tags.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs">@{t}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="instructions" className="mt-3 space-y-3 text-sm">
            {payload.instructions?.first_comment && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">First comment</p>
                <p>{payload.instructions.first_comment}</p>
              </div>
            )}
            {payload.instructions?.engagement_strategy && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Engagement strategy</p>
                <p>{payload.instructions.engagement_strategy}</p>
              </div>
            )}
            {payload.instructions?.follow_up_trigger && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Follow-up trigger</p>
                <p>{payload.instructions.follow_up_trigger}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="json" className="mt-3">
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-48 leading-relaxed">
              {fullPayloadJson}
            </pre>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-1 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={copyToClipboard}>
            <ClipboardCopy className="h-3.5 w-3.5" />
            Copy JSON
          </Button>

          {payload.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={handleApprove}
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Approve
            </Button>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs ml-auto">
                <Send className="h-3.5 w-3.5" />
                Send to Agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Payload to Agent</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Webhook URL</Label>
                  <Input
                    placeholder="https://your-agent.example.com/webhook"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Secret (optional)</Label>
                  <Input
                    placeholder="Shared secret for X-Pulse-Signature header"
                    value={webhookSecret}
                    onChange={e => setWebhookSecret(e.target.value)}
                    type="password"
                  />
                </div>
                <Button
                  onClick={handleSendWebhook}
                  disabled={sendWebhook.isPending || !webhookUrl}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {sendWebhook.isPending ? "Sending…" : "Send Payload"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PayloadConsole() {
  const { activeBrand } = useBrand();
  const brandId = activeBrand?.id;

  const { data: payloads, isLoading, refetch } = trpc.payload.list.useQuery(
    { brandId: brandId! },
    { enabled: !!brandId },
  );

  const grouped = useMemo(() =>
    (payloads ?? []).reduce<Record<string, any[]>>((acc, p) => {
      (acc[p.status] ??= []).push(p);
      return acc;
    }, {}),
  [payloads]);

  const statusOrder = ["approved", "draft", "handed_off", "executed"];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Payload Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Execution-ready packets for AI agents and platform connectors.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            <span>{payloads?.length ?? 0} payloads</span>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && !payloads?.length && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
              <Zap className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm text-center max-w-sm">
                No payloads yet. Run the content pipeline to generate execution-ready payloads
                for your approved ideas.
              </p>
            </CardContent>
          </Card>
        )}

        {statusOrder.map(status => {
          const group = grouped[status];
          if (!group?.length) return null;
          return (
            <section key={status}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">
                {status.replace("_", " ")} ({group.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {group.map((p: any) => (
                  <PayloadCard key={p.id} payload={p} onStatusChange={refetch} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
