"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useBackNavigation } from "@/hooks/use-back-navigation";

import toast from "react-hot-toast";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Copy,
  Download,
  FolderPlus,
  RefreshCw,
  FileText,
  Sparkles,
  Plus,
} from "lucide-react";

import { Button, Select, Dropdown } from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { AddToCollectionModal } from "@/components/features/collection/add-to-collection-modal";
import { CreateCollectionModal } from "@/components/features/collection/create-collection-modal";
import { parseFileToText, SUPPORTED_FILE_ACCEPT } from "@/lib/parse-file-to-text";
import Cookies from "js-cookie";
import { streamTaskSse } from "@/lib/task-sse";
import api from "@/lib/api";
import { downloadContent } from "@/lib/download-utils";
import { useRouter } from "next/navigation";
import { htmlToPlainText } from "@/lib/html-to-plain";

interface ParaphraserProps {
  id?: string;
}
export default function Paraphraser({ id }: ParaphraserProps) {
  const t = useTranslations("paraphraser");
  const tRoot = useTranslations();
  const router = useRouter();
  const { goBack, canGoBack } = useBackNavigation(/^\/ai-tools\/paraphrase(\/.*)?$/);

  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [tone, setTone] = useState("");
  const [language, setLanguage] = useState("");
  const [synonyms, setSynonyms] = useState(1);

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [lastArticleId, setLastArticleId] = useState("");
  const [articleTitle, setArticleTitle] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    tone?: string;
    language?: string;
  }>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamedContentRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const outputScrollRef = useRef<HTMLDivElement | null>(null);

  const stripArticleIdPrefix = useCallback((value: string) => {
    return value.replace(/^article_id:[0-9a-fA-F-]+[#|\s]*/i, "");
  }, []);

  const flushStreamToUI = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      setOutputText(streamedContentRef.current);
      rafRef.current = null;
    });
  }, []);

  const wordCount = useMemo(() => {
    const text = inputText.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [inputText]);

  const outputWordCount = useMemo(() => {
    const text = outputText.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [outputText]);

  useEffect(() => {
    if (!isProcessing) return;
    const el = outputScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [outputText, isProcessing]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const loadArticle = async () => {
      try {
        const res = await api.get(`/api/articles/${id}`);
        const data = res.data?.result || res.data;
        if (!data || cancelled) return;

        setLastArticleId(data.id || id);
        if (typeof data.title === "string" && data.title.trim()) {
          setArticleTitle(data.title);
        }

        if (typeof data.content === "string" && data.content.trim()) {
          setOutputText(htmlToPlainText(data.content));
        }
        if (typeof data.original_content === "string" && data.original_content.trim()) {
          setInputText(data.original_content);
        } else if (typeof data.source_content === "string" && data.source_content.trim()) {
          setInputText(data.source_content);
        } else if (typeof data.content === "string") {
          setInputText(data.content);
        }

        if (typeof data.writing_style === "string") {
          setTone(data.writing_style);
        }
        if (typeof data.language === "string") {
          setLanguage(data.language);
        }
      } catch {
        if (!cancelled) {
          toast.error(t("paraphraseError"));
        }
      }
    };

    loadArticle();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const renderChangedMarkers = useCallback((text: string) => {
    const nodes: React.ReactNode[] = [];
    const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null = null;
    let key = 0;

    while ((match = re.exec(text)) !== null) {
      const start = match.index;
      const end = re.lastIndex;

      if (start > lastIndex) {
        nodes.push(text.slice(lastIndex, start));
      }

      if (match[1] != null) {
        nodes.push(
          <span
            key={`chg-${key++}`}
            className="bg-red-500/20 text-foreground rounded-sm px-0.5 font-semibold"
          >
            {match[1]}
          </span>,
        );
      } else if (match[2] != null) {
        nodes.push(
          <span
            key={`str-${key++}`}
            className="bg-[#FFBF00]/20 text-foreground rounded-sm px-0.5 font-semibold"
          >
            {match[2]}
          </span>,
        );
      }

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  }, []);

  const toneOptions = useMemo(
    () => [
      { label: t("tones.standard"), value: "standard" },
      { label: t("tones.formal"), value: "formal" },
      { label: t("tones.informal"), value: "informal" },
      { label: t("tones.simplified"), value: "simplified" },
      { label: t("tones.academic"), value: "academic" },
      { label: t("tones.professional"), value: "professional" },
      { label: t("tones.persuasive"), value: "persuasive" },
    ],
    [t]
  );

  const languageOptions = useMemo(
    () => [
      { label: "English", value: "en" },
      { label: "Indonesian", value: "id" },
    ],
    []
  );

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowed = ["txt", "md", "pdf", "doc", "docx"];
      if (!ext || !allowed.includes(ext)) {
        toast.error(t("unsupportedFile"));
        return;
      }

      setIsLoadingFile(true);
      const toastId = toast.loading(t("processingFile"));

      try {
        const text = await parseFileToText(file);
        setInputText(text);
        setUploadedFileName(file.name);
        toast.success(t("fileUploaded"), { id: toastId });
      } catch {
        toast.error(t("fileProcessingError"), { id: toastId });
      } finally {
        setIsLoadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [t]
  );

  const handleClear = useCallback(() => {
    setInputText("");
    setOutputText("");
    setUploadedFileName(null);
    setLastArticleId("");
    setFieldErrors({});
  }, []);

  const handleRemoveFile = useCallback(() => {
    setInputText("");
    setUploadedFileName(null);
  }, []);

  const handleParaphrase = useCallback(async () => {
    if (!inputText.trim()) {
      toast.error(t("noTextError"));
      return;
    }

    const newErrors: typeof fieldErrors = {};
    if (!tone) {
      newErrors.tone = tRoot("article.form.errorRequired");
    }
    if (!language) {
      newErrors.language = tRoot("article.form.errorRequired");
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...newErrors }));
      return;
    }

    const selectedTone = tone;
    const lang = language;

    setIsProcessing(true);
    setProgressMessage("");
    setOutputText("");
    streamedContentRef.current = "";
    setFieldErrors({});
    abortControllerRef.current = new AbortController();

    let hasStreamError = false;

    try {
      const token = Cookies.get("access_token");
      const locale = Cookies.get("NEXT_LOCALE") || "en";

      await streamTaskSse(
        {
          url: "/api/paraphrase",
          body: {
            content: inputText.trim(),
            language: lang,
            tone: selectedTone,
            synonym_level: synonyms,
            ...(lastArticleId || id ? { article_id: lastArticleId || id } : {}),
          },
          headers: {
            "Accept-Language": locale,
            "X-Timezone-Offset": String(new Date().getTimezoneOffset()),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: abortControllerRef.current.signal,
        },
        {
          onProgress: (result: any) => {
            if (typeof result?.message === "string") {
              setProgressMessage(result.message);
            }
            if (typeof result?.content === "string") {
              const cleaned = stripArticleIdPrefix(result.content);
              streamedContentRef.current += cleaned;
              flushStreamToUI();
            }
          },
          onCompleted: (result: any) => {
            if (!streamedContentRef.current && typeof result?.content === "string") {
              const cleaned = stripArticleIdPrefix(result.content);
              streamedContentRef.current = cleaned;
            }
            setOutputText(streamedContentRef.current || result?.content || "");
            if (typeof result?.title === "string" && result.title.trim()) {
              setArticleTitle(result.title);
            }
            if (typeof result?.article_id === "string") {
              setLastArticleId(result.article_id);
              const locale = window.location.pathname.split("/")[1] || "en";
              window.history.replaceState(null, "", `/${locale}/ai-tools/paraphrase/${result.article_id}`);
              if (!result.title) {
                api.get(`/api/articles/${result.article_id}`).then((res) => {
                  const d = res.data?.result || res.data;
                  if (typeof d?.title === "string" && d.title.trim()) {
                    setArticleTitle(d.title);
                  }
                }).catch(() => {});
              }
            }
          },
          onFailed: (message) => {
            hasStreamError = true;
            toast.error(message || t("paraphraseError"));
          },
        },
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!hasStreamError) {
        toast.error(t("paraphraseError"));
      }
    } finally {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setIsProcessing(false);
      setProgressMessage("");
      abortControllerRef.current = null;
    }
  }, [inputText, tone, language, t, tRoot, flushStreamToUI]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } catch {
        toast.error(t("copyError"));
      }
    },
    [t]
  );

  const handleDownload = useCallback(() => {
    const text = outputText || inputText;
    if (!text) return;

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "paraphrased-text.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("downloaded"));
  }, [outputText, inputText, t]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadFormatted = useCallback(
    async (format: "pdf" | "docx") => {
      const text = outputText || inputText;
      if (!text) return;

      setIsDownloading(true);
      const toastId = toast.loading(
        format === "pdf" ? tRoot("article.generatingPdf") : tRoot("article.generatingDocx"),
      );

      try {
        const escapeHtml = (value: string) =>
          value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        let formatted = escapeHtml(text);

        formatted = formatted.replace(
          /\*\*(.+?)\*\*/g,
          '<span style="background-color:rgba(239,68,68,0.2);font-weight:600;">$1</span>',
        );
        formatted = formatted.replace(
          /\*(.+?)\*/g,
          '<span style="background-color:rgba(255,191,0,0.2);font-weight:600;">$1</span>',
        );

        const docTitle = articleTitle || t("title");
        const titleHtml = `<h1>${escapeHtml(docTitle)}</h1>`;

        const lines = formatted.split("\n");
        const htmlParts: string[] = [];
        let paraLines: string[] = [];

        const flushParagraph = () => {
          const joined = paraLines
            .map((l) => l.trim())
            .filter(Boolean)
            .join("<br/>");
          if (joined) htmlParts.push(`<p>${joined}</p>`);
          paraLines = [];
        };

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            continue;
          }
          if (trimmed.startsWith("### ")) {
            paraLines.push(trimmed.slice(4));
          } else if (trimmed.startsWith("## ")) {
            paraLines.push(trimmed.slice(3));
          } else if (trimmed.startsWith("# ")) {
            paraLines.push(trimmed.slice(2));
          } else {
            paraLines.push(trimmed);
          }
        }
        flushParagraph();

        const html = titleHtml + (htmlParts.join("") || `<p>${formatted}</p>`);

        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.left = "-99999px";
        container.style.top = "0";
        container.style.width = "800px";
        container.innerHTML = html;
        document.body.appendChild(container);

        await downloadContent({
          element: container,
          filename: "paraphrased-text",
          format,
        });

        toast.success(tRoot("article.successDownload"), { id: toastId });

        document.body.removeChild(container);
      } catch {
        toast.error(tRoot("article.errorDownload"), { id: toastId });
      } finally {
        setIsDownloading(false);
      }
    },
    [inputText, outputText, articleTitle, t, tRoot],
  );

  const downloadItems: DropdownItem[] = [
    { label: "PDF", icon: <Download size={14} />, onClick: () => handleDownloadFormatted("pdf") },
    {
      label: "DOCX",
      icon: <FileText size={14} />,
      onClick: () => handleDownloadFormatted("docx"),
    },
  ];

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-surface flex-shrink-0">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft size={16} />
                {t("back")}
              </button>
            )}
            {canGoBack && <div className="w-px h-5 bg-border" />}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <Sparkles size={15} className="text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">
                  {t("title")}
                </h1>
                <p className="text-[11px] text-muted leading-tight hidden sm:block">AI-powered text paraphraser</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(id || lastArticleId) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                disabled={isProcessing}
                onClick={() => {
                  setInputText("");
                  setOutputText("");
                  setTone("");
                  setLanguage("");
                  setSynonyms(1);
                  setUploadedFileName(null);
                  setLastArticleId("");
                  setFieldErrors({});
                  setProgressMessage("");
                  streamedContentRef.current = "";
                  router.push(`/${Cookies.get("NEXT_LOCALE") || "en"}/ai-tools/paraphrase`);
                }}
              >
                {t("newParaphrase")}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<FolderPlus size={14} />}
                onClick={() => setShowAddToCollection(true)}
                disabled={!outputText || isProcessing}
              >
                {t("addToCollection")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => handleCopy(outputText || inputText)}
                disabled={(!inputText && !outputText) || isProcessing}
              >
                {t("copy")}
              </Button>
              <Dropdown
                items={downloadItems}
                disabled={!inputText && !outputText}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 whitespace-nowrap"
                    disabled={(!inputText && !outputText) || isDownloading || isProcessing}
                    icon={<Download size={14} />}
                  >
                    {isDownloading ? tRoot("article.generatingPdf") : t("download")}
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-stretch justify-center min-h-0 overflow-hidden p-4">
          <div className="w-full max-w-6xl border border-border rounded-xl overflow-hidden flex flex-col min-h-0 shadow-xl" style={{background: 'var(--surface)'}}>
            <div className="relative flex items-center gap-3 px-5 py-3 border-b border-border overflow-visible" style={{background: 'var(--bg)'}}>
              <div className="w-48">
                <Select
                  options={toneOptions}
                  value={tone}
                  onChange={(val) => {
                    setTone(val);
                    setFieldErrors((prev) => ({ ...prev, tone: undefined }));
                  }}
                  placeholder={t("tonePlaceholder")}
                  size="sm"
                  error={fieldErrors.tone}
                />
              </div>
              <div className="w-48">
                <Select
                  options={languageOptions}
                  value={language}
                  onChange={(val) => {
                    setLanguage(val);
                    setFieldErrors((prev) => ({ ...prev, language: undefined }));
                  }}
                  placeholder={t("languagePlaceholder")}
                  size="sm"
                  error={fieldErrors.language}
                />
              </div>

              <div className="relative group flex items-center gap-2 ml-auto">
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                  {t("synonyms")}
                </span>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={synonyms}
                  onChange={(e) => setSynonyms(Number(e.target.value))}
                  className="slider w-24 cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground w-3 text-center">
                  {synonyms}
                </span>

                <div className="absolute top-full mt-2 right-0 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
                  <div className="flex items-stretch rounded-lg border border-border bg-surface shadow-lg overflow-hidden whitespace-nowrap">
                    <div className="px-3 py-2 text-center">
                      <div className="text-xs font-semibold text-foreground">{t("synonymsFewerChanges")}</div>
                      <div className="text-[10px] text-muted">{t("synonymsMoreAccurate")}</div>
                    </div>
                    <div className="w-px bg-border" />
                    <div className="px-3 py-2 text-center">
                      <div className="text-xs font-semibold text-foreground">{t("synonymsMoreChanges")}</div>
                      <div className="text-[10px] text-muted">{t("synonymsLessAccurate")}</div>
                    </div>
                  </div>
                </div>
              </div>

              {isProcessing && (
                <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted max-w-[260px]">
                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                  <span className="truncate">
                    {t("processing")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border min-h-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 h-10 border-b border-border" style={{background: 'var(--bg)'}}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-foreground">Input</span>
                  </div>
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-hidden">
                  {uploadedFileName && (
                    <span className="inline-flex items-center gap-2 text-sm text-foreground bg-background border border-primary/40 rounded-lg px-3 py-2 w-full">
                      <FileText size={14} className="text-primary flex-shrink-0" />
                      <span className="truncate" title={uploadedFileName}>
                        {uploadedFileName}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={handleRemoveFile}
                        title={t("removeFile")}
                        className="ml-auto text-red-500 hover:text-red-400 hover:bg-transparent"
                      />
                    </span>
                  )}
                  <textarea
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      setUploadedFileName(null);
                    }}
                    placeholder={t("placeholder")}
                    className="p-2 mt-3 w-full h-full min-h-[200px] lg:min-h-0 bg-transparent text-foreground text-sm leading-relaxed placeholder:text-muted resize-none focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:h-14 sm:items-center sm:justify-between px-4 py-3 sm:py-0 border-t border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                      <span className="uppercase tracking-wide text-[10px]">
                        {t("wordCount")}
                      </span>
                      <span className="font-semibold text-foreground text-[10px]">
                        {wordCount}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {inputText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={handleClear}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        {t("clear")}
                      </Button>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={SUPPORTED_FILE_ACCEPT}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Upload size={14} />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoadingFile || !!inputText.trim()}
                      className="rounded-sm"
                    >
                      {t("uploadFile")}
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        isProcessing ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )
                      }
                      onClick={handleParaphrase}
                      disabled={isProcessing || !inputText.trim()}
                      className="rounded-sm"
                    >
                      {isProcessing ? t("processing") : t("paraphrase")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 h-10 border-b border-border" style={{background: 'var(--bg)'}}>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                    <span className="text-xs font-semibold text-foreground">Output</span>
                  </div>
                  {outputText && (
                    <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">Ready</span>
                  )}
                </div>
                <div
                  ref={outputScrollRef}
                  className="flex-1 min-h-0 p-4 overflow-y-auto"
                >
                  {outputText ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {renderChangedMarkers(outputText)}
                    </p>
                  ) : progressMessage ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                      <RefreshCw size={28} className="text-primary animate-spin" />
                      <p className="text-sm text-muted">{progressMessage}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Sparkles size={28} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">
                          {t("outputTitle")}
                        </h3>
                        <p className="text-xs text-muted max-w-[200px] leading-relaxed">
                          {t("outputDescription")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {outputText && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-3 h-3 rounded-sm bg-red-500/20 flex-shrink-0" />
                        {t("changedWords")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-3 h-3 rounded-sm bg-[#FFBF00]/20 flex-shrink-0" />
                        {t("structureChange")}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                      <span className="uppercase tracking-wide text-[10px]">
                        {t("wordCount")}
                      </span>
                      <span className="font-semibold text-foreground text-[10px]">
                        {outputWordCount}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddToCollectionModal
        isOpen={showAddToCollection}
        articleId={lastArticleId}
        onClose={() => setShowAddToCollection(false)}
        onCreateNew={() => setShowCollectionModal(true)}
      />

      <CreateCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        articleId={lastArticleId}
        onCreated={() => setShowAddToCollection(false)}
      />
    </>
  );
}
