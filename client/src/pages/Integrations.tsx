import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Settings, Eye, EyeOff, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PlatformConfig {
  key: string;
  label: string;
  color: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: "webflow",
    label: "Webflow",
    color: "#4353FF",
    description: "Publish blog articles directly to your Webflow CMS collection.",
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "Bearer token from Webflow dashboard" },
      { key: "siteId", label: "Site ID", placeholder: "Your Webflow site ID" },
      { key: "collectionId", label: "Blog Collection ID", placeholder: "CMS collection ID for blog posts" },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0077B5",
    description: "Post updates and articles to your LinkedIn profile or company page.",
    fields: [
      { key: "accessToken", label: "Access Token", placeholder: "OAuth access token" },
      { key: "personUrn", label: "Person URN", placeholder: "urn:li:person:XXXXXXXX" },
      { key: "organizationUrn", label: "Organization URN (optional)", placeholder: "urn:li:organization:XXXXXXXX" },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E1306C",
    description: "Publish images and captions to your Instagram Business account via Meta API.",
    fields: [
      { key: "accessToken", label: "Page Access Token", placeholder: "Meta page access token" },
      { key: "igUserId", label: "Instagram User ID", placeholder: "Your IG Business account ID" },
    ],
  },
  {
    key: "wechat",
    label: "WeChat",
    color: "#07C160",
    description: "Publish articles to your WeChat Official Account.",
    fields: [
      { key: "appId", label: "App ID", placeholder: "WeChat Official Account App ID" },
      { key: "appSecret", label: "App Secret", placeholder: "WeChat Official Account App Secret" },
    ],
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    description: "Post to your Facebook Page via the Graph API.",
    fields: [
      { key: "pageAccessToken", label: "Page Access Token", placeholder: "Facebook page access token" },
      { key: "pageId", label: "Page ID", placeholder: "Your Facebook Page ID" },
    ],
  },
];

export default function Integrations() {
  const { activeBrand, activeBrandId, setActiveBrandId } = useBrand();
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: integrations = [], refetch } = trpc.integrations.list.useQuery(
    { brandId: activeBrandId! },
    { enabled: !!activeBrandId }
  );
  const saveIntegration = trpc.integrations.save.useMutation();
  const disconnectIntegration = trpc.integrations.disconnect.useMutation({ onSuccess: () => refetch() });

  const getIntegration = (platform: string) => integrations.find((i: any) => i.platform === platform);

  const getFormValue = (platform: string, field: string) => {
    return formValues[platform]?.[field] || "";
  };

  const setFormValue = (platform: string, field: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [field]: value },
    }));
  };

  const handleSave = async (platform: PlatformConfig) => {
    if (!activeBrandId) return;
    setSaving(platform.key);
    try {
      const credentials = formValues[platform.key] || {};
      // Validate all required fields are filled
      const missing = platform.fields.filter(f => !f.label.includes("optional") && !credentials[f.key]?.trim());
      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
        return;
      }
      // Map form credentials to the correct flat fields
      await saveIntegration.mutateAsync({
        brandId: activeBrandId,
        platform: platform.key,
        apiKey: credentials.apiToken || credentials.apiKey || undefined,
        apiSecret: credentials.appSecret || credentials.apiSecret || undefined,
        accessToken: credentials.accessToken || credentials.pageAccessToken || undefined,
        accountName: credentials.personUrn || credentials.igUserId || credentials.pageId || credentials.siteId || undefined,
        extraConfig: Object.keys(credentials).length > 0 ? credentials : undefined,
      });
      toast.success(`${platform.label} connected successfully!`);
      refetch();
      // Clear form
      setFormValues(prev => ({ ...prev, [platform.key]: {} }));
    } catch (e: any) {
      toast.error(e.message || "Failed to save integration");
    } finally {
      setSaving(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!activeBrandId) return;
    await disconnectIntegration.mutateAsync({ brandId: activeBrandId, platform });
    toast.success("Integration disconnected");
  };

  return (
    <AppLayout brandId={activeBrandId} onBrandChange={setActiveBrandId}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeBrand?.name} · Connect your publishing platforms. All credentials are stored securely in the database.
          </p>
        </div>

        {/* Platform cards */}
        <div className="space-y-4">
          {PLATFORMS.map(platform => {
            const integration = getIntegration(platform.key);
            const isConnected = integration?.status === "connected";
            const isExpanded = showFields[platform.key];

            return (
              <Card key={platform.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: platform.color }} />
                      <div>
                        <CardTitle className="text-sm">{platform.label}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <Badge className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-400 border-green-500/30">
                            <CheckCircle size={10} className="mr-1" /> Connected
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => handleDisconnect(platform.key)}>
                            <Trash2 size={12} className="mr-1" /> Disconnect
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                          <XCircle size={10} className="mr-1" /> Not connected
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowFields(prev => ({ ...prev, [platform.key]: !prev[platform.key] }))}>
                        <Settings size={12} className="mr-1" /> {isExpanded ? "Hide" : "Configure"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <>
                    <Separator className="bg-border/50" />
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {platform.fields.map(field => (
                          <div key={field.key}>
                            <Label className="text-xs text-muted-foreground">{field.label}</Label>
                            <div className="relative mt-1">
                              <Input
                                type={field.type === "password" || field.key.toLowerCase().includes("secret") || field.key.toLowerCase().includes("token") ? "password" : "text"}
                                value={getFormValue(platform.key, field.key)}
                                onChange={e => setFormValue(platform.key, field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="text-xs pr-8"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleSave(platform)}
                          disabled={saving === platform.key}
                          style={{ background: "linear-gradient(135deg, #3AC1EC, #2163AF)" }}
                        >
                          <Save size={12} className="mr-1.5" />
                          {saving === platform.key ? "Saving..." : isConnected ? "Update Credentials" : "Connect"}
                        </Button>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>

        {/* Note */}
        <Card className="border-border bg-card border-primary/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Security note:</strong> All API credentials are stored encrypted in your local database. They are never transmitted to any third-party service. The publishing engine uses these credentials only when you explicitly trigger a publish job.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
