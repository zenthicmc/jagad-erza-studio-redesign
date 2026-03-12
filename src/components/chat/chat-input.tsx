"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  Send,
  Paperclip,
  X,
  Zap,
  Globe,
  Sparkles,
  ImageIcon,
  FileText,
} from "lucide-react";
import { useChatStore } from "@/stores/chat-store";
import type { ChatState, ChatMessage } from "@/stores/chat-store";
import { chatService } from "@/lib/chat-service";

interface ChatInputProps {
  onMessageSent?: () => void;
  onSendStart?: () => void;
  centered?: boolean;
}

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i;

export default function ChatInput({
  onMessageSent,
  onSendStart,
  centered = false,
}: ChatInputProps) {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations();

  const setChatHistory = useChatStore((s: ChatState) => s.setChatHistory);
  const globalConfig = useChatStore((s: ChatState) => s.globalConfig);
  const setGlobalConfig = useChatStore((s: ChatState) => s.setGlobalConfig);
  const activeShareData = useChatStore((s: ChatState) => s.activeShareData);
  const setActiveChatId = useChatStore((s: ChatState) => s.setActiveChatId);
  const retryContent = useChatStore((s: ChatState) => s.retryContent);
  const setRetryContent = useChatStore((s: ChatState) => s.setRetryContent);

  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    fileObject: File;
    previewUrl: string;
    name: string;
  } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  const idArray = (params?.id as string[]) || [];
  const isShareMode = idArray[0] === "share";
  const isShareContent = isShareMode && idArray[1] === "content";
  const effectiveId = isShareContent
    ? idArray[2]
    : isShareMode
      ? idArray[1]
      : idArray[0];
  const isAtRoot =
    pathname?.endsWith("/ai-chat") || pathname?.endsWith("/ai-chat/");

  useEffect(() => {
    if (effectiveId) {
      setActiveChatId(effectiveId);
    } else if (isAtRoot) {
      setActiveChatId(undefined);
    }

    const hasPending = effectiveId
      ? useChatStore.getState().getPendingMessage(effectiveId)
      : false;
    if (!hasPending) {
      queueMicrotask(() => {
        setIsSending(false);
      });
    }
  }, [effectiveId, isAtRoot, setActiveChatId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu]);

  const retrySubmitRef = useRef(false);

  useEffect(() => {
    if (retryContent && !isSending) {
      const { message, aiMessageId } = retryContent;

      const currentStore = [...useChatStore.getState().chatHistory];
      const currentActiveChatId = useChatStore.getState().activeChatId;
      const activeId = currentActiveChatId || effectiveId;

      const topicIdx = currentStore.findIndex(
        (c) => c.id === activeId || c.id.startsWith("temp-"),
      );
      if (topicIdx !== -1) {
        const topic = { ...currentStore[topicIdx] };
        topic.history = topic.history.filter(
          (m: ChatMessage) => m.id !== aiMessageId,
        );
        currentStore[topicIdx] = topic;
        setChatHistory([...currentStore]);
      }

      queueMicrotask(() => setText(message));
      retrySubmitRef.current = true;
      setRetryContent(null);
    }
  }, [retryContent, isSending, effectiveId, setChatHistory, setRetryContent]);

  useEffect(() => {
    if (retrySubmitRef.current && text.trim()) {
      retrySubmitRef.current = false;
      setTimeout(() => {
        const submitBtn = document.querySelector(
          "[data-retry-submit]",
        ) as HTMLButtonElement;
        submitBtn?.click();
      }, 50);
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t("chat.fileTooLarge"));
      return;
    }

    setSelectedFile({
      fileObject: file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    });
  };

  const clearFile = () => {
    if (selectedFile) URL.revokeObjectURL(selectedFile.previewUrl);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const streamingChatIds = useChatStore((s: ChatState) => s.streamingChatIds);
  const activeChatId = useChatStore((s: ChatState) => s.activeChatId);

  const currentChatId = activeChatId || effectiveId;
  const isCurrentChatStreaming =
    !!currentChatId && streamingChatIds.has(currentChatId);

  useEffect(() => {
    if (!isSending) return;
    if (!currentChatId) return;
    const isStillStreaming = streamingChatIds.has(currentChatId);
    const hasPending = useChatStore.getState().getPendingMessage(currentChatId);
    if (!isStillStreaming && !hasPending) {
      queueMicrotask(() => {
        setIsSending(false);
      });
    }
  }, [streamingChatIds, currentChatId, isSending]);

  const canSend = (text.trim() || selectedFile) && !isSending && !isCurrentChatStreaming;

  const handleSubmit = async () => {
    if (!canSend) return;

    onSendStart?.();

    let userMsg = text.trim();
    const currentFile = selectedFile;

    if (!userMsg && currentFile) {
      userMsg = t("chat.defaultFileMessage");
    }

    const activeId =
      effectiveId && !effectiveId.startsWith("temp-") ? effectiveId : undefined;
    const isNewChat = !activeId;

    setIsSending(true);
    setText("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    let imagesBase64: Array<{ filename: string; data: string }> | undefined;
    if (currentFile) {
      try {
        const base64Data = await fileToBase64(currentFile.fileObject);
        imagesBase64 = [{ filename: currentFile.name, data: base64Data }];
      } catch {
        toast.error("Failed to process file");
      }
    }

    const sent = await chatService.sendMessage({
      userMsg,
      activeId,
      isNewChat,
      isShareMode,
      shareData: activeShareData
        ? {
          id: activeShareData.id,
          title: activeShareData.title,
          history: activeShareData.history,
        }
        : null,
      imagesBase64,
      globalConfig,
    });

    if (!sent) {
      toast.error(t("chat.failedReconnecting"));
      setText(userMsg);
      setIsSending(false);
      return;
    }

    onMessageSent?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={
        centered
          ? "w-full max-w-2xl mx-auto"
          : "border-t border-border bg-surface/80 backdrop-blur-sm shrink-0"
      }
    >
      <div className={centered ? "px-4" : "max-w-3xl mx-auto px-4 py-3"}>
        {selectedFile && (
          <div className="mb-3 flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border w-fit">
            {IMAGE_REGEX.test(selectedFile.name) ? (
              <img
                src={selectedFile.previewUrl}
                alt="preview"
                className="w-10 h-10 rounded-md object-cover"
              />
            ) : (
              <span className="text-lg">📄</span>
            )}
            <span className="text-xs text-foreground truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <button
              onClick={clearFile}
              className="p-0.5 hover:bg-surface-hover rounded"
            >
              <X size={14} className="text-muted" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 relative bg-background border border-border rounded-2xl flex items-end transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
            <div className="relative shrink-0" ref={attachMenuRef}>
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-3 text-muted hover:text-foreground transition-colors"
                title="Attach file"
              >
                <Paperclip size={18} />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-surface border border-border rounded-xl shadow-lg py-1 min-w-[180px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    onClick={() => {
                      imageInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <ImageIcon size={16} className="text-primary" />
                    <div className="text-left">
                      <div>Image</div>
                      <div className="text-[11px] text-muted">JPG, PNG, GIF, WebP</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-surface-hover transition-colors"
                  >
                    <FileText size={16} className="text-primary" />
                    <div className="text-left">
                      <div>Document</div>
                      <div className="text-[11px] text-muted">PDF</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder")}
              rows={1}
              className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted resize-none max-h-[200px]"
              style={{ outline: "none", boxShadow: "none", border: "none" }}
            />

            <button
              data-retry-submit
              onClick={handleSubmit}
              disabled={!canSend}
              className={`p-3 shrink-0 transition-colors ${canSend
                ? "text-primary hover:text-primary/80"
                : "text-muted/40 cursor-not-allowed"
                }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 px-1">
          <button
            onClick={() =>
              setGlobalConfig({ deepSearch: !globalConfig.deepSearch })
            }
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${globalConfig.deepSearch
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border text-muted hover:text-foreground"
              }`}
          >
            <Globe size={12} />
            Deep Search
          </button>

          <div className="flex items-center gap-0.5 bg-background border border-border rounded-full p-0.5">
            <button
              onClick={() => setGlobalConfig({ mode: "lite" })}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${globalConfig.mode === "lite"
                ? "bg-primary/15 text-primary"
                : "text-muted hover:text-foreground"
                }`}
            >
              <Zap size={10} />
              Lite
            </button>
            <button
              onClick={() => setGlobalConfig({ mode: "pro" })}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${globalConfig.mode === "pro"
                ? "bg-primary/15 text-primary"
                : "text-muted hover:text-foreground"
                }`}
            >
              <Sparkles size={10} />
              Pro
            </button>
          </div>

          <span className="text-[10px] text-muted/50 ml-auto">
            {t("chat.disclaimer")}
          </span>
        </div>
      </div>
    </div>
  );
}
