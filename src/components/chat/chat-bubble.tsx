"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check, Sparkles, RefreshCw, ImageOff, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { handleApiError } from "@/lib/error-handler";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChatMessage, useChatStore } from "@/stores/chat-store";

interface ChatBubbleProps {
  message: ChatMessage;
  isLast?: boolean;
  chatId: string;
  onRetry?: () => void;
}

const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i;
const DATA_IMAGE_REGEX = /^data:image\//i;

const isImageFile = (url: string, fileName?: string | null): boolean => {
  if (url.startsWith("blob:")) {
    return fileName
      ? /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(fileName)
      : false;
  }
  if (DATA_IMAGE_REGEX.test(url)) return true;
  if (IMAGE_EXT_REGEX.test(url)) return true;
  if (fileName && /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(fileName))
    return true;
  return false;
};

function ImageWithFallback({
  src,
  alt,
  className,
  fallbackText,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackText: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 text-muted">
        <ImageOff size={16} />
        <span className="text-xs">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default function ChatBubble({
  message,
  isLast,
  chatId,
  onRetry,
}: ChatBubbleProps) {
  const t = useTranslations("chat");
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const streamingContent = useChatStore(
    (s) => s.streamingContents.get(chatId) || "",
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (isSharing || !message.id) return;
    setIsSharing(true);
    try {
      const res = await api.post(`/api/chat/content/${message.id}/share`);
      const url = res?.data?.result?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success(t("shareContentSuccess"));
      }
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSharing(false);
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[75%] space-y-2">
          {message.file_url?.map((file, i) => (
            <div key={i} className="flex justify-end">
              {isImageFile(file, message.file_name) ? (
                <div className="rounded-xl overflow-hidden border border-border">
                  <ImageWithFallback
                    src={file}
                    alt="uploaded"
                    className="max-w-[250px] max-h-[250px] object-cover"
                    fallbackText={t("imageLoadError")}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3">
                  <span className="text-xs text-muted">📄</span>
                  <span className="text-sm truncate max-w-50">
                    {message.file_name || file.split("/").pop()}
                  </span>
                </div>
              )}
            </div>
          ))}

          {message.content && (
            <div className="bg-primary/15 text-foreground px-4 py-3 rounded-2xl rounded-tr-md">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.isLoading) {
    const hasStreamContent = isLast && streamingContent;

    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-white" />
        </div>
        {hasStreamContent ? (
          <div className="flex-1 min-w-0">
            <div className="markdown-render-area">
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {streamingContent}
              </Markdown>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs">{t("thinking")}</span>
          </div>
        )}
      </div>
    );
  }

  const isEmpty =
    !message.content?.trim() &&
    (!message.file_url || message.file_url.length === 0);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 text-muted bg-surface-hover/50 rounded-xl px-4 py-3">
            <span className="text-sm">{t("emptyResponse")}</span>
            {onRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10 disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={isRetrying ? "animate-spin" : ""}
                />
                {isRetrying ? t("retrying") : t("retry")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {message.file_url?.map((file, i) => (
          <div key={i}>
            {isImageFile(file) ? (
              <div className="rounded-xl overflow-hidden border border-border inline-block">
                <ImageWithFallback
                  src={file}
                  alt="AI output"
                  className="max-w-[300px] max-h-[300px] object-cover"
                  fallbackText={t("imageLoadError")}
                />
              </div>
            ) : (
              <a
                href={file}
                download
                target="_blank"
                className="inline-flex items-center gap-2 bg-surface border border-border rounded-xl px-4 py-3 hover:bg-surface-hover transition-colors"
              >
                <span className="text-xs">📄</span>
                <span className="text-sm">{file.split("/").pop()}</span>
              </a>
            )}
          </div>
        ))}

        {message.content && (
          <div className="markdown-render-area">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {message.content}
            </Markdown>
          </div>
        )}

        {message.content && (
          <div className="flex items-center gap-1 pt-1">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-surface-hover"
            >
              {copied ? (
                <Check size={12} className="text-green-500" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? t("copied") : t("copy")}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50"
            >
              <Share2 size={12} />
              {t("shareContent")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
