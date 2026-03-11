import AppLayout from "@/components/AppLayout";
import { useBrand } from "@/hooks/useBrand";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Settings, Save, Trash2, HelpCircle, ExternalLink, RefreshCw, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  helpText?: string;
  helpUrl?: string;
}

interface PlatformConfig {
  key: string;
  label: string;
  color: string;
  description: string;
  fields: FieldConfig[];
  hasCmsMapping?: boolean;
}

const PLATFORMS: PlatformConfig[] = [
  {
    key: "webflow",
    label: "Webflow",
    color: "#4353FF",
    description: "Publish blog articles directly to your Webflow CMS collection.",
    hasCmsMapping: true,
    fields: [
      {
        key: "apiToken", label: "API Token", placeholder: "Bearer token from Webflow dashboard",
        helpText: "IMPORTANT: You need a v2 Site API Token with 'cms:write' scope. Go to Webflow Site Settings → Integrations → API Access → Generate API Token. Under 'CMS', enable both Read AND Write. If you see '403 missing_scopes: cms:write' errors, your current token is missing this permission — generate a new one.",
        helpUrl: "https://webflow.com/dashboard/account/integrations",
      },
      {
        key: "siteId", label: "Site ID", placeholder: "Your Webflow site ID",
        helpText: "Find your Site ID in Webflow → Site Settings → General. It's the alphanumeric ID listed under 'Site ID' in the General tab.",
        helpUrl: "https://webflow.com/dashboard/account/integrations",
      },
      {
        key: "collectionId", label: "Blog Collection ID", placeholder: "CMS collection ID for blog posts",
        helpText: "Go to your Webflow CMS Collections list. Click on your blog collection and copy the ID from the URL. You can also use the Field Mapping section below to auto-detect collections.",
        helpUrl: "https://webflow.com/dashboard",
      },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0077B5",
    description: "Post updates and articles to your LinkedIn profile or company page.",
    fields: [
      {
        key: "accessToken", label: "Access Token", placeholder: "OAuth access token",
        helpText: "Create a LinkedIn app at developer.linkedin.com. Under Auth, generate an access token with r_liteprofile and w_member_social permissions. Tokens expire after 60 days.",
        helpUrl: "https://www.linkedin.com/developers/apps/new",
      },
      {
        key: "personUrn", label: "Person URN", placeholder: "urn:li:person:XXXXXXXX",
        helpText: "Call the LinkedIn /v2/me API with your access token and copy the 'id' field. Format: urn:li:person:{id}",
        helpUrl: "https://www.linkedin.com/developers/tools/oauth/token-generator",
      },
      {
        key: "organizationUrn", label: "Organization URN (optional)", placeholder: "urn:li:organization:XXXXXXXX",
        helpText: "If posting as a Company Page, find your Organization ID in your LinkedIn Company Page URL (linkedin.com/company/{id}). Format: urn:li:organization:{id}",
        helpUrl: "https://www.linkedin.com/developers/apps",
      },
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    color: "#E1306C",
    description: "Publish images and captions to your Instagram Business account via Meta API.",
    fields: [
      {
        key: "accessToken", label: "Page Access Token", placeholder: "Meta page access token",
        helpText: "Create a Meta app at developers.facebook.com. Connect your Instagram Business account, then generate a Page Access Token under Graph API Explorer. Requires instagram_basic and instagram_content_publish permissions.",
        helpUrl: "https://developers.facebook.com/tools/explorer/",
      },
      {
        key: "igUserId", label: "Instagram User ID", placeholder: "Your IG Business account ID",
        helpText: "Call the Meta Graph API: GET /me?fields=id,name with your access token. The 'id' field is your Instagram User ID. Your account must be a Business or Creator account linked to a Facebook Page.",
        helpUrl: "https://developers.facebook.com/tools/explorer/",
      },
    ],
  },

  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    description: "Post to your Facebook Page via the Graph API.",
    fields: [
      {
        key: "pageAccessToken", label: "Page Access Token", placeholder: "Facebook page access token",
        helpText: "In Meta Business Suite, go to Settings → Page Access Tokens, or use the Graph API Explorer at developers.facebook.com to generate a long-lived Page Access Token. Requires pages_manage_posts permission.",
        helpUrl: "https://developers.facebook.com/tools/explorer/",
      },
      {
        key: "pageId", label: "Page ID", placeholder: "Your Facebook Page ID",
        helpText: "Open your Facebook Page, click About → Page Transparency. Your Page ID is listed there. Alternatively, visit your page URL and look for the numeric ID in the source.",
        helpUrl: "https://www.facebook.com/pages/?category=your_pages",
      },
    ],
  },
];

// ─── CMS Field Mapping types ──────────────────────────────────────────────────
const CONTENT_FIELDS = [
  { key: "title", label: "Title", description: "The article title" },
  { key: "body", label: "Body / Rich Text", description: "Main article content" },
  { key: "caption", label: "Caption / Summary", description: "Short summary or meta description" },
  { key: "hashtags", label: "Tags / Hashtags", description: "Content tags" },
  { key: "imageUrl", label: "Featured Image URL", description: "Cover image" },
  { key: "slug", label: "Slug", description: "URL slug (auto-generated from title if not mapped)" },
];

function FieldHelpTooltip({ helpText, helpUrl }: { helpText: string; helpUrl?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 text-muted-foreground hover:text-foreground transition-colors" type="button">
          <HelpCircle size={12} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-xs" side="top">
        <p className="text-foreground leading-relaxed">{helpText}</p>
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 text-primary hover:underline font-medium"
          >
            Get your token / key ↗ <ExternalLink size={10} />
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}

function WebflowFieldMapping({ brandId, apiToken, siteId }: { brandId: number; apiToken: string; siteId: string }) {
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [collectionFields, setCollectionFields] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);

  const fetchCollections = trpc.integrations.getWebflowCollections.useMutation();
  const fetchFields = trpc.integrations.getWebflowCollectionFields.useMutation();
  const saveMapping = trpc.integrations.saveWebflowFieldMapping.useMutation();

  const { data: savedMapping } = trpc.integrations.getWebflowFieldMapping.useQuery(
    { brandId },
    { enabled: !!brandId }
  );

  const handleFetchCollections = async () => {
    if (!apiToken || !siteId) {
      toast.error("Save your API Token and Site ID first, then use this mapping tool.");
      return;
    }
    setLoading(true);
    try {
      const result = await fetchCollections.mutateAsync({ brandId, apiToken, siteId });
      setCollections(result);
      toast.success(`Found ${result.length} collections`);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch collections. Check your API Token and Site ID.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCollection = async (collectionId: string) => {
    setSelectedCollection(collectionId);
    setLoadingFields(true);
    try {
      const result = await fetchFields.mutateAsync({ brandId, apiToken, siteId, collectionId });
      setCollectionFields(result);
      // Pre-fill from saved mapping
      if (savedMapping?.fieldMapping) {
        setFieldMapping(savedMapping.fieldMapping as Record<string, string>);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch collection fields.");
    } finally {
      setLoadingFields(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!selectedCollection) return;
    try {
      await saveMapping.mutateAsync({
        brandId,
        collectionId: selectedCollection,
        fieldMapping,
      });
      toast.success("Field mapping saved!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save mapping");
    }
  };

  return (
    <div className="mt-4 border border-border/50 rounded-lg p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">CMS Field Mapping</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">Map your Webflow collection fields to Pulse content fields</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleFetchCollections}
          disabled={loading}
        >
          <RefreshCw size={11} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Loading..." : collections.length > 0 ? "Refresh" : "Load Collections"}
        </Button>
      </div>

      {savedMapping?.collectionId && collections.length === 0 && (
        <div className="text-[11px] text-muted-foreground mb-3 flex items-center gap-1">
          <CheckCircle size={11} className="text-green-400" />
          Mapping saved for collection: <code className="font-mono text-[10px] bg-muted px-1 rounded">{savedMapping.collectionId}</code>
          <button className="text-primary hover:underline ml-1" onClick={handleFetchCollections}>Edit</button>
        </div>
      )}

      {collections.length > 0 && (
        <div className="space-y-3">
          <div>
            <Label className="text-[11px] text-muted-foreground">Select Collection</Label>
            <Select value={selectedCollection} onValueChange={handleSelectCollection}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Choose a CMS collection..." />
              </SelectTrigger>
              <SelectContent>
                {collections.map((c: any) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.displayName || c.name} <span className="text-muted-foreground ml-1 font-mono text-[10px]">({c.id})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingFields && (
            <p className="text-[11px] text-muted-foreground animate-pulse">Loading collection fields...</p>
          )}

          {collectionFields.length > 0 && (
            <>
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium">Map Pulse fields → Webflow fields</p>
                {CONTENT_FIELDS.map(cf => (
                  <div key={cf.key} className="flex items-center gap-2">
                    <div className="w-32 flex-shrink-0">
                      <span className="text-[11px] font-medium text-foreground">{cf.label}</span>
                      <p className="text-[10px] text-muted-foreground">{cf.description}</p>
                    </div>
                    <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                    <Select
                      value={fieldMapping[cf.key] || ""}
                      onValueChange={val => setFieldMapping(prev => ({ ...prev, [cf.key]: val }))}
                    >
                      <SelectTrigger className="h-7 text-[11px] flex-1">
                        <SelectValue placeholder="Select Webflow field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" className="text-[11px] text-muted-foreground">— Not mapped —</SelectItem>
                        {collectionFields.map((f: any) => (
                          <SelectItem key={f.slug} value={f.slug} className="text-[11px]">
                            {f.displayName} <span className="text-muted-foreground font-mono text-[10px]">({f.type})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveMapping}
                  disabled={saveMapping.isPending}
                  style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}
                >
                  <Save size={11} className="mr-1.5" />
                  {saveMapping.isPending ? "Saving..." : "Save Mapping"}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

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
      const missing = platform.fields.filter(f => !f.label.includes("optional") && !credentials[f.key]?.trim());
      if (missing.length > 0) {
        toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
        return;
      }
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
      <div className="p-4 md:p-6 space-y-4 md:space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Integrations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeBrand?.name} · Connect publishing platforms. Credentials stored securely.
          </p>
        </div>

        <div className="space-y-4">
          {PLATFORMS.map(platform => {
            const integration = getIntegration(platform.key);
            const isConnected = integration?.status === "connected";
            const isExpanded = showFields[platform.key];

            return (
              <Card key={platform.key} className="border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ background: platform.color }} />
                      <div className="min-w-0">
                        <CardTitle className="text-sm">{platform.label}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{platform.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                            <div className="flex items-center">
                              <Label className="text-xs text-muted-foreground">{field.label}</Label>
                              {field.helpText && (
                                <FieldHelpTooltip helpText={field.helpText} helpUrl={field.helpUrl} />
                              )}
                            </div>
                            <div className="relative mt-1">
                              <Input
                                type={field.type === "password" || field.key.toLowerCase().includes("secret") || field.key.toLowerCase().includes("token") ? "password" : "text"}
                                value={getFormValue(platform.key, field.key)}
                                onChange={e => setFormValue(platform.key, field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="text-xs"
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
                          style={{ background: "linear-gradient(135deg, #5E6AD2, #7C3AED)" }}
                        >
                          <Save size={12} className="mr-1.5" />
                          {saving === platform.key ? "Saving..." : isConnected ? "Update Credentials" : "Connect"}
                        </Button>
                      </div>

                      {/* Webflow CMS Field Mapping */}
                      {platform.hasCmsMapping && activeBrandId && (
                        <WebflowFieldMapping
                          brandId={activeBrandId}
                          apiToken={getFormValue(platform.key, "apiToken") || (integration?.extraConfig as any)?.apiToken || ""}
                          siteId={getFormValue(platform.key, "siteId") || (integration?.extraConfig as any)?.siteId || ""}
                        />
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            );
          })}
        </div>

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
