"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { usePathname } from "next/navigation";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import toast from "react-hot-toast";
import {
  Copy,
  Download,
  ArrowLeft,
  Sparkles,
  Save,
  FolderPlus,
  Send,
  RefreshCw,
  PanelRightOpen,
  PanelRightClose,
  X,
  MessageSquare,
  Upload,
  FileText,
  FileDown,
  Check,
  PlusCircle,
} from "lucide-react";

import { Button, Dropdown } from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { downloadContent, getTitleFromElement } from "@/lib/download-utils";

import WritingEditor from "./writing-editor";
import api from "@/lib/api";
import { parseFileToHtml } from "@/lib/file-to-html";
import { uploadAndReplaceImages, stripBase64Images, replaceBase64WithUrls } from "@/lib/image-upload";
import { marked } from "marked";
import { AddToCollectionModal } from "@/components/features/collection/add-to-collection-modal";
import { CreateCollectionModal } from "@/components/features/collection/create-collection-modal";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AISuggestion {
  suggestedText: string;
  range: { from: number; to: number } | null;
  cursorPosition?: number;
}

interface SelectedTextInfo {
  text: string;
  range: { from: number; to: number };
}

interface EditorRef {
  getSelection: () => { from: number; to: number; text: string } | null;
  replaceText: (from: number, to: number, text: string) => void;
  insertAtPosition: (position: number, text: string) => void;
  getCursorPosition: () => number;
}

interface ArticleData {
  id: string;
  title: string;
  content?: string;
  article_type_name?: string;
  references?: Array<{ id: string; title: string; url: string }>;
  images?: Array<{ url: string; source_name: string; source_url: string }>;
  status: string;
}

export interface WritingAssistantProps {
  id?: string;
}

export default function WritingAssistant({ id: initialId }: WritingAssistantProps) {
  const t = useTranslations("writingAssistant");
  const commonT = useTranslations("article");
  const router = useRouter();
  const { goBack, canGoBack } = useBackNavigation(/^\/ai-tools\/writing-assistant(\/.*)?$/);
  const pathname = usePathname();

  const contentRef = useRef<HTMLDivElement>(null);
  const [editorContent, setEditorContent] = useState("<p></p>");
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAddToCollection, setShowAddToCollection] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track article ID - can be set from initial prop or from API response
  const [articleId, setArticleId] = useState<string | undefined>(initialId);

  // Reset all state when navigating to a new/different writing session
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return;
    prevPathnameRef.current = pathname;

    const newId = pathname.match(/\/writing-assistant\/([^/]+)/)?.[1];
    if (newId === articleId) return; // same article, no reset needed

    // Reset to blank state
    setArticleId(newId);
    setEditorContent("<p></p>");
    setOriginalContent(null);
    setArticleData(null);
    setMessages([]);
    setInputMessage("");
    setSelectedTextInfo(null);
    setHasSelectionInChat(false);
    setAiSuggestion(null);
    setShowSuggestionPopup(false);
    setStreamError(null);
    setLastRequestBody(null);
    selectionRef.current = null;
  }, [pathname]);

  // Sidebar collapse states
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  // Chat/Writing Assistant state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastRequestBody, setLastRequestBody] = useState<{ article_id?: string; instruction: string; content?: string } | null>(null);

  // Selected text state
  const [selectedTextInfo, setSelectedTextInfo] = useState<SelectedTextInfo | null>(null);
  const [hasSelectionInChat, setHasSelectionInChat] = useState(false);

  // Check if editor has meaningful content
  const hasContent = !(!editorContent || editorContent === "<p></p>" || editorContent === "<p><br></p>" || editorContent.trim() === "" || editorContent === "<p></p>");

  // Word count — strip HTML tags and count words
  const wordCount = useMemo(() => {
    if (!hasContent) return 0;
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

  // Calculate isDirty by comparing current content with original content
  const isDirty = useMemo(() => {
    if (!originalContent) return false;
    return editorContent !== originalContent;
  }, [editorContent, originalContent]);

  // Determine if chat input should require selection
  // - No content: don't require selection (can generate from scratch)
  // - Has content: require selection (modify mode)
  const requiresSelection = hasContent;

  // AI Suggestion state (shown in editor after AI response)
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  // Editor reference
  const editorRef = useRef<EditorRef | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const selectionRef = useRef<SelectedTextInfo | null>(null);

  // Fetch article by ID — skip if editor already has content (e.g. loaded from file upload)
  useEffect(() => {
    if (articleId && !hasContent) {
      fetchArticle(articleId);
    }
  }, [articleId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Clear file input on mount so re-uploading the same file always fires onChange
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const fetchArticle = async (articleId: string) => {
    setIsLoadingArticle(true);
    try {
      const response = await api.get(`/api/articles/${articleId}`);
      const data = response.data;

      if (data.result) {
        setArticleData(data.result);
        const content = data.result.content || data.result.title || "<p></p>";
        setEditorContent(content);
        setOriginalContent(content);
      }
    } catch {
      toast.error(t("failedToLoad"));
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const handleCopy = useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.innerText);
      toast.success(commonT("successCopy"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }, [commonT, t]);

  const handleDownload = useCallback(
    async (format: "pdf" | "docx") => {
      const el = contentRef.current;
      if (!el) return;
      setIsDownloading(true);
      const toastId = toast.loading(
        format === "pdf" ? commonT("generatingPdf") : commonT("generatingDocx")
      );
      try {
        const title = getTitleFromElement(el) || "writing-assistant";
        await downloadContent({ element: el, filename: title, format });
        toast.success(commonT("successDownload"), { id: toastId });
      } catch {
        toast.error(commonT("errorDownload"), { id: toastId });
      } finally {
        setIsDownloading(false);
      }
    },
    [commonT]
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const toastId = toast.loading(commonT("saving"));

    try {
      // No articleId yet — create one via the SSE assists endpoint first
      if (!articleId) {
        const { strippedHtml } = stripBase64Images(editorContent);

        const response = await api.post("/api/assists", {
          article_id: "",
          instruction: "default",
          content: strippedHtml,
        }, {
          responseType: "stream",
          adapter: "fetch",
        });

        const reader = response.data.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let newId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));
                if (eventData.event === "task_completed" && eventData.result?.article_id) {
                  newId = eventData.result.article_id;
                }
                if (eventData.event === "task_failed") {
                  throw new Error("task_failed");
                }
              } catch (parseErr) {
                if ((parseErr as Error).message === "task_failed") throw parseErr;
              }
            }
          }
        }

        if (!newId) throw new Error("No article ID returned");

        // Update state and URL
        setArticleId(newId);
        const locale = window.location.pathname.match(/^\/([a-z]{2})\//)?.[1] || "en";
        window.history.replaceState(null, "", `/${locale}/ai-tools/writing-assistant/${newId}`);

        // Upload any base64 images and patch the clean content
        const cleanedContent = await uploadAndReplaceImages(editorContent, newId);
        await api.patch(`/api/articles/${newId}`, { content: cleanedContent });
        setEditorContent(cleanedContent);
        setOriginalContent(cleanedContent);
        toast.success(commonT("successSave"), { id: toastId });
        return;
      }

      // articleId already exists — normal save
      const cleanedContent = await uploadAndReplaceImages(editorContent, articleId);
      if (cleanedContent !== editorContent) {
        setEditorContent(cleanedContent);
      }
      await api.patch(`/api/articles/${articleId}`, { content: cleanedContent });
      setOriginalContent(cleanedContent);
      toast.success(commonT("successSave"), { id: toastId });
    } catch {
      toast.error(commonT("errorSave"), { id: toastId });
    } finally {
      setIsSaving(false);
    }
  }, [articleId, editorContent, commonT]);

  const handleAddToCollection = useCallback(async () => {
    if (!articleId) {
      toast.error(t("saveFirst"));
      return;
    }

    if (isDirty && editorContent) {
      setIsSaving(true);
      try {
        // Upload any base64 images to S3 before saving
        const cleanedContent = await uploadAndReplaceImages(editorContent, articleId);
        if (cleanedContent !== editorContent) {
          setEditorContent(cleanedContent);
        }

        await api.patch(`/api/articles/${articleId}`, {
          content: cleanedContent,
        });
        setOriginalContent(cleanedContent);
        toast.success(commonT("successSave"));
      } catch {
        toast.error(commonT("errorSave"));
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    setShowAddToCollection(true);
  }, [articleId, isDirty, editorContent, t, commonT]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!['pdf', 'docx', 'doc'].includes(fileExtension || '')) {
      toast.error(t("unsupportedFileType"));
      return;
    }

    setIsLoadingFile(true);
    const toastId = toast.loading(t("processingFile"));

    try {
      const htmlContent = await parseFileToHtml(file);

      if (htmlContent) {
        // Strip base64 images before sending to API (prevents failed_encode_body)
        const { strippedHtml, imageDataUrls } = stripBase64Images(htmlContent);

        // Show the full content (with base64) in editor immediately for preview
        setEditorContent(htmlContent);
        setOriginalContent(htmlContent);

        // If no articleId, create article via API to get an ID (using SSE stream)
        if (!articleId) {
          try {
            const response = await api.post("/api/assists", {
              article_id: "",
              instruction: "default",
              content: strippedHtml,
            }, {
              responseType: "stream",
              adapter: "fetch",
            });

            const reader = response.data.getReader();
            if (reader) {
              const decoder = new TextDecoder();
              let buffer = "";
              let articleCreated = false;

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const eventData = JSON.parse(line.slice(6));

                      if (eventData.event === "task_completed" && eventData.result?.article_id) {
                        const newId = eventData.result.article_id;
                        setArticleId(newId);
                        // Update URL without navigation to prevent blink/remount
                        const locale = window.location.pathname.match(/^\/([a-z]{2})\//)?.[1] || 'en';
                        window.history.replaceState(null, '', `/${locale}/ai-tools/writing-assistant/${newId}`);
                        articleCreated = true;

                        // Upload images and replace base64 src with S3 URLs directly
                        if (imageDataUrls.length > 0) {
                          const finalHtml = await replaceBase64WithUrls(htmlContent, newId);
                          // Persist so backend stores clean URLs, not base64 or placeholders
                          await api.patch(`/api/articles/${newId}`, { content: finalHtml });
                          setEditorContent(finalHtml);
                          setOriginalContent(finalHtml);
                        }

                        toast.success(t("fileUploaded"), { id: toastId });
                      }

                      if (eventData.event === "task_failed") {
                        toast.error(t("generationFailed"), { id: toastId });
                      }
                    } catch {
                      // Silent fail for parse errors
                    }
                  }
                }
              }

              // If no article was created (task didn't complete), still show success for file upload
              if (!articleCreated) {
                toast.success(t("fileUploadedNoId"), { id: toastId });
              }
            }
          } catch (createError) {
            console.error("Failed to create article:", createError);
            toast.error(t("generationFailed"), { id: toastId });
          }
        } else {
          // Article already exists — upload images and save clean HTML
          try {
            const finalHtml = await replaceBase64WithUrls(htmlContent, articleId);
            setEditorContent(finalHtml);
            setOriginalContent(finalHtml);
            await api.patch(`/api/articles/${articleId}`, { content: finalHtml });
            toast.success(t("fileUploaded"), { id: toastId });
          } catch {
            // Content is still in editor, just not persisted
            toast.success(t("fileUploaded"), { id: toastId });
          }
        }
      }
    } catch (error) {
      console.log("File processing error:", error);
      toast.error(t("fileProcessingError"), { id: toastId });
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [t, articleId, router]);

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const downloadItems: DropdownItem[] = [
    { label: "PDF", icon: <FileDown size={14} />, onClick: () => handleDownload("pdf") },
    { label: "DOCX", icon: <FileText size={14} />, onClick: () => handleDownload("docx") },
  ];

  // Handle text selection - stores selection but doesn't add to chat yet
  const handleTextSelection = useCallback(
    (selectedText: string, range: { from: number; to: number }) => {
      if (!selectedText.trim()) {
        return;
      }

      const selectionData = { text: selectedText, range };
      setSelectedTextInfo(selectionData);
      selectionRef.current = selectionData;
      setHasSelectionInChat(true);
      setInputMessage("");
    },
    []
  );

  // Clear selection
  const handleClearSelection = () => {
    setSelectedTextInfo(null);
    selectionRef.current = null; // Also clear ref
    setInputMessage("");
    setHasSelectionInChat(false);
  };

  // Handle send message with AI using SSE
  const handleSendMessage = useCallback(async (isRetry = false) => {
    // For retry, use saved request body; for new request, validate input
    if (!isRetry && !inputMessage.trim()) return;

    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous error
    setStreamError(null);

    setShowSuggestionPopup(false);
    setAiSuggestion(null);

    // CAPTURE selection info at the START (before any async operations)
    // Use both state and ref to ensure we have the selection
    const capturedSelection = isRetry ? null : (selectedTextInfo || selectionRef.current);
    const capturedInput = isRetry && lastRequestBody ? lastRequestBody.instruction : inputMessage;

    // Capture cursor position for insertion (when no selection)
    const capturedCursorPosition = editorRef.current?.getCursorPosition() || 0;

    // Prepare message content based on whether text is selected
    let combinedContent: string;
    if (capturedSelection) {
      combinedContent = `Selected: "${capturedSelection.text}"\n\nInstruction: ${capturedInput}`;
    } else {
      combinedContent = `Instruction: ${capturedInput}`;
    }

    // Only add user message for new requests (not retry)
    if (!isRetry) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: combinedContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputMessage("");
    }
    setIsChatLoading(true);

    try {
      // Send request to /api/assists endpoint using api.post with SSE
      const requestBody: { article_id?: string; instruction: string; content?: string } = {
        instruction: capturedInput,
      };

      // Determine content to send
      if (capturedSelection) {
        // If text is selected, send selected text
        requestBody.content = capturedSelection.text;
      } else if (!articleId && hasContent) {
        // If no articleId but has content (from upload), send full editor content
        requestBody.content = editorContent;
      }

      // Only add article_id if we have one
      if (articleId) {
        requestBody.article_id = articleId;
      }

      // Save request body for retry
      setLastRequestBody(requestBody);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Use api.post with responseType: 'stream' for SSE
      const response = await api.post("/api/assists", requestBody, {
        responseType: "stream",
        adapter: "fetch",
        signal: abortControllerRef.current.signal,
      });

      // Get the reader from the response stream
      const reader = response.data.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.event === "task_completed" && eventData.result) {
                const { assistant_reply, content, article_id: newArticleId } = eventData.result;

                // If we got a new article_id (for new documents), update state and URL
                if (newArticleId && !articleId) {
                  setArticleId(newArticleId);
                  // Update URL without navigation to prevent blink/remount
                  const locale = window.location.pathname.match(/^\/([a-z]{2})\//)?.[1] || 'en';
                  window.history.replaceState(null, '', `/${locale}/ai-tools/writing-assistant/${newArticleId}`);
                }

                // AI response (shown in chat) - assistant_reply
                const aiResponseMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: "assistant",
                  content: assistant_reply || t("aiSuggestion"),
                  timestamp: new Date(),
                };

                // AI Body response (shown as popup in editor) - content
                if (content) {
                  // Determine if replacing selection or inserting at cursor
                  // Use CAPTURED selection (not state) to determine range
                  const replaceRange = capturedSelection?.range || null;

                  // Parse markdown content to HTML for Tiptap insertion and UI display
                  const parsedContent = await marked.parse(content);

                  setAiSuggestion({
                    suggestedText: parsedContent,
                    range: replaceRange,
                    cursorPosition: replaceRange ? undefined : capturedCursorPosition,
                  });

                  // Show popup in editor
                  setPopupPosition({
                    top: 200,
                    left: typeof window !== "undefined" ? window.innerWidth / 2 - 160 : 0,
                  });
                  setShowSuggestionPopup(true);
                }

                setMessages((prev) => [...prev, aiResponseMessage]);

                // Clear selection state so user can select new text
                setHasSelectionInChat(false);
                setSelectedTextInfo(null);
                selectionRef.current = null;
              }

              // Handle task_failed event
              if (eventData.event === "task_failed") {
                toast.error(t("generationFailed"));

                // Add failure message to chat
                const failureMessage: Message = {
                  id: (Date.now() + 1).toString(),
                  role: "assistant",
                  content: t("generationFailedMessage"),
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, failureMessage]);

                // Clear selection state
                setHasSelectionInChat(false);
                setSelectedTextInfo(null);
                selectionRef.current = null;

                // Set stream error to show retry button
                setStreamError(t("generationFailed"));
              }
            } catch {
              // Silent fail for parse errors
            }
          }
        }
      }
    } catch (error) {
      // Don't show error if request was aborted (component unmount or new request)
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      setStreamError(t("streamFailed"));
    } finally {
      setIsChatLoading(false);
    }
  }, [inputMessage, selectedTextInfo, articleId, hasContent, editorContent, router, t, lastRequestBody]);

  // Retry last failed request
  const handleRetry = useCallback(() => {
    if (lastRequestBody) {
      setStreamError(null);
      handleSendMessage(true);
    }
  }, [lastRequestBody, handleSendMessage]);

  const handleApplySuggestion = useCallback(() => {
    if (!aiSuggestion) return;

    // Check if editor is empty
    const isEmpty = !editorContent || editorContent === "<p></p>" || editorContent === "<p><br></p>" || editorContent.trim() === "";

    if (isEmpty) {
      // For empty editor, set content directly
      setEditorContent(aiSuggestion.suggestedText);
      setOriginalContent(aiSuggestion.suggestedText);
    } else if (aiSuggestion.range) {
      // Has selection range - replace the selection
      if (editorRef.current) {
        try {
          editorRef.current.replaceText(
            aiSuggestion.range.from,
            aiSuggestion.range.to,
            aiSuggestion.suggestedText
          );
        } catch {
          // Fallback: append at end
          setEditorContent((prev) => prev + aiSuggestion.suggestedText);
        }
      }
    } else if (aiSuggestion.cursorPosition !== undefined && editorRef.current) {
      // No selection but has cursor position - insert at cursor
      try {
        editorRef.current.insertAtPosition(aiSuggestion.cursorPosition, aiSuggestion.suggestedText);
      } catch {
        // Fallback: append at end
        setEditorContent((prev) => prev + aiSuggestion.suggestedText);
      }
    } else {
      // Fallback: append at end
      setEditorContent((prev) => prev + aiSuggestion.suggestedText);
    }

    setShowSuggestionPopup(false);
    setAiSuggestion(null);
    // Allow new selection after applying
    setHasSelectionInChat(false);
    setSelectedTextInfo(null);
    selectionRef.current = null;
  }, [aiSuggestion, editorContent]);

  const handleCancelSuggestion = useCallback(() => {
    setShowSuggestionPopup(false);
    setAiSuggestion(null);
    setHasSelectionInChat(false);
    setSelectedTextInfo(null);
    selectionRef.current = null;
  }, []);

  const toggleRightSidebar = () => setIsRightSidebarCollapsed(!isRightSidebarCollapsed);

  return (
    <>
      <div className="flex flex-col lg:flex-row h-[calc(100vh-var(--header-height))] gap-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto bg-background/20 relative flex flex-col min-w-0">
          <div className="sticky top-0 z-20 flex items-center justify-between gap-1.5 px-5 h-[52px] border-b border-border bg-surface flex-shrink-0">
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
                  <h1 className="text-sm font-semibold text-foreground leading-tight">{t("title")}</h1>
                  <p className="text-[11px] text-muted leading-tight hidden sm:block">AI writing assistant</p>
                </div>
              </div>
              {articleId && (
                <>
                  <div className="w-px h-5 bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<PlusCircle size={14} />}
                    onClick={() => router.push("/ai-tools/writing-assistant")}
                    className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    {t("newWriting")}
                  </Button>
                </>
              )}
              <div className="w-px h-5 bg-border" />
              <div className="flex flex-col px-1">
                <span className="text-xs font-semibold text-foreground">
                  {wordCount} {commonT("words")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  {isSaving ? (
                    <>{commonT("saving")} <RefreshCw size={10} className="animate-spin" /></>
                  ) : isDirty ? (
                    <span className="text-amber-500">{commonT("unsaved")}</span>
                  ) : articleId ? (
                    <>{commonT("saved")} <Check size={10} className="text-green-500" /></>
                  ) : null}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                icon={isLoadingFile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                onClick={handleUploadClick}
                disabled={isLoadingFile || hasContent}
                className="gap-1.5 whitespace-nowrap"
              >
                {isLoadingFile ? t("processing") : t("uploadFile")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<FolderPlus size={14} />}
                onClick={handleAddToCollection}
                disabled={!hasContent}
                className="gap-1.5 whitespace-nowrap"
              >
                {commonT("addToCollection")}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={handleCopy}
                disabled={!hasContent}
                className="gap-1.5 whitespace-nowrap"
              >
                {commonT("copy")}
              </Button>

              <div className="relative z-50">
                <Dropdown
                  items={downloadItems}
                  disabled={isDownloading || !hasContent}
                  trigger={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 whitespace-nowrap"
                      disabled={isDownloading || !hasContent}
                      icon={<Download size={14} />}
                    >
                      {isDownloading ? commonT("downloading") : commonT("download")}
                    </Button>
                  }
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                onClick={handleSave}
                disabled={isSaving || !hasContent || (!!articleId && !isDirty)}
                className="gap-1.5 whitespace-nowrap"
              >
                {isSaving ? commonT("saving") : commonT("save")}
              </Button>

              <button
                onClick={toggleRightSidebar}
                className="p-2 rounded-lg hover:bg-surface-hover transition-colors ml-2"
                title={isRightSidebarCollapsed ? t("showWritingAssistant") : t("hideWritingAssistant")}
              >
                {isRightSidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 relative" ref={contentRef}>
            {isLoadingArticle ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw size={24} className="animate-spin text-primary" />
                <span className="ml-2 text-muted">{t("loadingArticle")}</span>
              </div>
            ) : (
              <WritingEditor
                content={editorContent}
                onChange={(html) => {
                  setEditorContent(html);
                }}
                onTextSelection={handleTextSelection}
                editorRef={editorRef}
                editable={!isLoadingFile}
              />
            )}

            {showSuggestionPopup && aiSuggestion && (
              <div
                className="fixed z-50 w-80 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
                style={{ top: popupPosition.top, left: popupPosition.left }}
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border flex-shrink-0">
                  <Sparkles size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-foreground">{t("aiSuggestion")}</span>
                </div>
                <div className="p-4 flex-1 flex flex-col overflow-hidden">
                  <div className="mb-4 overflow-y-auto max-h-[40vh]">
                    <div
                      className="text-sm text-foreground bg-green-50 dark:bg-green-950/20 px-3 py-2.5 rounded-lg border-l-2 border-green-500 leading-relaxed markdown-render-area"
                      dangerouslySetInnerHTML={{ __html: aiSuggestion.suggestedText }}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 flex-shrink-0 mt-auto">
                    <button
                      onClick={handleCancelSuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground bg-surface-hover rounded-lg transition-colors"
                    >
                      <X size={14} />
                      {t("cancel")}
                    </button>
                    <button
                      onClick={handleApplySuggestion}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                      <RefreshCw size={14} />
                      {t("apply")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        <aside
          className={`${isRightSidebarCollapsed
            ? "w-0 opacity-0 overflow-hidden"
            : "w-full lg:w-[360px] xl:w-[400px]"
            } border-l border-border flex flex-col bg-surface/50 overflow-hidden transition-all duration-300 shrink-0`}
        >
          <div className="px-4 h-[52px] flex items-center border-b border-border flex-shrink-0" style={{background: 'var(--bg)'}}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={13} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground leading-tight">
                  {t("chatTitle")}
                </h2>
                <p className="text-[11px] text-muted leading-tight">
                  {hasSelectionInChat
                    ? t("modifySelectedOrType")
                    : requiresSelection
                      ? t("selectToModify")
                      : t("typeToGenerate")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !hasSelectionInChat && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {requiresSelection ? t("selectToModify") : t("typeToStart")}
                  </p>
                  <p className="text-xs text-muted leading-relaxed">
                    {requiresSelection ? t("typeToStart") : t("typeToWrite")}
                  </p>
                </div>
              </div>
            )}

            {/* Chat History */}
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "user" && (
                  <div className="flex gap-2 flex-row-reverse">
                    <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-primary text-white rounded-br-sm">
                      {message.content.split('\n\n').map((part, partIndex) => {
                        if (part.startsWith('Selected: ')) {
                          return (
                            <div key={partIndex} className="mb-2">
                              <span className="text-primary-200 text-xs block mb-1">{t("selectedTextLabel")}</span>
                              <span className="italic opacity-90">&ldquo;{part.replace('Selected: ', '').replace(/"/g, '')}&rdquo;</span>
                            </div>
                          );
                        } else if (part.startsWith('Instruction: ')) {
                          return (
                            <div key={partIndex}>
                              <span className="text-primary-200 text-xs block mb-1">{t("instructionLabel")}</span>
                              <span>{part.replace('Instruction: ', '')}</span>
                            </div>
                          );
                        }
                        return <div key={partIndex}>{part}</div>;
                      })}
                    </div>
                  </div>
                )}

                {message.role === "assistant" && (
                  <div className="flex gap-2">
                    <div
                      className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-surface border border-border rounded-bl-sm markdown-render-area"
                      dangerouslySetInnerHTML={{ __html: marked.parse(message.content) as string }}
                    />
                  </div>
                )}
              </div>
            ))}

            {isChatLoading && (
              <div className="flex gap-2">
                <div className="bg-surface border border-border rounded-lg rounded-bl-sm px-3 py-2">
                  <RefreshCw size={16} className="animate-spin text-primary" />
                </div>
              </div>
            )}

            {streamError && !isChatLoading && (
              <div className="flex flex-col gap-2">
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                  <p className="text-sm text-red-600 dark:text-red-400">{streamError}</p>
                </div>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors self-start"
                >
                  <RefreshCw size={14} />
                  {t("retry")}
                </button>
              </div>
            )}

            {hasSelectionInChat && selectedTextInfo && !isChatLoading && (
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary">{t("selectedText")}</span>
                  <button
                    onClick={handleClearSelection}
                    className="p-1 hover:bg-primary/20 rounded transition-colors"
                    title={t("clearSelection")}
                  >
                    <X size={14} className="text-primary" />
                  </button>
                </div>
                <p className="text-sm text-foreground italic">&ldquo;{selectedTextInfo.text}&rdquo;</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border bg-background/60">
            <div className="space-y-2">
              <p className="text-xs text-muted">
                {requiresSelection && !hasSelectionInChat
                  ? t("selectToModify")
                  : hasSelectionInChat
                    ? t("exampleInstruction")
                    : t("typeToGenerate")}
              </p>

              <div className="flex gap-2 items-end">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputMessage.trim() && !isChatLoading && (!requiresSelection || hasSelectionInChat)) {
                        handleSendMessage();
                      }
                    }
                  }}
                  placeholder={
                    requiresSelection && !hasSelectionInChat
                      ? t("selectTextFirst")
                      : hasSelectionInChat
                        ? t("typeInstruction")
                        : t("typeWhatToWrite")
                  }
                  className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/50 resize-none min-h-[60px] max-h-[120px]"
                  disabled={isChatLoading || (requiresSelection && !hasSelectionInChat)}
                  rows={2}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isChatLoading || !inputMessage.trim() || (requiresSelection && !hasSelectionInChat)}
                  className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div >

      <AddToCollectionModal
        isOpen={showAddToCollection}
        articleId={articleId || ""}
        onClose={() => setShowAddToCollection(false)}
        onCreateNew={() => setShowCollectionModal(true)}
      />

      <CreateCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        articleId={articleId}
      />
    </>
  );
}
