"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ScanSearch,
  RefreshCw,
  Upload,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  FileText,
  FolderPlus,
  Plus,
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui";
import { AddToCollectionModal } from "@/components/features/collection/add-to-collection-modal";
import { CreateCollectionModal } from "@/components/features/collection/create-collection-modal";
import { parseFileToText, SUPPORTED_FILE_ACCEPT } from "@/lib/parse-file-to-text";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import Cookies from "js-cookie";

const MIN_WORDS = 300;

interface DetectorSentenceScore {
  text: string;
  ai_score: number;
  human_score: number;
}

interface AiDetectorProps {
  id?: string;
}

export default function AiDetector({ id }: AiDetectorProps) {
  const t = useTranslations("aiDetector");
  const router = useRouter();
  const { goBack, canGoBack } = useBackNavigation(/^\/ai-tools\/ai-detector(\/.*)?$/);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<{
    aiScore: number;
    humanScore: number;
    sentences?: DetectorSentenceScore[];
  } | null>(null);
  const [understandingOpen, setUnderstandingOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const [lastArticleId, setLastArticleId] = useState("");
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  const sentenceRangesRef = useRef<{ start: number; end: number }[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadArticle = async () => {
      try {
        const res = await api.get(`/api/detect/${id}`);
        const data = res.data?.result || res.data;
        if (!data || cancelled) return;

        setLastArticleId(id);

        if (typeof data.content === "string" && data.content.trim()) {
          setInputText(data.content);
        }

        if (typeof data.ai_score === "number" && typeof data.human_score === "number") {
          setResult({
            aiScore: data.ai_score,
            humanScore: data.human_score,
            sentences: Array.isArray(data.sentences)
              ? data.sentences.map((s: { text?: string; ai_score?: number; human_score?: number }) => ({
                text: s.text || "",
                ai_score: s.ai_score ?? 0,
                human_score: s.human_score ?? 0,
              }))
              : undefined,
          });
        }
      } catch {
        if (!cancelled) {
          toast.error(t("analysisError"));
        }
      }
    };

    loadArticle();
    return () => { cancelled = true; };
  }, [id, t]);

  const scrollToSentence = useCallback((idx: number) => {
    const range = sentenceRangesRef.current[idx];
    if (!range || !textareaRef.current) return;
    const textarea = textareaRef.current;

    const mirror = document.createElement("div");
    const style = window.getComputedStyle(textarea);
    mirror.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: ${style.width};
      font-size: ${style.fontSize};
      font-family: ${style.fontFamily};
      font-weight: ${style.fontWeight};
      line-height: ${style.lineHeight};
      letter-spacing: ${style.letterSpacing};
      padding: ${style.padding};
      border: ${style.border};
      box-sizing: ${style.boxSizing};
    `;

    mirror.textContent = textarea.value.slice(0, range.start);
    document.body.appendChild(mirror);
    const offsetTop = mirror.offsetHeight;
    document.body.removeChild(mirror);

    const targetScroll = offsetTop - textarea.clientHeight / 3;
    textarea.scrollTop = Math.max(0, targetScroll);
    textarea.focus();
    textarea.setSelectionRange(range.start, range.end);

    if (overlayRef.current) {
      overlayRef.current.scrollTop = textarea.scrollTop;
    }
  }, []);

  const highlightedInput = useMemo<ReactNode>(() => {
    if (!inputText || !result?.sentences?.length) return inputText;

    const nodes: ReactNode[] = [];
    let cursor = 0;
    const base = inputText;
    const ranges: { start: number; end: number }[] = [];

    result.sentences.forEach((s, idx) => {
      const text = s.text?.trim();
      if (!text) return;

      const matchIndex = base.indexOf(text, cursor);
      if (matchIndex === -1) return;

      if (matchIndex > cursor) {
        nodes.push(base.slice(cursor, matchIndex));
      }

      const endIndex = matchIndex + text.length;
      const spanText = base.slice(matchIndex, endIndex);
      const isAiDominant = s.ai_score >= s.human_score;

      ranges[idx] = { start: matchIndex, end: endIndex };

      if (isAiDominant) {
        nodes.push(
          <mark
            key={`${matchIndex}-${idx}`}
            className="bg-amber-500/20 text-foreground rounded-[3px] px-0.5 pointer-events-auto cursor-pointer"
            onClick={() => setActiveSentenceIndex(idx)}
          >
            {spanText}
          </mark>,
        );
      } else {
        nodes.push(spanText);
      }

      cursor = endIndex;
    });

    if (cursor < base.length) {
      nodes.push(base.slice(cursor));
    }

    sentenceRangesRef.current = ranges;
    return nodes;
  }, [inputText, result?.sentences, setActiveSentenceIndex]);

  const wordCount = useMemo(() => {
    const text = inputText.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [inputText]);

  const canScan = wordCount >= MIN_WORDS;

  const handleScan = useCallback(async () => {
    if (!inputText.trim() || !canScan) {
      toast.error(t("noTextError"));
      return;
    }

    setIsScanning(true);
    setResult(null);
    const toastId = toast.loading(t("scanning"));

    try {
      const response = await api.post("/api/detect/text", {
        content: inputText.trim(),
        ...(lastArticleId || id ? { article_id: lastArticleId || id } : {}),
      });

      const payload = response.data?.result || response.data;
      const aiScoreRaw = payload?.ai_score;
      const humanScoreRaw = payload?.human_score;
      const sentencesRaw = payload?.sentences;

      if (typeof aiScoreRaw !== "number" || typeof humanScoreRaw !== "number") {
        throw new Error("Invalid detector response");
      }

      setResult({
        aiScore: aiScoreRaw,
        humanScore: humanScoreRaw,
        sentences: Array.isArray(sentencesRaw) ? sentencesRaw : undefined,
      });

      if (typeof payload?.article_id === "string") {
        setLastArticleId(payload.article_id);
        const locale = window.location.pathname.split("/")[1] || "en";
        window.history.replaceState(null, "", `/${locale}/ai-tools/ai-detector/${payload.article_id}`);
      }

      toast.success(t("analysisComplete"), { id: toastId });
    } catch {
      toast.error(t("analysisError"), { id: toastId });
    } finally {
      setIsScanning(false);
    }
  }, [inputText, canScan, t]);

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
    setResult(null);
    setUploadedFileName(null);
  }, []);

  const handleCopy = useCallback(
    async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("copied"));
      } catch {
        toast.error(t("copyError"));
      }
    },
    [t]
  );

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
                <ScanSearch size={15} className="text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground leading-tight">
                  {t("title")}
                </h1>
                <p className="text-[11px] text-muted leading-tight hidden sm:block">AI-powered content detector</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(id || lastArticleId) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                disabled={isScanning}
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setUploadedFileName(null);
                  setLastArticleId("");
                  setActiveSentenceIndex(null);
                  setUnderstandingOpen(false);
                  router.push(`/${Cookies.get("NEXT_LOCALE") || "en"}/ai-tools/ai-detector`);
                }}
              >
                {t("newScan")}
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<FolderPlus size={14} />}
                onClick={() => setShowAddToCollection(true)}
                disabled={!result || isScanning || !lastArticleId}
              >
                {t("addToCollection")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => handleCopy(inputText)}
                disabled={!inputText}
              >
                {t("copy")}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-stretch min-h-0 p-4">
          <div className="w-full max-w-6xl mx-auto border border-border rounded-xl overflow-hidden flex flex-col lg:flex-row min-h-[500px] shadow-xl" style={{background: 'var(--surface)'}}>
            <div className="flex-[2] flex flex-col border-b lg:border-b-0 lg:border-r border-border min-h-0 min-w-0">
              <div className="flex items-center justify-between px-4 h-10 border-b border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-foreground">Input</span>
                </div>
              </div>
              {uploadedFileName && (
                <div className="flex-shrink-0 px-4 pt-3 pb-1">
                  <span className="inline-flex items-center gap-2 text-sm text-foreground bg-background border border-primary/40 rounded-lg px-3 py-2 w-full">
                    <FileText size={14} className="text-primary flex-shrink-0" />
                    <span className="truncate" title={uploadedFileName}>
                      {uploadedFileName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      onClick={handleClear}
                      className="ml-auto hover:bg-transparent hover:text-red-500"
                    />
                  </span>
                </div>
              )}
              <div className="flex-1 p-4 overflow-hidden min-h-[200px]">
                <div className="relative w-full h-full">
                  <div
                    ref={overlayRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 p-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground overflow-hidden"
                  >
                    {result?.sentences?.length ? highlightedInput : inputText}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      if (!e.target.value) setUploadedFileName(null);
                    }}
                    onClick={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      const ranges = sentenceRangesRef.current;
                      const idx = ranges.findIndex(
                        (r) => pos >= r.start && pos <= r.end,
                      );
                      if (idx !== -1) {
                        setActiveSentenceIndex(idx);
                      }
                    }}
                    onKeyUp={(e) => {
                      const pos = e.currentTarget.selectionStart ?? 0;
                      const ranges = sentenceRangesRef.current;
                      const idx = ranges.findIndex(
                        (r) => pos >= r.start && pos <= r.end,
                      );
                      if (idx !== -1) {
                        setActiveSentenceIndex(idx);
                      }
                    }}
                    placeholder={t("placeholder")}
                    onScroll={(e) => {
                      if (overlayRef.current) {
                        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                      }
                    }}
                    className="relative p-2 w-full h-full min-h-[180px] lg:min-h-0 bg-transparent text-transparent caret-foreground text-sm leading-relaxed placeholder:text-muted resize-none overflow-y-auto focus:outline-none focus-visible:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
                <div className="text-xs text-muted">
                  {t("wordCount")}: {wordCount}
                  {wordCount > 0 && wordCount < MIN_WORDS && (
                    <span className="text-amber-600 dark:text-amber-400 ml-1">
                      ({t("minWords", { count: MIN_WORDS })})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
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
                    className="rounded-sm"
                    icon={
                      isScanning ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <ScanSearch size={14} />
                      )
                    }
                    onClick={handleScan}
                    disabled={isScanning || !canScan}
                  >
                    {isScanning ? t("scanning") : t("scan")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              <div className="flex items-center justify-between px-4 h-10 border-b border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                  <span className="text-xs font-semibold text-foreground">Analysis</span>
                </div>
                {result && (
                  <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">Done</span>
                )}
              </div>
              <div className="flex-1 p-4 overflow-y-auto flex flex-col">
                {!result ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-12 max-w-sm mx-auto gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <ScanSearch size={28} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {t("emptyStateTitle")}
                      </h3>
                      <p className="text-sm text-muted leading-relaxed">
                        {t("emptyStateHint")}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs text-muted" style={{background: 'var(--bg)'}}>
                        {t("emptyStateTip1")}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border px-3 py-1.5 text-xs text-muted" style={{background: 'var(--bg)'}}>
                        {t("emptyStateTip2")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 text-center py-5 px-4 rounded-xl border border-border" style={{background: 'var(--bg)'}}>
                      <p className="text-5xl font-bold text-foreground tabular-nums">
                        {result.aiScore >= result.humanScore
                          ? result.aiScore
                          : result.humanScore}
                        <span className="text-2xl">%</span>
                      </p>
                      <p className="text-xs text-muted mt-1.5 font-medium uppercase tracking-wide">
                        {result.aiScore >= result.humanScore
                          ? t("ofTextLikelyAi")
                          : t("ofTextLikelyHuman")}
                      </p>
                    </div>

                    <div className="h-[160px] w-full mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: "AI", value: result.aiScore, fill: "var(--color-amber-500)" },
                            {
                              name: "Human",
                              value: result.humanScore,
                              fill: "var(--color-emerald-500)",
                            },
                          ]}
                          margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12, fill: "var(--color-foreground)" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            hide
                          />
                          <Bar
                            dataKey="value"
                            radius={[4, 4, 0, 0]}
                            isAnimationActive
                            animationDuration={500}
                          >
                            <Cell fill="rgb(245 158 11)" />
                            <Cell fill="rgb(16 185 129)" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border p-3" style={{background: 'var(--bg)'}}>
                      <div className="flex items-center justify-between gap-2 py-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {t("aiGenerated")}
                          <Info size={14} className="text-muted-foreground/70" />
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {result.aiScore}%
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-px bg-border/50" />
                      <div className="flex items-center justify-between gap-2 py-1">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                          {t("humanWritten")}
                          <Info size={14} className="text-muted-foreground/70" />
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {result.humanScore}%
                          </span>
                        </span>
                      </div>
                    </div>

                    {result.sentences && result.sentences.length > 0 && (
                      <div className="mt-6 border-t border-border pt-4 flex-shrink-0 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 rounded-full bg-primary/60 flex-shrink-0" />
                          <p className="text-xs font-semibold text-foreground">
                            Sentence Analysis
                          </p>
                        </div>
                        <div className="space-y-2 max-h-52 overflow-y-auto overflow-x-hidden pr-1">
                          {result.sentences.map((s, idx) => {
                            const isAiDominant = s.ai_score >= s.human_score;
                            const isActive = idx === activeSentenceIndex;
                            const badgeClasses = isAiDominant
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";

                            return (
                              <div
                                key={`${s.text}-${idx}`}
                                className={cn(
                                  "rounded-xl border px-3 py-2 text-xs leading-relaxed cursor-pointer bg-surface border-border transition-all duration-150",
                                  (isActive && "border-primary bg-primary/10 text-foreground! ring-1 ring-primary/20")
                                )}
                                onClick={() => {
                                  setActiveSentenceIndex(idx);
                                  scrollToSentence(idx);
                                }}
                              >
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <p className="text-foreground flex-1">{s.text}</p>

                                </div>
                                <div className="flex items-center justify-between gap-2 mt-2">
                                  <span
                                    className={
                                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap " +
                                      badgeClasses
                                    }
                                  >
                                    {isAiDominant ? t("aiGenerated") : t("humanWritten")}
                                  </span>
                                  <p className="text-[11px] text-muted tabular-nums">
                                    AI: {s.ai_score.toFixed(2)} • Human:{" "}
                                    {s.human_score.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-6 border-t border-border pt-4 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setUnderstandingOpen((o) => !o)}
                        className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {t("understandingResults")}
                        {understandingOpen ? (
                          <ChevronUp size={16} className="text-muted" />
                        ) : (
                          <ChevronDown size={16} className="text-muted" />
                        )}
                      </button>
                      {understandingOpen && (
                        <div className="mt-3 text-xs text-muted-foreground leading-relaxed space-y-2 max-h-32 overflow-y-auto">
                          <p>{t("understandingResultsDesc")}</p>
                        </div>
                      )}
                    </div>
                  </>
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
