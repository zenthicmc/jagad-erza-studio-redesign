"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Upload,
  X,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button, Input, Select, Textarea, TagInput, Spinner } from "@/components/ui";
import { useArticleStore } from "@/stores/article-store";
import {
  useIntegrationStore,
  type CmsConnection,
  type WPAuthorItem,
  type WPCategoryItem,
} from "@/stores/integration-store";
import TiptapEditor from "@/components/features/article/tiptap-editor";

type AutopostStep = 1 | 2 | 3;

interface PostSettings {
  title: string;
  slug: string;
  featuredImage: File | null;
  featuredImagePreview: string;
  categoryId: number | null;
  tags: string[];
  authorId: number | null;
  postStatus: "publish" | "draft";
  excerpt: string;
}

interface AutopostWizardProps {
  articleSlug: string;
  articleId: string;
}

const STATUS_OPTIONS = [
  { value: "publish", label: "Publish" },
  { value: "draft", label: "Draft" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AutopostWizard({ articleSlug, articleId }: AutopostWizardProps) {
  const t = useTranslations("article.autopost");
  const router = useRouter();

  const articleContent = useArticleStore((s) => s.generations[articleId]?.content);
  const articleTitle = useArticleStore((s) => s.generations[articleId]?.title);
  const fetchArticle = useArticleStore((s) => s.fetchArticle);

  const {
    connections,
    isLoading: connectionsLoading,
    fetchConnections,
    fetchWPAuthors,
    fetchWPCategories,
    publishToWordPress,
  } = useIntegrationStore();

  const [step, setStep] = useState<AutopostStep>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<"wordpress" | "blogger">("wordpress");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [articleLoading, setArticleLoading] = useState(!articleContent);

  const [authors, setAuthors] = useState<WPAuthorItem[]>([]);
  const [categories, setCategories] = useState<WPCategoryItem[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const getInitialSettings = (): PostSettings => ({
    title: articleTitle || "",
    slug: articleTitle ? generateSlug(articleTitle) : "",
    featuredImage: null,
    featuredImagePreview: "",
    categoryId: null,
    tags: [],
    authorId: null,
    postStatus: "publish",
    excerpt: "",
  });

  const [settings, setSettings] = useState<PostSettings>(getInitialSettings);

  useEffect(() => {
    if (!articleContent && articleId) {
      fetchArticle(articleId, {
        onSuccess: () => setArticleLoading(false),
        onError: () => setArticleLoading(false),
      });
    }
  }, [articleId, articleContent, fetchArticle]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const matchesPlatform = (cmsName: string, platform: string) => {
    const name = cmsName.toLowerCase();
    if (platform === "wordpress") {
      return name === "wordpress";
    }
    return name === platform;
  };

  const sitesForPlatform = useMemo(
    () => connections.filter((s) => matchesPlatform(s.cms_name, selectedPlatform)),
    [connections, selectedPlatform],
  );

  const wordpressCount = connections.filter((s) => matchesPlatform(s.cms_name, "wordpress")).length;
  const bloggerCount = connections.filter((s) => s.cms_name.toLowerCase() === "blogger").length;

  const selectedSite = connections.find((s) => s.id === selectedSiteId);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  };

  const updateSetting = useCallback(<K extends keyof PostSettings>(key: K, value: PostSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    setSettings((prev) => ({
      ...prev,
      title: newTitle,
      slug: newTitle ? generateSlug(newTitle) : prev.slug,
    }));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateSetting("featuredImage", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSetting("featuredImagePreview", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    updateSetting("featuredImage", null);
    updateSetting("featuredImagePreview", "");
  };

  const handleCancel = () => {
    router.push(`/article/${articleSlug}/${articleId}`);
  };

  const handleProceedToStep2 = useCallback(async () => {
    if (!selectedSiteId) return;

    if (selectedPlatform === "wordpress") {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const [fetchedAuthors, fetchedCategories] = await Promise.all([
          fetchWPAuthors(selectedSiteId),
          fetchWPCategories(selectedSiteId),
        ]);
        setAuthors(fetchedAuthors);
        setCategories(fetchedCategories);
      } catch (err) {
        console.error("Failed to fetch WP metadata", err);
        const isForbidden = (err as Error)?.message === "forbidden";
        if (isForbidden) {
          setMetaError(t("metaForbiddenError"));
        } else {
          setMetaError(t("metaFetchError"));
        }
        setAuthors([]);
        setCategories([]);
        setMetaLoading(false);
        return;
      } finally {
        setMetaLoading(false);
      }
    } else {
      setAuthors([]);
      setCategories([]);
    }

    setStep(2);
  }, [selectedSiteId, selectedPlatform, fetchWPAuthors, fetchWPCategories, t]);

  const handlePost = async () => {
    if (!selectedSite) return;
    setIsPosting(true);
    const toastId = toast.loading(t("posting"));
    try {
      if (selectedPlatform === "wordpress") {
        const result = await publishToWordPress({
          article_id: articleId,
          connection_id: selectedSite.id,
          slug: settings.slug || undefined,
          excerpt: settings.excerpt || undefined,
          post_status: settings.postStatus,
          author_id: settings.authorId ?? undefined,
          category_ids: settings.categoryId != null ? [settings.categoryId] : undefined,
          tags: settings.tags.length > 0 ? settings.tags : undefined,
          featured_image: settings.featuredImage ?? undefined,
        });

        toast.success(t("postSuccess"), { id: toastId });

        if (result?.external_post_url) {
          window.open(result.external_post_url, "_blank", "noopener,noreferrer");
        }
      } else {
        // TODO: Implement Blogger publish when endpoint is available
        await new Promise((r) => setTimeout(r, 1500));
        toast.success(t("postSuccess"), { id: toastId });
      }

      router.push(`/article/${articleSlug}/${articleId}`);
    } catch (err: unknown) {
      const rawMessage = (err as Error)?.message;
      const message =
        rawMessage === "forbidden"
          ? t("publishForbiddenError")
          : t("postError");
      console.error("Publish failed:", rawMessage);
      toast.error(message, { id: toastId });
      setIsPosting(false);
    }
  };

  const canProceedStep1 = selectedSiteId !== null;
  const canProceedStep2 = settings.title.trim() !== "";

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-var(--header-height))] overflow-hidden">
      <main className="flex-1 overflow-y-auto bg-background/20 relative">
        <div className="sticky top-0 z-20 flex items-center gap-3 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            {t("backToArticle")}
          </button>
          <div className="flex items-center gap-1.5 px-3 border-l border-border">
            <FileText size={14} className="text-muted" />
            <span className="text-xs text-muted">{t("articlePreview")}</span>
          </div>
        </div>
        <div className="p-6">
          {articleLoading ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="space-y-3">
                <div className="h-10 bg-surface rounded-lg animate-pulse" />
                <div className="h-4 bg-surface rounded-lg w-1/3 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-surface rounded-lg animate-pulse" />
                <div className="h-4 bg-surface rounded-lg w-5/6 animate-pulse" />
                <div className="h-4 bg-surface rounded-lg animate-pulse" />
                <div className="h-4 bg-surface rounded-lg w-4/5 animate-pulse" />
              </div>
              <div className="h-64 bg-surface rounded-xl animate-pulse" />
              <div className="space-y-4">
                <div className="h-4 bg-surface rounded-lg w-3/4 animate-pulse" />
                <div className="h-4 bg-surface rounded-lg animate-pulse" />
              </div>
            </div>
          ) : articleContent ? (
            <TiptapEditor
              content={articleContent}
              onChange={() => { }}
              editable={false}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
              <div className="p-4 rounded-2xl bg-primary/10">
                <FileText size={40} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {t("noContent")}
                </h3>
                <p className="text-sm text-muted max-w-sm">
                  {t("noContentDesc")}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <aside className="w-full lg:w-[420px] xl:w-[460px] shrink-0 border-l border-border flex flex-col bg-surface/30 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {step === 1 && t("step1Title")}
              {step === 2 && t("step2Title")}
              {step === 3 && t("step3Title")}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              {t("stepIndicator", { current: step, total: 3 })}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-5">
            {connectionsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Spinner size="lg" />
                <p className="text-sm text-muted">{t("loadingSites")}</p>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <Step1SelectSite
                    t={t}
                    selectedPlatform={selectedPlatform}
                    onPlatformChange={(p) => {
                      setSelectedPlatform(p);
                      setSelectedSiteId(null);
                      setMetaError(null);
                    }}
                    sites={sitesForPlatform}
                    selectedSiteId={selectedSiteId}
                    onSelectSite={(id) => {
                      setSelectedSiteId(id);
                      setMetaError(null);
                    }}
                    wordpressCount={wordpressCount}
                    bloggerCount={bloggerCount}
                    formatDate={formatDate}
                    metaError={metaError}
                  />
                )}

                {step === 2 && (
                  metaLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <Spinner size="lg" />
                      <p className="text-sm text-muted">{t("loadingMeta")}</p>
                    </div>
                  ) : (
                    <Step2PostSettings
                      t={t}
                      settings={settings}
                      onUpdate={updateSetting}
                      onTitleChange={handleTitleChange}
                      onImageUpload={handleImageUpload}
                      onRemoveImage={handleRemoveImage}
                      authors={authors}
                      categories={categories}
                    />
                  )
                )}

                {step === 3 && selectedSite && (
                  <Step3Review
                    t={t}
                    settings={settings}
                    site={selectedSite}
                    authors={authors}
                    categories={categories}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {!connectionsLoading && (
          <div className="flex items-center gap-3 p-4 border-t border-border shrink-0">
            {step === 1 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToStep2}
                  disabled={!canProceedStep1}
                >
                  {t("next")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  {t("cancel")}
                </Button>
              </>
            )}
            {step === 2 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2 || metaLoading}
                >
                  {t("next")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  {t("back")}
                </Button>
              </>
            )}
            {step === 3 && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePost}
                  disabled={isPosting}
                  icon={isPosting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                >
                  {isPosting ? t("posting") : t("postNow")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} disabled={isPosting}>
                  {t("back")}
                </Button>
              </>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

interface Step1Props {
  t: ReturnType<typeof useTranslations>;
  selectedPlatform: "wordpress" | "blogger";
  onPlatformChange: (p: "wordpress" | "blogger") => void;
  sites: CmsConnection[];
  selectedSiteId: string | null;
  onSelectSite: (id: string) => void;
  wordpressCount: number;
  bloggerCount: number;
  formatDate: (d: string) => string;
  metaError: string | null;
}

function Step1SelectSite({
  t,
  selectedPlatform,
  onPlatformChange,
  sites,
  selectedSiteId,
  onSelectSite,
  wordpressCount,
  bloggerCount,
  formatDate,
  metaError,
}: Step1Props) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <PlatformTab
          label="WordPress"
          active={selectedPlatform === "wordpress"}
          connected={wordpressCount > 0}
          count={wordpressCount}
          onClick={() => onPlatformChange("wordpress")}
        />
        <PlatformTab
          label="Blogger"
          active={selectedPlatform === "blogger"}
          connected={bloggerCount > 0}
          count={bloggerCount}
          onClick={() => onPlatformChange("blogger")}
        />
      </div>

      {metaError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">{metaError}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          {t("connectedSiteList")}
        </p>

        {sites.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted">{t("noConnectedSites")}</p>
            <p className="text-xs text-muted mt-1">{t("goToSettings")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <button
                key={site.id}
                type="button"
                onClick={() => onSelectSite(site.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left cursor-pointer ${selectedSiteId === site.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-surface-hover"
                  }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedSiteId === site.id ? "border-primary" : "border-muted"
                    }`}
                >
                  {selectedSiteId === site.id && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-20 shrink-0">{t("siteName")}</span>
                    <span className="text-foreground font-medium truncate">{site.site_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-20 shrink-0">{t("siteUrl")}</span>
                    <span className="text-foreground truncate">{site.site_url}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted w-20 shrink-0">{t("connected")}</span>
                    <span className="text-foreground">{formatDate(site.created_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformTab({
  label,
  active,
  connected,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  connected: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${active
        ? "border-primary bg-primary/5 text-foreground"
        : "border-border text-muted hover:bg-surface-hover"
        }`}
    >
      <span>{label}</span>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full ${connected
          ? "bg-green-500/10 text-green-500"
          : "bg-muted/10 text-muted"
          }`}
      >
        {connected ? `Connected (${count})` : "Not Connected"}
      </span>
    </button>
  );
}

interface Step2Props {
  t: ReturnType<typeof useTranslations>;
  settings: PostSettings;
  onUpdate: <K extends keyof PostSettings>(key: K, value: PostSettings[K]) => void;
  onTitleChange: (title: string) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  authors: WPAuthorItem[];
  categories: WPCategoryItem[];
}

function Step2PostSettings({
  t,
  settings,
  onUpdate,
  onTitleChange,
  onImageUpload,
  onRemoveImage,
  authors,
  categories,
}: Step2Props) {
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  const categoryOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const authorOptions = authors.map((a) => ({
    value: String(a.id),
    label: a.name,
  }));

  return (
    <div className="space-y-4">
      <Input
        label={t("title")}
        placeholder={t("titlePlaceholder")}
        value={settings.title}
        onChange={(e) => onTitleChange(e.target.value)}
      />

      <Input
        label={t("slugUrl")}
        placeholder={t("slugPlaceholder")}
        value={settings.slug}
        onChange={(e) => onUpdate("slug", e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t("featuredImage")}
        </label>
        {settings.featuredImagePreview ? (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={settings.featuredImagePreview}
              alt="Featured"
              className="w-full h-40 object-cover"
            />
            <button
              type="button"
              onClick={onRemoveImage}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted cursor-pointer"
          >
            <Upload size={24} />
            <span className="text-sm">{t("uploadImage")}</span>
          </button>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="hidden"
        />
      </div>

      <Select
        label={t("category")}
        placeholder={t("selectCategory")}
        options={categoryOptions}
        value={settings.categoryId != null ? String(settings.categoryId) : ""}
        onChange={(v) => onUpdate("categoryId", v ? Number(v) : null)}
      />

      <TagInput
        label={t("tags")}
        placeholder={t("tagsPlaceholder")}
        value={settings.tags}
        onChange={(tags) => onUpdate("tags", tags)}
      />

      <Select
        label={t("author")}
        placeholder={t("selectAuthor")}
        options={authorOptions}
        value={settings.authorId != null ? String(settings.authorId) : ""}
        onChange={(v) => onUpdate("authorId", v ? Number(v) : null)}
      />

      <Select
        label={t("postStatus")}
        placeholder={t("selectStatus")}
        options={STATUS_OPTIONS}
        value={settings.postStatus}
        onChange={(v) => onUpdate("postStatus", v as "publish" | "draft")}
      />

      <Textarea
        label={t("excerpt")}
        placeholder={t("excerptPlaceholder")}
        value={settings.excerpt}
        onChange={(e) => onUpdate("excerpt", e.target.value)}
        rows={3}
      />
    </div>
  );
}

interface Step3Props {
  t: ReturnType<typeof useTranslations>;
  settings: PostSettings;
  site: CmsConnection;
  authors: WPAuthorItem[];
  categories: WPCategoryItem[];
}

function Step3Review({ t, settings, site, authors, categories }: Step3Props) {
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === settings.postStatus)?.label ?? settings.postStatus;
  const categoryLabel = categories.find((c) => c.id === settings.categoryId)?.name ?? "-";
  const authorLabel = authors.find((a) => a.id === settings.authorId)?.name ?? "-";

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t("destination")}</h4>
        <ReviewRow label={t("platform")} value={site.cms_name === "wordpress" || site.cms_name === "wp-erza" ? "WordPress" : "Blogger"} />
        <ReviewRow label={t("siteName")} value={site.site_name} />
        <ReviewRow label={t("siteUrl")} value={site.site_url} />
      </div>

      <div className="rounded-lg border border-border p-4 space-y-2">
        <h4 className="text-sm font-semibold text-foreground">{t("postDetails")}</h4>
        <ReviewRow label={t("title")} value={settings.title || "-"} />
        <ReviewRow label={t("slugUrl")} value={settings.slug || "-"} />
        {settings.featuredImagePreview && (
          <div className="pt-1">
            <span className="text-xs text-muted">{t("featuredImage")}</span>
            <img
              src={settings.featuredImagePreview}
              alt="Featured"
              className="w-full h-32 object-cover rounded-lg mt-1 border border-border"
            />
          </div>
        )}
        <ReviewRow label={t("category")} value={settings.categoryId != null ? categoryLabel : "-"} />
        <ReviewRow label={t("tags")} value={settings.tags.length > 0 ? settings.tags.join(", ") : "-"} />
        <ReviewRow label={t("author")} value={settings.authorId != null ? authorLabel : "-"} />
        <ReviewRow label={t("postStatus")} value={statusLabel} />
        {settings.excerpt && <ReviewRow label={t("excerpt")} value={settings.excerpt} />}
      </div>

      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <p className="text-xs text-foreground">
          <strong>{t("confirmNote")}</strong> {t("confirmNoteDesc")}
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted whitespace-nowrap min-w-[100px] text-xs">{label}:</span>
      <span className="text-foreground text-xs break-all">{value}</span>
    </div>
  );
}
