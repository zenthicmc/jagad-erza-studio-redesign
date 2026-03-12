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
  SpellCheck,
  Plus,
  X,
  Check,
} from "lucide-react";

import { Button, Dropdown } from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { AddToCollectionModal } from "@/components/features/collection/add-to-collection-modal";
import { CreateCollectionModal } from "@/components/features/collection/create-collection-modal";
import { parseFileToText, SUPPORTED_FILE_ACCEPT } from "@/lib/parse-file-to-text";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { downloadContent } from "@/lib/download-utils";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface GrammarSentence {
  applied: boolean;
  original_text: string;
  sequence_order: number;
  suggestion_text: string;
  text: string;
}

interface GrammarResponse {
  article_id: string;
  content: string;
  sentences: GrammarSentence[];
}

interface GetGrammarResponse {
  article_id: string;
  content: string;
  request_content: string;
  sentences: GrammarSentence[];
}

function hasSuggestion(s: GrammarSentence): boolean {
  return (
    !!s.suggestion_text &&
    !!s.original_text &&
    s.suggestion_text !== s.original_text
  );
}

interface GrammarCheckerProps {
  id?: string;
}

export default function GrammarChecker({ id }: GrammarCheckerProps) {
  const t = useTranslations("grammarChecker");
  const tRoot = useTranslations();
  const router = useRouter();
  const { goBack, canGoBack } = useBackNavigation(/^\/ai-tools\/grammar-correction(\/.*)?$/);

  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [articleId, setArticleId] = useState("");
  const [correctedContent, setCorrectedContent] = useState("");
  const [sentences, setSentences] = useState<GrammarSentence[]>([]);
  const [dismissedOrders, setDismissedOrders] = useState<Set<number>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [patchingOrders, setPatchingOrders] = useState<Set<number>>(new Set());

  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const [isDownloading, setIsDownloading] = useState(false);

  const outputScrollRef = useRef<HTMLDivElement | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const suppressInputRef = useRef(false);

  const activeSuggestions = useMemo(
    () =>
      sentences.filter(
        (s) => hasSuggestion(s) && !s.applied && !dismissedOrders.has(s.sequence_order),
      ),
    [sentences, dismissedOrders],
  );

  const hasResult = correctedContent.length > 0 || sentences.length > 0;

  const wordCount = useMemo(() => {
    const text = inputText.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [inputText]);

  const escapeHtmlChars = useCallback((str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }, []);

  const highlightedHtml = useMemo(() => {
    if (!hasResult || sentences.length === 0) return null;

    const activeOrderSet = new Set(activeSuggestions.map((s) => s.sequence_order));

    const sorted = [...sentences].sort((a, b) => a.sequence_order - b.sequence_order);

    let html = "";

    for (const s of sorted) {
      const isActive = hasSuggestion(s) && activeOrderSet.has(s.sequence_order);

      if (!isActive) {
        html += escapeHtmlChars(s.text);
      } else {
        const suggIdx = s.text.indexOf(s.suggestion_text);
        if (suggIdx >= 0) {
          const before = s.text.slice(0, suggIdx);
          const after = s.text.slice(suggIdx + s.suggestion_text.length);
          const isSelected = selectedOrder === s.sequence_order;
          html += escapeHtmlChars(before);
          html += `<mark data-seq="${s.sequence_order}" class="grammar-highlight${isSelected ? " grammar-highlight--selected" : ""}" style="background: ${isSelected ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.10)"}; text-decoration: underline wavy; text-decoration-color: #f87171; text-underline-offset: 3px; text-decoration-thickness: 1.5px; border-radius: 2px; padding: 0 1px; cursor: pointer;">${escapeHtmlChars(s.original_text)}</mark>`;
          html += escapeHtmlChars(after);
        } else {
          const isSelected = selectedOrder === s.sequence_order;
          html += `<mark data-seq="${s.sequence_order}" class="grammar-highlight${isSelected ? " grammar-highlight--selected" : ""}" style="background: ${isSelected ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.10)"}; text-decoration: underline wavy; text-decoration-color: #f87171; text-underline-offset: 3px; text-decoration-thickness: 1.5px; border-radius: 2px; padding: 0 1px; cursor: pointer;">${escapeHtmlChars(s.text)}</mark>`;
        }
      }
      html += " ";
    }

    html = html.trimEnd().replace(/\n/g, "<br>");

    return html;
  }, [sentences, activeSuggestions, selectedOrder, hasResult, escapeHtmlChars]);

  useEffect(() => {
    if (!editorRef.current) return;
    if (highlightedHtml === null) return;

    suppressInputRef.current = true;

    editorRef.current.innerHTML = highlightedHtml;

    requestAnimationFrame(() => {
      suppressInputRef.current = false;
    });
  }, [highlightedHtml]);

  const handleEditorInput = useCallback(() => {
    if (suppressInputRef.current) return;
    if (!editorRef.current) return;

    const clone = editorRef.current.cloneNode(true) as HTMLElement;

    clone.querySelectorAll("br").forEach((br) => {
      br.replaceWith("\n");
    });

    clone.querySelectorAll("div, p").forEach((el) => {
      el.before("\n");
    });

    const newText = clone.textContent || "";

    setInputText(newText);
    setUploadedFileName(null);

    if (hasResult) {
      setCorrectedContent("");
      setSentences([]);
      setDismissedOrders(new Set());
      setSelectedOrder(null);
      setPatchingOrders(new Set());
    }
  }, [hasResult]);

  const handleEditorPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    },
    [],
  );

  const handleEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const mark = target.closest("mark[data-seq]") as HTMLElement | null;
      if (mark) {
        const seqStr = mark.getAttribute("data-seq");
        if (seqStr) {
          const seq = parseInt(seqStr, 10);
          setSelectedOrder(seq);

          const rect = mark.getBoundingClientRect();
          const containerRect = outputScrollRef.current?.getBoundingClientRect();
          if (containerRect) {
            setPopupPos({
              top: rect.bottom - containerRect.top + (outputScrollRef.current?.scrollTop || 0) + 4,
              left: rect.left - containerRect.left,
            });
          }
        }
      } else {
        setSelectedOrder(null);
        setPopupPos(null);
      }
    },
    [],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    if (highlightedHtml !== null) return;

    const currentText = editorRef.current.innerText || "";
    if (currentText !== inputText) {
      suppressInputRef.current = true;
      editorRef.current.textContent = inputText;
      requestAnimationFrame(() => {
        suppressInputRef.current = false;
      });
    }
  }, [inputText, highlightedHtml]);

  useEffect(() => {
    if (selectedOrder === null) {
      setPopupPos(null);
    }
  }, [selectedOrder]);


  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    const loadGrammar = async () => {
      try {
        const res = await api.get<{ result?: GetGrammarResponse } & GetGrammarResponse>(
          `/api/grammar/${id}`,
        );
        const data: GetGrammarResponse = res.data?.result || (res.data as GetGrammarResponse);
        if (!data || cancelled) return;

        setArticleId(data.article_id || id);
        setCorrectedContent(data.content || "");
        setSentences(data.sentences || []);

        if (data.request_content) {
          setInputText(data.request_content);
        }
      } catch {
        if (!cancelled) {
          toast.error(t("checkError"));
        }
      }
    };

    loadGrammar();

    return () => {
      cancelled = true;
    };
  }, [id, t]);

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
        setCorrectedContent("");
        setSentences([]);
        setDismissedOrders(new Set());
        setSelectedOrder(null);
        toast.success(t("fileUploaded"), { id: toastId });
      } catch {
        toast.error(t("fileProcessingError"), { id: toastId });
      } finally {
        setIsLoadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [t],
  );

  const handleClear = useCallback(() => {
    setInputText("");
    setCorrectedContent("");
    setSentences([]);
    setDismissedOrders(new Set());
    setSelectedOrder(null);
    setUploadedFileName(null);
    setArticleId("");
    setPatchingOrders(new Set());
  }, []);

  const handleRemoveFile = useCallback(() => {
    setInputText("");
    setUploadedFileName(null);
    setCorrectedContent("");
    setSentences([]);
    setDismissedOrders(new Set());
    setSelectedOrder(null);
  }, []);

  const handleCheck = useCallback(async () => {
    const currentText = sentences.length > 0
      ? [...sentences]
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map((s) => {
          if (hasSuggestion(s) && !s.applied) {
            const idx = s.text.indexOf(s.suggestion_text);
            if (idx >= 0) {
              return s.text.slice(0, idx) + s.original_text + s.text.slice(idx + s.suggestion_text.length);
            }
          }
          return s.text;
        })
        .join(" ")
      : inputText;

    if (!currentText.trim()) {
      toast.error(t("noTextError"));
      return;
    }

    setIsProcessing(true);
    setCorrectedContent("");
    setSentences([]);
    setDismissedOrders(new Set());
    setSelectedOrder(null);
    setPatchingOrders(new Set());

    const existingId = id || articleId;

    try {
      const res = await api.post<{ result?: GrammarResponse } & GrammarResponse>(
        "/api/grammar",
        {
          content: currentText.trim(),
          ...(existingId ? { article_id: existingId } : {}),
        },
      );

      const data: GrammarResponse = res.data?.result || (res.data as GrammarResponse);

      if (data.article_id) {
        setArticleId(data.article_id);
        const loc = Cookies.get("NEXT_LOCALE") || "en";
        window.history.replaceState(
          null,
          "",
          `/${loc}/ai-tools/grammar-correction/${data.article_id}`,
        );
      }

      setCorrectedContent(data.content || "");
      setSentences(data.sentences || []);
    } catch {
      toast.error(t("checkError"));
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, sentences, t, id, articleId]);

  const handleAccept = useCallback(
    async (seqOrder: number) => {
      if (!articleId) return;

      const sentence = sentences.find((s) => s.sequence_order === seqOrder);
      if (!sentence) return;

      setPatchingOrders((prev) => new Set(prev).add(seqOrder));

      try {
        await api.patch(
          `/api/grammar/${articleId}/sentences/${seqOrder}`,
          { applied: true },
        );

        setSentences((prev) =>
          prev.map((s) =>
            s.sequence_order === seqOrder ? { ...s, applied: true } : s,
          ),
        );

        const remaining = activeSuggestions.filter(
          (s) => s.sequence_order !== seqOrder,
        );
        if (selectedOrder === seqOrder) {
          if (remaining.length > 0) {
            const currentIdx = activeSuggestions.findIndex(
              (s) => s.sequence_order === seqOrder,
            );
            const nextIdx = Math.min(currentIdx, remaining.length - 1);
            setSelectedOrder(remaining[nextIdx].sequence_order);
          } else {
            setSelectedOrder(null);
          }
        }
      } catch {
        toast.error(t("checkError"));
      } finally {
        setPatchingOrders((prev) => {
          const next = new Set(prev);
          next.delete(seqOrder);
          return next;
        });
      }
    },
    [articleId, sentences, activeSuggestions, selectedOrder, t],
  );

  const handleDismiss = useCallback(
    async (seqOrder: number) => {
      if (!articleId) return;

      setPatchingOrders((prev) => new Set(prev).add(seqOrder));

      try {
        await api.patch(
          `/api/grammar/${articleId}/sentences/${seqOrder}`,
          { applied: false },
        );

        setDismissedOrders((prev) => new Set(prev).add(seqOrder));

        const remaining = activeSuggestions.filter(
          (s) => s.sequence_order !== seqOrder,
        );
        if (selectedOrder === seqOrder) {
          if (remaining.length > 0) {
            const currentIdx = activeSuggestions.findIndex(
              (s) => s.sequence_order === seqOrder,
            );
            const nextIdx = Math.min(currentIdx, remaining.length - 1);
            setSelectedOrder(remaining[nextIdx].sequence_order);
          } else {
            setSelectedOrder(null);
          }
        }
      } catch {
        toast.error(t("checkError"));
      } finally {
        setPatchingOrders((prev) => {
          const next = new Set(prev);
          next.delete(seqOrder);
          return next;
        });
      }
    },
    [articleId, activeSuggestions, selectedOrder, t],
  );

  const handleFixAll = useCallback(async () => {
    if (!articleId || activeSuggestions.length === 0) return;

    for (const s of activeSuggestions) {
      await handleAccept(s.sequence_order);
    }
  }, [articleId, activeSuggestions, handleAccept]);

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } catch {
        toast.error(t("copyError"));
      }
    },
    [t],
  );

  const correctedPlainText = useMemo(() => {
    if (sentences.length === 0) return correctedContent;
    return [...sentences]
      .sort((a, b) => a.sequence_order - b.sequence_order)
      .map((s) => s.text)
      .join(" ");
  }, [sentences, correctedContent]);

  const handleDownloadFormatted = useCallback(
    async (format: "pdf" | "docx") => {
      const text = correctedPlainText || inputText;
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

        const formatted = escapeHtml(text);
        const docTitle = t("title");
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
          paraLines.push(trimmed);
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
          filename: "grammar-checked-text",
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
    [inputText, correctedPlainText, t, tRoot],
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
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-surface/80 backdrop-blur-sm shadow-sm flex-shrink-0">
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
            <div className="flex items-center gap-2 pl-1 border-l-2 border-primary">
              <SpellCheck size={18} className="text-primary" />
              <h1 className="text-base font-semibold text-foreground">
                {t("title")}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(id || articleId) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                disabled={isProcessing}
                onClick={() => {
                  handleClear();
                  router.push(
                    `/${Cookies.get("NEXT_LOCALE") || "en"}/ai-tools/grammar-correction`,
                  );
                }}
              >
                {t("newCheck")}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<FolderPlus size={14} />}
                onClick={() => setShowAddToCollection(true)}
                disabled={!hasResult || isProcessing}
              >
                {t("addToCollection")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => handleCopy(correctedPlainText || inputText)}
                disabled={(!inputText && !hasResult) || isProcessing}
              >
                {t("copy")}
              </Button>
              <Dropdown
                items={downloadItems}
                disabled={!inputText && !hasResult}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 whitespace-nowrap"
                    disabled={(!inputText && !hasResult) || isDownloading || isProcessing}
                    icon={<Download size={14} />}
                  >
                    {isDownloading ? tRoot("article.generatingPdf") : t("download")}
                  </Button>
                }
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-stretch justify-center min-h-0 overflow-hidden p-5">
          <div className="w-full max-w-6xl border border-border/70 rounded-xl bg-surface/50 shadow-lg ring-1 ring-border/30 overflow-hidden flex flex-col min-h-0">
            {isProcessing && (
              <div className="flex items-center gap-3 px-5 py-2 border-b border-border bg-background/50">
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted max-w-[260px]">
                  <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                  <span className="truncate">{t("checking")}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border min-h-0 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-background/30">
                  <span className="text-[11px] font-medium text-muted uppercase tracking-wider">Input</span>
                </div>
                <div className="flex-1 min-h-0 p-4 overflow-y-auto relative" ref={outputScrollRef}>
                  {uploadedFileName && !hasResult && (
                    <span className="inline-flex items-center gap-2 text-sm text-foreground bg-background border border-primary/40 rounded-lg px-3 py-2 w-full mb-3">
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

                  <style>{`
                    .grammar-editor:empty::before {
                      content: attr(data-placeholder);
                      color: var(--color-muted);
                      pointer-events: none;
                    }
                    .grammar-editor:focus:empty::before {
                      content: attr(data-placeholder);
                    }
                  `}</style>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onPaste={handleEditorPaste}
                    onClick={handleEditorClick}
                    data-placeholder={t("placeholder")}
                    className="grammar-editor p-2 w-full h-full min-h-[200px] lg:min-h-0 bg-transparent text-foreground text-sm leading-relaxed focus:outline-none focus-visible:outline-none whitespace-pre-wrap break-words overflow-y-auto"
                  />

                  {popupPos && selectedOrder !== null && (() => {
                    const sentence = activeSuggestions.find(
                      (s) => s.sequence_order === selectedOrder,
                    );
                    if (!sentence) return null;
                    const isPatching = patchingOrders.has(sentence.sequence_order);

                    return (
                      <div
                        className="absolute z-50 bg-surface border border-border rounded-lg shadow-lg p-3 min-w-[200px] max-w-[320px]"
                        style={{ top: popupPos.top, left: popupPos.left }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-red-400 line-through">
                              {sentence.original_text}
                            </span>
                            {" "}
                            <span className="text-sm font-semibold text-emerald-500">
                              {sentence.suggestion_text}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDismiss(sentence.sequence_order)}
                            disabled={isPatching}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-muted hover:text-foreground rounded transition-colors disabled:opacity-50"
                          >
                            <X size={12} />
                            {t("ignore")}
                          </button>
                          <button
                            onClick={() => handleAccept(sentence.sequence_order)}
                            disabled={isPatching}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition-colors disabled:opacity-50"
                          >
                            {isPatching ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            {sentence.suggestion_text}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:h-12 sm:items-center sm:justify-between px-4 py-3 sm:py-0 border-t border-border bg-surface/30 flex-shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {wordCount}
                      </span>
                      {" "}{t("wordCount")}
                    </span>
                    {hasResult && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        <span className="font-semibold text-foreground">
                          {activeSuggestions.length > 0
                            ? t("errors", { count: activeSuggestions.length })
                            : t("noErrors")}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {(inputText || hasResult) && (
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

                    {!hasResult && (
                      <>
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
                      </>
                    )}

                    {hasResult && activeSuggestions.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Check size={14} />}
                        onClick={handleFixAll}
                        disabled={isProcessing || patchingOrders.size > 0}
                        className="rounded-sm border-red-400/50 text-red-500 hover:bg-red-500/10"
                      >
                        {t("fixAll")}
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      icon={
                        isProcessing ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <SpellCheck size={14} />
                        )
                      }
                      onClick={handleCheck}
                      disabled={isProcessing || !inputText.trim()}
                      className="rounded-sm"
                    >
                      {isProcessing ? t("checking") : t("check")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {activeSuggestions.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/40 flex-shrink-0">
                      <h3 className="text-[11px] font-medium text-muted uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {t("suggestionResult", { count: activeSuggestions.length })}
                      </h3>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                      {activeSuggestions.map((s) => {
                        const isSelected = selectedOrder === s.sequence_order;
                        const isPatching = patchingOrders.has(s.sequence_order);

                        return (
                          <div
                            key={`sugg-${s.sequence_order}`}
                            className={cn(
                              "rounded-xl border px-4 py-3 cursor-pointer transition-all duration-150",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                : "border-border bg-surface hover:border-border-hover hover:bg-surface/80",
                            )}
                            onClick={() => setSelectedOrder(s.sequence_order)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted line-through mb-1">
                                  {s.original_text}
                                </p>
                                <p className="text-sm font-semibold text-foreground underline decoration-wavy decoration-1 decoration-red-400 underline-offset-2">
                                  {s.suggestion_text}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismiss(s.sequence_order);
                                }}
                                className="flex-shrink-0 mt-0.5 p-0.5 text-muted hover:text-foreground rounded transition-colors"
                                title={t("dismiss")}
                              >
                                <X size={14} />
                              </button>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  icon={
                                    isPatching ? (
                                      <RefreshCw size={14} className="animate-spin" />
                                    ) : (
                                      <Check size={14} />
                                    )
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAccept(s.sequence_order);
                                  }}
                                  disabled={isPatching}
                                  className="rounded-sm"
                                >
                                  {t("accept")}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDismiss(s.sequence_order);
                                  }}
                                  className="rounded-sm"
                                >
                                  {t("dismiss")}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                    {isProcessing ? (
                      <>
                        <RefreshCw size={24} className="text-primary animate-spin mb-4" />
                        <p className="text-sm text-muted">{t("checking")}</p>
                      </>
                    ) : hasResult && activeSuggestions.length === 0 && sentences.some((s) => hasSuggestion(s)) ? (
                      <>
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                          <Check size={24} className="text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1.5">
                          {t("allResolved")}
                        </h3>
                        <p className="text-xs text-muted max-w-xs">
                          {t("allResolvedDescription")}
                        </p>
                      </>
                    ) : hasResult && activeSuggestions.length === 0 ? (
                      <>
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                          <Check size={24} className="text-emerald-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1.5">
                          {t("grammarCorrect")}
                        </h3>
                        <p className="text-xs text-muted max-w-xs">
                          {t("grammarCorrectDescription")}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                          <SpellCheck size={24} className="text-primary" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1.5">
                          {t("outputTitle")}
                        </h3>
                        <p className="text-xs text-muted max-w-xs">
                          {t("outputDescription")}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddToCollectionModal
        isOpen={showAddToCollection}
        articleId={articleId}
        onClose={() => setShowAddToCollection(false)}
        onCreateNew={() => setShowCollectionModal(true)}
      />

      <CreateCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        articleId={articleId}
        onCreated={() => setShowAddToCollection(false)}
      />
    </>
  );
}
