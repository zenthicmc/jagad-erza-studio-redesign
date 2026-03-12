"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { navigateWithOrigin, useBackNavigation } from "@/hooks/use-back-navigation";
import toast from "react-hot-toast";
import {
  Copy,
  Download,
  RefreshCw,
  FileDown,
  FileText,
  ArrowLeft,
  Sparkles,
  PlusCircle,
  Save,
  Clock,
  FolderPlus,
  SquarePen,
  Send,
  Check,
} from "lucide-react";

import { useArticleStore } from "@/stores/article-store";
import { Button } from "@/components/ui";
import { Dropdown } from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { downloadContent, getTitleFromElement } from "@/lib/download-utils";
import { handleWsValidationErrors } from "@/lib/error-handler";

import ListicleForm from "./listicle-form";
import FaqForm from "./faq-form";
import TiptapEditor from "./tiptap-editor";
import ImagePreview from "./image-preview";
import SourceList from "./source-list";
import { CreateCollectionModal } from "@/components/features/collection/create-collection-modal";
import { AddToCollectionModal } from "@/components/features/collection/add-to-collection-modal";

interface ArticleGeneratorProps {
  slug: string;
  id?: string;
}

const GENERATING_MESSAGES_COUNT = 7;

export default function ArticleGenerator({ slug, id }: ArticleGeneratorProps) {
  const t = useTranslations("article");
  const tRoot = useTranslations();
  const router = useRouter();

  const {
    generations,
    generate,
    regenerate,
    reloadImage,
    fetchArticle,
    removeArticleImage,
  } = useArticleStore();

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
     setHasMounted(true);
  }, []);

  const { goBack } = useBackNavigation(/^\/article\/.+/, "/article");

  const contentRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingImages, setIsRefreshingImages] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const currentGeneration = useMemo(() => {
    if (id && generations[id]) return generations[id];
    return undefined;
  }, [generations, id]);

  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentGeneration?.content) {
      setEditorContent(currentGeneration.content);
    }
  }, [currentGeneration?.id, currentGeneration?.content]);

  const isGenerating = useMemo(() => {
    if (isSubmitting) return true;
    if (hasMounted && currentGeneration) {
      return ["processing", "pending"].includes(
        (currentGeneration.status || "").toLowerCase(),
      );
    }
    return false;
  }, [isSubmitting, hasMounted, currentGeneration?.status]);

  const hasContent = !!currentGeneration?.content;

  const isDirty = useMemo(() => {
    if (!hasContent || !editorContent) return false;
    return editorContent !== currentGeneration?.content;
  }, [editorContent, currentGeneration?.content, hasContent]);

  const wordCount = useMemo(() => {
    if (!hasContent || !editorContent) return 0;
    const text = editorContent
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [editorContent, hasContent]);

  const lastFetchedId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (id && !isFetching && lastFetchedId.current !== id) {
      setIsFetching(true);
      lastFetchedId.current = id;

      fetchArticle(id, {
        onSuccess: () => setIsFetching(false),
        onError: () => {
          setIsFetching(false);
          toast.error(t("errorFetch") || "Failed to load article");
        },
      });
    } else if (!id && isFetching) {
      setIsFetching(false);
    }
  }, [id, isFetching, fetchArticle, t]);

  useEffect(() => {
    if (isGenerating) {
      messageIntervalRef.current = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % GENERATING_MESSAGES_COUNT);
      }, 5000);
    } else {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
      setMessageIndex(0);
    }
    return () => {
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, [isGenerating]);

  const handleSubmit = useCallback(
    async (
      payload: Record<string, unknown>,
      setError?: (
        name: string,
        error: { type?: string; message: string },
      ) => void,
    ) => {
      setIsSubmitting(true);
      try {
        const fieldMap =
          slug === "faq"
            ? {
              topics: "topic",
              writing_style: "writingStyle",
              language_style: "languageStyle",
              word_count: "wordLength",
              question_count: "askCount",
              custom_prompt: "advancedPrompt",
              keyword: "keywords",
            }
            : ({
              topics: "topic",
              writing_style: "writingStyle",
              language_style: "languageStyle",
              word_count: "wordCount",
              custom_prompt: "advancedPrompt",
              keyword: "keywords",
            } as Record<string, string>);

        await generate(payload, {
          onSuccess: (response: {
            id?: string;
            articles?: { id: string }[];
            topics?: { id: string }[];
            result?: { articles?: { id: string }[] };
          }) => {
            const newId =
              response?.id ||
              response?.result?.articles?.[0]?.id ||
              response?.articles?.[0]?.id ||
              response?.topics?.[0]?.id;

            if (newId && newId !== id) {
              router.push(`/article/${slug}/${newId}`);
            }
          },
          onError: (err) => {
            setIsSubmitting(false);
            if (setError) {
              handleWsValidationErrors(err as Record<string, unknown>, {
                setError,
                t: tRoot,
                fieldMap,
              });
            }
          },
        });
      } catch {
        setIsSubmitting(false);
      }
    },
    [generate, slug, id, router, tRoot],
  );

  const handleRegenerate = useCallback(async () => {
    if (!currentGeneration?.id) return;
    setIsSubmitting(true);
    try {
      await regenerate(currentGeneration.id, {
        onSuccess: () => setIsSubmitting(false),
        onError: () => setIsSubmitting(false),
      });
    } catch {
      setIsSubmitting(false);
    }
  }, [currentGeneration, regenerate]);

  const handleCopy = useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.innerText);
      toast.success(t("successCopy"));
    } catch {
      toast.error("Failed to copy");
    }
  }, [t]);

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      const el = contentRef.current;
      if (!el) return;
      setIsDownloading(true);
      const toastId = toast.loading(
        format === "pdf" ? t("generatingPdf") : t("generatingDocx"),
      );
      try {
        const title = getTitleFromElement(el) || "article";
        await downloadContent({ element: el, filename: title, format });
        toast.success(t("successDownload"), { id: toastId });
      } catch {
        toast.error(t("errorDownload"), { id: toastId });
      } finally {
        setIsDownloading(false);
      }
    },
    [t],
  );

  const handleSave = useCallback(async () => {
    if (!id || !editorContent) return;

    setIsSaving(true);
    const toastId = toast.loading(t("saving"));
    try {
      await useArticleStore.getState().saveArticle(id, editorContent, {
        onSuccess: () => toast.success(t("successSave"), { id: toastId }),
        onError: () => toast.error(t("errorSave"), { id: toastId }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [id, editorContent, t]);

  const handleAddToCollection = useCallback(async () => {
    if (!id) return;

    if (isDirty && editorContent) {
      setIsSaving(true);
      try {
        await useArticleStore.getState().saveArticle(id, editorContent, {
          onSuccess: () => toast.success(t("successSave")),
          onError: () => toast.error(t("errorSave")),
        });
      } finally {
        setIsSaving(false);
      }
    }

    setShowAddToCollection(true);
  }, [id, isDirty, editorContent, t]);

  const handleRefreshImages = useCallback(() => {
    if (!currentGeneration?.id) return;

    setIsRefreshingImages(true);
    reloadImage(currentGeneration.id, {
      onSuccess: () => setIsRefreshingImages(false),
      onError: (error) => {
        setIsRefreshingImages(false);
        toast.error(t("errorReloadImages"));
        console.error("Error reloading images:", error);
      },
    });
  }, [currentGeneration, reloadImage, t]);

  const handleImageError = useCallback(
    (image: { url: string }) => {
      if (!id) return;
      removeArticleImage(id, image.url);
    },
    [id, removeArticleImage],
  );

  const downloadItems: DropdownItem[] = [
    {
      label: "PDF",
      icon: <FileDown size={14} />,
      onClick: () => handleDownload("pdf"),
    },
    {
      label: "DOCX",
      icon: <FileText size={14} />,
      onClick: () => handleDownload("docx"),
    },
  ];

  const renderForm = () => {
    if (slug === "faq") {
      return (
        <FaqForm
          key={id || "new-faq"}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting || isGenerating}
        />
      );
    }
    return (
      <ListicleForm
        key={id || `new-${slug}`}
        articleType={slug}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting || isGenerating}
      />
    );
  };

  const historyItems = useMemo(() => {
    return Object.values(generations)
      .filter((art) => art.article_type_name === slug)
      .sort((a, b) => {
        const dateA = new Date(a.modified_at || a.created_at || 0).getTime();
        const dateB = new Date(b.modified_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [generations, slug]);

  const PulseIndicator = () => (
    <div className="flex items-center gap-1.5">
      <div
        className="w-1.5 h-5 bg-primary rounded-full animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="w-1.5 h-6 bg-primary rounded-full animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <div
        className="w-1.5 h-5 bg-primary rounded-full animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-var(--header-height))] gap-0 overflow-hidden">
        <aside className="w-full lg:w-90 xl:w-100 pb-5 shrink-0 border-r border-border flex flex-col bg-surface/30 overflow-hidden">
          <div className="p-5 border-b border-border shrink-0">
            <button
              onClick={() => goBack()}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft size={16} />
              {t("articleLabel")}
            </button>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              {t(`tools.${slug}.title` as Parameters<typeof t>[0])}
            </h1>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="px-5 space-y-5">
              {!id && renderForm()}

              {isGenerating && id && (
                <div className="mt-5 space-y-5">
                  <ImagePreview images={[]} isLoading={true} />
                  <SourceList sources={[]} isLoading={true} />
                </div>
              )}

              {!isGenerating && currentGeneration && (
                <div className="space-y-5 mt-5">
                  {currentGeneration?.images &&
                    currentGeneration.images.length > 0 && (
                      <ImagePreview
                        images={currentGeneration.images}
                        onRefresh={handleRefreshImages}
                        onImageError={handleImageError}
                        isRefreshing={isRefreshingImages}
                      />
                    )}
                  {currentGeneration?.references &&
                    currentGeneration.references.length > 0 && (
                      <SourceList sources={currentGeneration.references} />
                    )}
                </div>
              )}

              {historyItems.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                      <Clock size={16} />
                      {t("recentArticles")}
                    </div>
                    <button
                      onClick={() => router.push("/collection")}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      {t("seeMore")}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {historyItems.map((item) => {
                      const isActive = item.id === id;
                      const title =
                        item.title || item.topics?.[0] || t("articleLabel");
                      const date = (item.modified_at || item.created_at)
                        ? new Date(item.modified_at || item.created_at!).toLocaleDateString()
                        : "-";
                      const status = (item.status || "").toLowerCase();
                      const isInProgress =
                        status === "processing" ||
                        status === "in_progress" ||
                        status === "pending";

                      return (
                        <button
                          key={item.id}
                          onClick={() =>
                            router.push(`/article/${slug}/${item.id}`)
                          }
                          className={`w-full text-left px-2 py-2 rounded-lg transition-all duration-200 group flex items-center gap-3 ${isActive ? "bg-primary/5" : "hover:bg-background/60"
                            }`}
                        >
                          {isInProgress && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                          )}
                          <p
                            className={`text-sm font-medium line-clamp-1 flex-1 ${isActive
                              ? "text-primary"
                              : "text-foreground/90 group-hover:text-foreground"
                              }`}
                          >
                            {title}
                          </p>
                          <span className="text-xs text-muted/70 shrink-0">
                            {date}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-background/20 relative">
          {((hasContent && !isGenerating) || (isGenerating && id)) && (
            <div className="sticky top-0 z-20 flex items-center justify-between gap-1.5 p-3 border-b border-border bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                {isGenerating && (
                  <div className="flex items-center ml-2 gap-2 text-sm text-muted">
                    <PulseIndicator />
                    <span>{t("tracker.generating")}</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<PlusCircle size={14} />}
                  onClick={() => router.push(`/article/${slug}`)}
                  className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {t("newArticle")}
                </Button>
                <div className="flex flex-col px-3 border-l border-border">
                  <span className="text-xs font-semibold text-foreground">
                    {wordCount} {t("words")}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted">
                    {isSaving ? (
                      <>{t("saving")} <RefreshCw size={10} className="animate-spin" /></>
                    ) : isDirty ? (
                      <span className="text-amber-500">{t("unsaved")}</span>
                    ) : id ? (
                      <>{t("saved")} <Check size={10} className="text-green-500" /></>
                    ) : null}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<FolderPlus size={14} />}
                  onClick={handleAddToCollection}
                  disabled={isGenerating}
                  className="gap-1.5 text-muted hover:text-foreground hover:bg-muted/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {t("addToCollection")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<SquarePen size={14} />}
                  onClick={() => navigateWithOrigin(router, `/ai-tools/writing-assistant/${id}`)}
                  className="gap-1.5 text-muted hover:text-foreground hover:bg-muted/10 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={!id || isGenerating}
                >
                  Writing Assistant
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Copy size={14} />}
                  onClick={handleCopy}
                  disabled={isGenerating}
                  className="gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {t("copy")}
                </Button>

                <Dropdown
                  items={downloadItems}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 disabled:opacity-50 disabled:pointer-events-none"
                      disabled={isDownloading || isGenerating}
                      icon={<Download size={14} />}
                    >
                      {isDownloading ? t("downloading") : t("download")}
                    </Button>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={
                    isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )
                  }
                  onClick={handleSave}
                  disabled={isSaving || !id || !isDirty}
                  className={`gap-1.5 ${isDirty && "text-muted"}`}
                >
                  {isSaving ? t("saving") : t("save")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isSubmitting || isGenerating}
                  className="gap-1.5"
                  icon={
                    <RefreshCw
                      size={14}
                      className={isSubmitting ? "animate-spin" : ""}
                    />
                  }
                >
                  {t("form.regenerate")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={() => router.push(`/article/${slug}/${id}/post`)}
                  disabled={!id || isGenerating}
                  className={`gap-1.5`}
                >
                  {t("post")}
                </Button>
              </div>
            </div>
          )}

          <div className="p-6">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-8">
                <div className="relative">
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-full">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-8 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: "0ms" }}
                      />
                      <div
                        className="w-1.5 h-10 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: "150ms" }}
                      />
                      <div
                        className="w-1.5 h-8 bg-primary rounded-full animate-pulse"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-md">
                  <p className="text-sm text-foreground font-medium">
                    {t(
                      `generatingMessages.${messageIndex}` as Parameters<
                        typeof t
                      >[0],
                    )}
                  </p>
                  <p className="text-xs text-muted">{t("tips")}</p>
                </div>
              </div>
            ) : hasContent ? (
              <div ref={contentRef}>
                <TiptapEditor
                  content={currentGeneration?.content || ""}
                  onChange={(html) => setEditorContent(html)}
                  editable={true}
                />
              </div>
            ) : isFetching ? (
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
                <div className="space-y-4">
                  <div className="h-4 bg-surface rounded-lg animate-pulse" />
                  <div className="h-4 bg-surface rounded-lg w-11/12 animate-pulse" />
                  <div className="h-4 bg-surface rounded-lg animate-pulse" />
                </div>
                <div className="h-64 bg-surface rounded-xl animate-pulse" />
                <div className="space-y-4">
                  <div className="h-4 bg-surface rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-surface rounded-lg animate-pulse" />
                  <div className="h-4 bg-surface rounded-lg w-5/6 animate-pulse" />
                </div>
                <div className="flex items-center justify-center gap-3 py-8">
                  <PulseIndicator />
                  <p className="text-sm text-muted font-medium">
                    {t("loadingArticle") || "Loading article..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
                <div className="p-4 rounded-2xl bg-primary/10">
                  <FileText size={40} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {t("createArticle")}
                  </h3>
                  <p className="text-sm text-muted max-w-sm">
                    {t("guideWord.title")}{" "}
                    <span className="text-primary font-medium">
                      {t("guideWord.body")}
                    </span>{" "}
                    {t("guideWord.outContent")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <AddToCollectionModal
        isOpen={showAddToCollection}
        articleId={id || ""}
        onClose={() => setShowAddToCollection(false)}
        onCreateNew={() => setShowCollectionModal(true)}
      />

      <CreateCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        articleId={id}
      />
    </>
  );
}