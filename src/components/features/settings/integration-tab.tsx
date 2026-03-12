"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Lock,
} from "lucide-react";
import { Button, Input, Spinner, Modal } from "@/components/ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import toast from "react-hot-toast";
import {
  useIntegrationStore,
  type CmsConnection,
  type CmsConnectionDetail,
} from "@/stores/integration-store";

interface BloggerBlog {
  id: string;
  name: string;
  url: string;
}

type ConnectionStep = "form" | "bloggerIntro" | "bloggerSelectBlog" | "verifying" | "success" | "error";

interface ConnectionResult {
  site: CmsConnection | null;
  error: string | null;
}

interface CmsPlatform {
  key: "wordpress" | "blogger";
  nameKey: string;
  color: string;
  iconBg: string;
  icon: React.ReactNode;
}

const CMS_PLATFORMS: CmsPlatform[] = [
  {
    key: "wordpress",
    nameKey: "wordpress",
    color: "#21759B",
    iconBg: "bg-[#21759B]/10",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#21759B">
        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zM3.443 12c0-1.166.246-2.274.686-3.278l3.777 10.35A8.565 8.565 0 013.443 12zm8.557 8.557c-.823 0-1.616-.12-2.367-.34l2.514-7.3 2.575 7.057c.017.04.037.077.058.114a8.53 8.53 0 01-2.78.469zm1.2-12.564c.505-.027.96-.078.96-.078.452-.053.399-.718-.053-.692 0 0-1.358.107-2.234.107-.826 0-2.209-.107-2.209-.107-.451-.026-.504.665-.052.692 0 0 .428.052.882.078l1.31 3.59-1.838 5.516L7.42 7.993c.505-.026.96-.078.96-.078.452-.053.398-.718-.054-.692 0 0-1.357.107-2.233.107-.157 0-.342-.004-.538-.01A8.545 8.545 0 0112 3.443c2.1 0 4.017.762 5.5 2.022-.035-.002-.069-.007-.105-.007-.826 0-1.412.718-1.412 1.49 0 .692.399 1.278.825 1.97.32.562.692 1.278.692 2.316 0 .718-.276 1.55-.639 2.71l-.838 2.798-3.023-8.99zm4.616 11.188l2.56-7.398c.478-1.196.639-2.154.639-3.005 0-.308-.02-.595-.057-.864A8.527 8.527 0 0120.557 12a8.553 8.553 0 01-2.74 6.281z" />
      </svg>
    ),
  },
  {
    key: "blogger",
    nameKey: "blogger",
    color: "#F57C00",
    iconBg: "bg-[#F57C00]/10",
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#F57C00">
        <path d="M21.976 24H2.024C.906 24 0 23.094 0 21.976V2.024C0 .906.906 0 2.024 0h19.952C23.094 0 24 .906 24 2.024v19.952C24 23.094 23.094 24 21.976 24zM17.5 12.5c-.275 0-.5-.225-.5-.5V11c0-2.206-1.794-4-4-4H9.5C7.294 7 5.5 8.794 5.5 11v2c0 2.206 1.794 4 4 4h5c2.206 0 4-1.794 4-4v-.5c0-.275-.225-.5-.5-.5h-1zm-3.5 3H10c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H10c-.55 0-1-.45-1-1s.45-1 1-1h4c.55 0 1 .45 1 1s-.45 1-1 1z" />
      </svg>
    ),
  },
];

export default function IntegrationTab() {
  const t = useTranslations("settings.integration");

  const {
    connections,
    isLoading,
    fetchError,
    fetchConnections,
    connectWordPress,
    getConnectionDetail,
    disconnectCms,
  } = useIntegrationStore();

  const [activePlatform, setActivePlatform] = useState<
    "wordpress" | "blogger" | null
  >(null);
  const [connectionStep, setConnectionStep] = useState<ConnectionStep>("form");
  const [connectionResult, setConnectionResult] = useState<ConnectionResult>({
    site: null,
    error: null,
  });
  const [formData, setFormData] = useState({
    siteUrl: "",
    username: "",
    applicationPassword: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showAuthHelp, setShowAuthHelp] = useState(false);

  const [bloggerBlogs, setBloggerBlogs] = useState<BloggerBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);

  const [disconnectTarget, setDisconnectTarget] =
    useState<CmsConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [detailSite, setDetailSite] = useState<CmsConnectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailForbidden, setDetailForbidden] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const getSitesForPlatform = (platform: "wordpress" | "blogger") =>
    connections.filter((s) => {
      const name = s.cms_name.toLowerCase();
      if (platform === "wordpress") {
        return name === "wordpress"
      }
      return name === platform;
    });

  const resetForm = useCallback(() => {
    setActivePlatform(null);
    setConnectionStep("form");
    setConnectionResult({ site: null, error: null });
    setFormData({ siteUrl: "", username: "", applicationPassword: "" });
    setFormErrors({});
    setShowAuthHelp(false);
    setBloggerBlogs([]);
    setSelectedBlogId(null);
  }, []);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.siteUrl.trim()) {
      errors.siteUrl = t("fieldRequired");
    } else {
      try {
        new URL(formData.siteUrl);
      } catch {
        errors.siteUrl = t("invalidUrl");
      }
    }
    if (!formData.username.trim()) errors.username = t("fieldRequired");
    if (!formData.applicationPassword.trim())
      errors.applicationPassword = t("fieldRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleConnect = async () => {
    if (!validateForm() || !activePlatform) return;

    setConnectionStep("verifying");
    try {
      const result = await connectWordPress({
        site_url: formData.siteUrl,
        username: formData.username,
        application_password: formData.applicationPassword,
        cms_name: activePlatform,
      });

      const newConnection: CmsConnection = {
        id: result.id,
        cms_name: result.cms_name,
        site_name: result.site_url,
        site_url: result.site_url,
        connection_status: result.connection_status,
        created_at: new Date().toISOString(),
        created_by: formData.username,
        modified_at: new Date().toISOString(),
        modified_by: formData.username,
      };

      setConnectionResult({ site: newConnection, error: null });
      setConnectionStep("success");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("connectError");
      setConnectionResult({ site: null, error: message });
      setConnectionStep("error");
    }
  };

  const handleBloggerGoogleAuth = async () => {
    setConnectionStep("verifying");

    await new Promise((r) => setTimeout(r, 1500));
    setBloggerBlogs([]);
    setConnectionStep("bloggerSelectBlog");
  };

  const handleBloggerConnect = async () => {
    if (!selectedBlogId) return;
    const blog = bloggerBlogs.find((b) => b.id === selectedBlogId);
    if (!blog) return;

    setConnectionStep("verifying");
    try {
      // TODO: Replace with real Blogger connection API call when endpoint is available
      await new Promise((r) => setTimeout(r, 2000));
      const newConnection: CmsConnection = {
        id: selectedBlogId,
        cms_name: "blogger",
        site_name: blog.name,
        site_url: blog.url,
        connection_status: "connected",
        created_at: new Date().toISOString(),
        created_by: "Google Account",
        modified_at: new Date().toISOString(),
        modified_by: "Google Account",
      };
      setConnectionResult({ site: newConnection, error: null });
      setConnectionStep("success");
    } catch {
      setConnectionResult({ site: null, error: t("connectError") });
      setConnectionStep("error");
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    try {
      await disconnectCms(disconnectTarget.id);
      if (detailSite?.id === disconnectTarget.id) setDetailSite(null);
    } catch (err: unknown) {
      console.error("Failed to disconnect CMS", err);
      toast.error(t("disconnectError"));
    } finally {
      setDisconnectTarget(null);
      setDisconnecting(false);
    }
  };

  const handleViewDetails = async (connection: CmsConnection) => {
    setDetailLoading(true);
    setDetailSite(null);
    setDetailForbidden(false);
    try {
      const detail = await getConnectionDetail(connection.id);
      setDetailSite(detail);
    } catch (err: unknown) {
      const isForbidden = (err as Error)?.message === "forbidden";
      if (isForbidden) {
        setDetailForbidden(true);
      } else {
        console.error("Failed to fetch connection detail", err);
        // Graceful fallback: show what we already know from the list
        setDetailSite({
          id: connection.id,
          cms_name: connection.cms_name,
          site_name: connection.site_name,
          site_url: connection.site_url,
          auth_type: "",
          connection_status: connection.connection_status,
          user_role: "",
          created_at: connection.created_at,
          created_by: connection.created_by,
          modified_at: connection.modified_at,
          modified_by: connection.modified_by,
        });
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label={t("loading")} />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <AlertCircle size={32} className="text-red-500" />
        <p className="text-sm text-muted">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={fetchConnections}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t("heading")}
        </h2>
        <p className="text-sm text-muted mt-0.5">{t("description")}</p>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            {t("cmsConnection")}
          </h3>
        </div>

        <div className="divide-y divide-border">
          {CMS_PLATFORMS.map((platform) => {
            const sites = getSitesForPlatform(platform.key);
            return (
              <CmsPlatformSection
                key={platform.key}
                platform={platform}
                sites={sites}
                t={t}
                onAddConnection={() => {
                  resetForm();
                  setActivePlatform(platform.key);
                  if (platform.key === "blogger") {
                    setConnectionStep("bloggerIntro");
                  }
                }}
                onViewDetails={handleViewDetails}
                onDisconnect={(site) => setDisconnectTarget(site)}
                formatDate={formatDate}
              />
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={activePlatform !== null}
        onClose={resetForm}
        logo={
          connectionStep === "success" ? (
            <CheckCircle2 size={22} className="text-green-500" />
          ) : connectionStep === "error" ? (
            <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
              <X size={16} className="text-red-500" />
            </div>
          ) : undefined
        }
        title={
          connectionStep === "success"
            ? t("successTitle", {
              platform:
                activePlatform === "wordpress" ? "WordPress" : "Blogger",
            })
            : connectionStep === "error"
              ? t("errorTitle")
              : connectionStep === "bloggerIntro"
                ? t("bloggerConnectTitle")
                : connectionStep === "bloggerSelectBlog"
                  ? t("bloggerSelectTitle")
                  : t("connectTitle", {
                    platform:
                      activePlatform === "wordpress" ? "WordPress" : "Blogger",
                  })
        }
        description={
          connectionStep === "form"
            ? t("connectDescription")
            : connectionStep === "bloggerIntro"
              ? t("bloggerConnectDesc")
              : connectionStep === "bloggerSelectBlog"
                ? t("bloggerSelectDesc")
                : undefined
        }
        size="lg"
      >
        {connectionStep === "form" && (
          <ConnectionForm
            t={t}
            formData={formData}
            formErrors={formErrors}
            showAuthHelp={showAuthHelp}
            platform={activePlatform!}
            onFieldChange={(field, value) => {
              setFormData((prev) => ({ ...prev, [field]: value }));
              setFormErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
              });
            }}
            onToggleHelp={() => setShowAuthHelp((prev) => !prev)}
            onSubmit={handleConnect}
            onCancel={resetForm}
          />
        )}

        {connectionStep === "bloggerIntro" && (
          <BloggerConnectIntro
            t={t}
            onContinue={handleBloggerGoogleAuth}
            onCancel={resetForm}
          />
        )}

        {connectionStep === "bloggerSelectBlog" && (
          <BloggerSelectBlog
            t={t}
            blogs={bloggerBlogs}
            selectedBlogId={selectedBlogId}
            onSelect={setSelectedBlogId}
            onConnect={handleBloggerConnect}
            onCancel={resetForm}
          />
        )}

        {connectionStep === "verifying" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-muted">{t("verifying", { platform: activePlatform === "wordpress" ? "WordPress" : "Blogger" })}</p>
          </div>
        )}

        {connectionStep === "success" && connectionResult.site && (
          <ConnectionSuccess
            t={t}
            site={connectionResult.site}
            platform={activePlatform!}
            onDone={resetForm}
            onDisconnect={() => {
              setDisconnectTarget(connectionResult.site);
            }}
            formatDate={formatDate}
          />
        )}

        {connectionStep === "error" && (
          <ConnectionError
            t={t}
            error={connectionResult.error || t("connectError")}
            onRetry={() => setConnectionStep("form")}
            onClose={resetForm}
          />
        )}
      </Modal>

      <Modal
        isOpen={detailSite !== null || detailLoading || detailForbidden}
        onClose={() => { setDetailSite(null); setDetailForbidden(false); }}
        title={t("siteDetails")}
        size="md"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="lg" />
          </div>
        ) : detailForbidden ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <Lock size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t("detailForbiddenTitle")}</p>
              <p className="text-xs text-muted mt-1">{t("detailForbiddenDesc")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setDetailForbidden(false)}>
              {t("done")}
            </Button>
          </div>
        ) : detailSite ? (
          <SiteDetailsView
            t={t}
            site={detailSite}
            formatDate={formatDate}
            onDisconnect={() => {
              const conn = connections.find((c) => c.id === detailSite.id);
              if (conn) setDisconnectTarget(conn);
              setDetailSite(null);
            }}
            onClose={() => setDetailSite(null)}
          />
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={disconnectTarget !== null}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
        title={t("disconnectTitle")}
        description={t("disconnectDescription", {
          name: disconnectTarget?.site_name || "",
        })}
        confirmLabel={t("disconnect")}
        cancelLabel={t("cancel")}
        isLoading={disconnecting}
        variant="danger"
      />
    </>
  );
}

interface CmsPlatformSectionProps {
  platform: CmsPlatform;
  sites: CmsConnection[];
  t: ReturnType<typeof useTranslations>;
  onAddConnection: () => void;
  onViewDetails: (site: CmsConnection) => void;
  onDisconnect: (site: CmsConnection) => void;
  formatDate: (d: string) => string;
}

function CmsPlatformSection({
  platform,
  sites,
  t,
  onAddConnection,
  onViewDetails,
  onDisconnect,
}: CmsPlatformSectionProps) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg ${platform.iconBg} flex items-center justify-center`}
          >
            {platform.icon}
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t(platform.nameKey)}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Plus size={14} />}
          onClick={onAddConnection}
        >
          {t("addNewConnection")}
        </Button>
      </div>

      {sites.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-hover border-b border-border">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {t("connectedSite")}
            </span>
          </div>
          <div className="divide-y divide-border">
            {sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {site.site_name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {site.site_url}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(site)}
                  >
                    {t("viewDetails")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDisconnect(site)}
                  >
                    {t("disconnect")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sites.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-6 flex flex-col items-center justify-center text-center">
          <Globe size={24} className="text-muted mb-2" />
          <p className="text-xs text-muted">
            {t("noConnections", {
              platform:
                platform.key === "wordpress" ? "WordPress" : "Blogger",
            })}
          </p>
        </div>
      )}
    </div>
  );
}

interface ConnectionFormProps {
  t: ReturnType<typeof useTranslations>;
  formData: { siteUrl: string; username: string; applicationPassword: string };
  formErrors: Record<string, string>;
  showAuthHelp: boolean;
  platform: "wordpress" | "blogger";
  onFieldChange: (field: string, value: string) => void;
  onToggleHelp: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function ConnectionForm({
  t,
  formData,
  formErrors,
  showAuthHelp,
  platform,
  onFieldChange,
  onToggleHelp,
  onSubmit,
  onCancel,
}: ConnectionFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">
          {t("step1Title")}
        </h4>
        <p className="text-xs text-muted mb-3">{t("step1Desc")}</p>
        <Input
          label={t("siteUrlLabel")}
          placeholder={t("siteUrlPlaceholder")}
          value={formData.siteUrl}
          onChange={(e) => onFieldChange("siteUrl", e.target.value)}
          error={formErrors.siteUrl}
          icon={<Globe size={16} />}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">
          {t("step2Title")}
        </h4>
        <p className="text-xs text-muted mb-3">{t("step2Desc")}</p>
        <div className="space-y-3">
          <Input
            label={t("usernameLabel")}
            placeholder={t("usernamePlaceholder")}
            value={formData.username}
            onChange={(e) => onFieldChange("username", e.target.value)}
            error={formErrors.username}
          />

          {platform === "wordpress" && (
            <>
              <p className="text-xs text-muted">
                {t("appPasswordHint")}
              </p>
              <Input
                label={t("appPasswordLabel")}
                placeholder={t("appPasswordPlaceholder")}
                type="password"
                value={formData.applicationPassword}
                onChange={(e) =>
                  onFieldChange("applicationPassword", e.target.value)
                }
                error={formErrors.applicationPassword}
              />

              <button
                type="button"
                onClick={onToggleHelp}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                {showAuthHelp ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {t("howToGenerate")}
              </button>
              {showAuthHelp && (
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-xs text-muted leading-relaxed">
                  {t("howToGenerateSteps")}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={onSubmit}>
          {t("connectSite")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

interface ConnectionSuccessProps {
  t: ReturnType<typeof useTranslations>;
  site: CmsConnection;
  platform: "wordpress" | "blogger";
  onDone: () => void;
  onDisconnect: () => void;
  formatDate: (d: string) => string;
}

function ConnectionSuccess({
  t,
  site,
  platform,
  onDone,
  onDisconnect,
  formatDate,
}: ConnectionSuccessProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-4 space-y-2.5">
        <h4 className="text-sm font-semibold text-foreground">
          {t("siteDetails")}
        </h4>
        <DetailRow label={t("siteName")} value={site.site_name} />
        <DetailRow label={t("siteUrl")} value={site.site_url} />
        <DetailRow label={t("connectedAs")} value={site.created_by} />
        <DetailRow
          label={t("connectedAt")}
          value={formatDate(site.created_at)}
        />
      </div>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <p className="text-xs text-foreground">
          <strong>{t("importantNote")}</strong> {t("importantNoteDesc")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={onDone}>
          {t("done")}
        </Button>
        <Button variant="danger" onClick={onDisconnect}>
          {t("disconnect")}
        </Button>
      </div>
    </div>
  );
}

interface ConnectionErrorProps {
  t: ReturnType<typeof useTranslations>;
  error: string;
  onRetry: () => void;
  onClose: () => void;
}

function ConnectionError({ t, error, onRetry, onClose }: ConnectionErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-2 gap-4 text-center">
      <p className="text-sm text-muted max-w-sm">{error}</p>
      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={onRetry}>
          {t("tryAgain")}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

interface BloggerConnectIntroProps {
  t: ReturnType<typeof useTranslations>;
  onContinue: () => void;
  onCancel: () => void;
}

function BloggerConnectIntro({ t, onContinue, onCancel }: BloggerConnectIntroProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm text-muted">{t("bloggerOAuthDesc")}</p>
        <ol className="text-sm text-muted space-y-1 list-decimal list-inside">
          <li>{t("bloggerStep1")}</li>
          <li>{t("bloggerStep2")}</li>
          <li>{t("bloggerStep3")}</li>
        </ol>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={onContinue} size="sm">
          {t("continueWithGoogle")}
        </Button>
        <Button variant="ghost" onClick={onCancel} size="sm">
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

interface BloggerSelectBlogProps {
  t: ReturnType<typeof useTranslations>;
  blogs: BloggerBlog[];
  selectedBlogId: string | null;
  onSelect: (id: string) => void;
  onConnect: () => void;
  onCancel: () => void;
}

function BloggerSelectBlog({
  t,
  blogs,
  selectedBlogId,
  onSelect,
  onConnect,
  onCancel,
}: BloggerSelectBlogProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          {t("availableBlog")}
        </p>
        <div className="space-y-2">
          {blogs.map((blog) => (
            <button
              key={blog.id}
              type="button"
              onClick={() => onSelect(blog.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left cursor-pointer ${selectedBlogId === blog.id
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-surface-hover"
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedBlogId === blog.id
                  ? "border-primary"
                  : "border-muted"
                  }`}
              >
                {selectedBlogId === blog.id && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{blog.name}</p>
                <p className="text-xs text-muted truncate">{blog.url}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="primary"
          onClick={onConnect}
          disabled={!selectedBlogId}
        >
          {t("connectBlog")}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

interface SiteDetailsViewProps {
  t: ReturnType<typeof useTranslations>;
  site: CmsConnectionDetail;
  formatDate: (d: string) => string;
  onDisconnect: () => void;
  onClose: () => void;
}

function SiteDetailsView({
  t,
  site,
  formatDate,
  onDisconnect,
  onClose,
}: SiteDetailsViewProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-4 space-y-2.5">
        <DetailRow label={t("siteName")} value={site.site_name} />
        <DetailRow
          label={t("siteUrl")}
          value={site.site_url}
          isLink
        />
        <DetailRow label={t("connectedAs")} value={site.created_by} />
        {site.user_role ? (
          <DetailRow label={t("userRole")} value={site.user_role} />
        ) : null}
        <DetailRow
          label={t("connectedAt")}
          value={formatDate(site.created_at)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("done")}
        </Button>
        <Button variant="danger" onClick={onDisconnect}>
          {t("disconnect")}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  isLink,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted whitespace-nowrap min-w-[120px]">
        {label}:
      </span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          {value}
          <ExternalLink size={12} />
        </a>
      ) : (
        <span className="text-foreground break-all">{value}</span>
      )}
    </div>
  );
}
