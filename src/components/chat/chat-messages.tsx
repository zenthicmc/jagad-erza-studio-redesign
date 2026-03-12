"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowUp } from "lucide-react";
import { useChatStore, ChatMessage, ChatTopic } from "@/stores/chat-store";
import type { ChatState } from "@/stores/chat-store";
import { useChatLayout } from "@/contexts/chat-layout-context";
import ChatBubble from "./chat-bubble";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  isLoading: boolean;
  onLoadMore: () => void;
  isFetchingMore: boolean;
  hasMore: boolean;
  onShowGreeting?: (show: boolean) => void;
  onRetry?: (userMessage: string, aiMessageId: string) => void;
}

export default function ChatMessages({
  isLoading,
  onLoadMore,
  isFetchingMore,
  hasMore,
  onShowGreeting,
  onRetry,
}: ChatMessagesProps) {
  const params = useParams();
  const pathname = usePathname();
  const t = useTranslations();
  const { isSidebarCollapsed } = useChatLayout();

  const chatHistory = useChatStore((s: ChatState) => s.chatHistory);
  const responseTexts = useChatStore((s: ChatState) => s.responseTexts);
  const typingChats = useChatStore((s: ChatState) => s.typingChats);
  const streamingContents = useChatStore((s: ChatState) => s.streamingContents);
  const activeShareData = useChatStore((s: ChatState) => s.activeShareData);
  const activeChatId = useChatStore((s: ChatState) => s.activeChatId);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLoadMoreAction = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const activeTopic = useMemo(() => {
    if (isShareMode) {
      const chatInStore = chatHistory.find(
        (c: ChatTopic) =>
          c.id === effectiveId || c.topic_id === activeShareData?.topic_id,
      );
      return chatInStore || activeShareData;
    }
    // Check activeChatId first (set during temp->real migration), then effectiveId from URL, then fallback to temp-*
    return (
      chatHistory.find((c: ChatTopic) => c.id === activeChatId) ||
      chatHistory.find((c: ChatTopic) => c.id === effectiveId) ||
      chatHistory.find((c: ChatTopic) => c.id.startsWith("temp-"))
    );
  }, [
    chatHistory,
    effectiveId,
    isShareMode,
    activeShareData,
    isLoading,
    activeChatId,
  ]);

  const currentChatId =
    activeChatId || activeTopic?.id || effectiveId || "temp";
  const streamingContent = streamingContents.get(currentChatId) || "";
  const responseText = responseTexts[currentChatId] || "";
  const isTyping = !!typingChats[currentChatId];

  const isThinking =
    activeTopic?.history?.some((msg: ChatMessage) => msg.isLoading) || false;

  const showGreeting = useMemo(() => {
    if (responseText) return false;
    if (activeChatId) return false;
    if (isLoading || isThinking) return false;
    // URL has a specific chat/share ID — always show messages view, not the greeting
    if (effectiveId) return false;
    if (isAtRoot || !activeTopic?.history || activeTopic.history.length === 0)
      return true;
    return false;
  }, [
    isAtRoot,
    responseText,
    activeTopic?.history?.length,
    isLoading,
    isThinking,
    activeChatId,
    effectiveId,
    isShareMode,
    isShareContent,
  ]);

  useEffect(() => {
    if (isLoadMoreAction.current) return;
    if (activeTopic?.history && activeTopic.history.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({
          behavior: isTyping || responseText ? "auto" : "smooth",
        });
      });
    }
  }, [
    activeTopic?.history?.length,
    responseText,
    isTyping,
    effectiveId,
    streamingContent,
  ]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop } = scrollContainerRef.current;

    setShowScrollTop(scrollTop > 300);

    if (scrollTop <= 5 && hasMore && !isFetchingMore) {
      isLoadMoreAction.current = true;
      onLoadMore();
      setTimeout(() => {
        isLoadMoreAction.current = false;
      }, 600);
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    onShowGreeting?.(showGreeting);
  }, [showGreeting, onShowGreeting]);

  if (showGreeting) {
    return null;
  }

  return (
    <>
      <div
        className="flex-1 overflow-y-auto selectable"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {isFetchingMore && (
            <div className="flex justify-center py-3">
              <Spinner size="sm" />
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner />
              <p className="text-sm text-muted">Loading conversation...</p>
            </div>
          ) : (
            activeTopic?.history?.map((msg: ChatMessage, idx: number) => {
              const handleRetry =
                msg.role === "assistant" && onRetry
                  ? () => {
                    const history = activeTopic.history || [];
                    for (let i = idx - 1; i >= 0; i--) {
                      if (history[i].role === "user" && history[i].content) {
                        onRetry(history[i].content, msg.id);
                        break;
                      }
                    }
                  }
                  : undefined;

              return (
                <ChatBubble
                  key={msg.id || idx}
                  message={msg}
                  isLast={idx === (activeTopic.history?.length || 0) - 1}
                  chatId={currentChatId}
                  onRetry={handleRetry}
                />
              );
            })
          )}

          <div ref={chatEndRef} className="h-4" />
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className={cn(
            "fixed bottom-32 w-12 h-12 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark hover:scale-110 transition-all duration-200 flex items-center justify-center z-10 animate-[fadeInScale_0.3s_ease-out_forwards]",
            isSidebarCollapsed ? "right-20" : "right-78",
          )}
          style={{ opacity: 0 }}
          title={t("chat.scrollToTop")}
          aria-label={t("chat.scrollToTop")}
        >
          <ArrowUp size={20} />
        </button>
      )}
    </>
  );
}
