"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChatStore } from "@/stores/chat-store";
import ChatMessages from "@/components/chat/chat-messages";
import ChatInput from "@/components/chat/chat-input";
import api from "@/lib/api";

export default function AiChatPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("article");

  const chatHistory = useChatStore((s) => s.chatHistory);
  const setActiveShareData = useChatStore((s) => s.setActiveShareData);
  const setRetryContent = useChatStore((s) => s.setRetryContent);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showGreeting, setShowGreeting] = useState(false);

  const [userName, setUserName] = useState("");
  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem("user-profile") || "{}");
      setUserName(profile?.full_name?.split(" ")[0] || "");
    } catch {
      // ignore
    }
  }, []);

  const idArray = (params?.id as string[]) || [];
  const isShareMode = idArray[0] === "share";
  const isShareContent = isShareMode && idArray[1] === "content";
  const effectiveId = isShareContent
    ? idArray[2]
    : isShareMode
      ? idArray[1]
      : idArray[0];

  useEffect(() => {
    if (effectiveId) {
      setShowGreeting(false);
    }
  }, [effectiveId]);

  useEffect(() => {
    const fetchContents = async () => {
      if (!effectiveId || effectiveId.startsWith("temp")) return;

      if (!isShareMode) {
        const existing = chatHistory.find((c) => c.id === effectiveId);
        if (existing && existing.history.length > 0) return;
      }

      setIsLoading(true);
      try {
        const endpoint = isShareContent
          ? `/api/chat/content/share/${effectiveId}`
          : isShareMode
            ? `/api/chat/share/${effectiveId}`
            : `/api/chat/contents/${effectiveId}`;

        const res = await api.get(endpoint, {
          params: {
            page: 1,
            limit: 10,
            sort_by: "created_at",
            sort_dir: "DESC",
          },
        });

        const result = res?.data?.result;
        const contents = result?.ai_chat_contents || result?.contents || [];
        const apiCurrentPage = parseInt(result?.current_page || "1");
        const apiTotalPage = parseInt(result?.total_page || "1");

        setPage(apiCurrentPage);
        setHasMore(apiCurrentPage < apiTotalPage);

        if (isShareMode) {
          setActiveShareData({
            id: effectiveId,
            title: result.title,
            history: [...contents].reverse(),
            topic_id: result.topic_id,
          });
        } else {
          useChatStore
            .getState()
            .setChatContents(effectiveId, contents, result.title);
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    };

    fetchContents();
  }, [effectiveId]);

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMore || !effectiveId || effectiveId.startsWith("temp"))
      return;

    setIsFetchingMore(true);
    const nextPage = page + 1;

    try {
      const endpoint = isShareContent
        ? `/api/chat/content/share/${effectiveId}`
        : isShareMode
          ? `/api/chat/share/${effectiveId}`
          : `/api/chat/contents/${effectiveId}`;

      const res = await api.get(endpoint, {
        params: {
          page: nextPage,
          limit: 10,
          sort_by: "created_at",
          sort_dir: "DESC",
        },
      });

      const result = res?.data?.result;
      const newContents = result?.ai_chat_contents || result?.contents || [];

      if (newContents.length > 0) {
        if (isShareContent || isShareMode) {
          useChatStore.getState().prependActiveShareContents(newContents);
        } else {
          useChatStore.getState().prependChatContents(effectiveId, newContents);
        }

        setPage(nextPage);
        const apiTotalPage = parseInt(result?.total_page || "0");
        if (nextPage >= apiTotalPage) setHasMore(false);
        if (newContents.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch {
    } finally {
      setTimeout(() => setIsFetchingMore(false), 600);
    }
  };

  const handleShowGreeting = useCallback((show: boolean) => {
    setShowGreeting(show);
  }, []);

  const handleRetry = useCallback(
    (userMessage: string, aiMessageId: string) => {
      setRetryContent({ message: userMessage, aiMessageId });
    },
    [setRetryContent],
  );

  if (showGreeting) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Sparkles size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("greeting")}{userName ? `, ${userName}` : ""}! 👋
            </h1>
            <p className="text-muted mt-1">{t("chatSubtitle")}</p>
          </div>
        </div>
        <ChatInput
          key="chat-input"
          centered
          onSendStart={() => setShowGreeting(false)}
        />
      </div>
    );
  }

  return (
    <>
      <ChatMessages
        isLoading={isLoading}
        onLoadMore={handleLoadMore}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onShowGreeting={handleShowGreeting}
        onRetry={handleRetry}
      />
      <ChatInput key="chat-input" onSendStart={() => setShowGreeting(false)} />
    </>
  );
}
