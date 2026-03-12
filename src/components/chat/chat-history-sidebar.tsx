"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  PanelRightOpen,
  PanelRightClose,
  PlusIcon,
} from "lucide-react";
import { useChatStore, ChatTopic } from "@/stores/chat-store";
import type { ChatState } from "@/stores/chat-store";
import { useAuth } from "@/hooks/use-auth";
import { Button, Modal, Input, Spinner, Dropdown } from "@/components/ui";
import api from "@/lib/api";
import { handleFormApiError, handleApiError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";

interface ChatHistorySidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ChatHistorySidebar({
  isCollapsed = false,
  onToggleCollapse,
}: ChatHistorySidebarProps) {
  const router = useRouter();
  const params = useParams();
  const t = useTranslations();

  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const chatHistory = useChatStore((s: ChatState) => s.chatHistory);
  const setChatHistory = useChatStore((s: ChatState) => s.setChatHistory);
  const deleteChat = useChatStore((s: ChatState) => s.deleteChat);
  const updateTopicTitle = useChatStore((s: ChatState) => s.updateTopicTitle);
  const historyVersion = useChatStore((s: ChatState) => s.historyVersion);
  const triggerHistoryUpdate = useChatStore(
    (s: ChatState) => s.triggerHistoryUpdate,
  );
  const setActiveChatId = useChatStore((s: ChatState) => s.setActiveChatId);
  const setLastVisitedChatId = useChatStore(
    (s: ChatState) => s.setLastVisitedChatId,
  );
  const streamingChatIds = useChatStore((s: ChatState) => s.streamingChatIds);
  const isAnyStreaming = streamingChatIds.size > 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [renameModal, setRenameModal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const {
    register: registerRename,
    handleSubmit: handleSubmitRename,
    setValue: setValueRename,
    setError: setErrorRename,
    formState: { errors: errorsRename },
    reset: resetRename,
  } = useForm<{ title: string }>();

  const pageRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const idArray = (params?.id as string[]) || [];
  const currentChatId = idArray[0] || null;

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      pageRef.current = 1;
      fetchHistory(1, true);
    }
  }, [historyVersion, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (renameModal) {
      setValueRename("title", renameModal.title);
    }
  }, [renameModal, setValueRename]);

  const fetchHistory = async (page: number, isInitial = false) => {
    const token = Cookies.get("access_token");
    if (!token) return;

    const existingChats = useChatStore.getState().chatHistory;
    if (isInitial && existingChats.length === 0) setIsLoading(true);

    try {
      const res = await api.get("/api/chat", {
        params: { limit: 20, page, sort_by: "created_at", sort_dir: "DESC" },
      });

      const result = res?.data?.result;
      const newChats: ChatTopic[] = result?.ai_chats || [];
      const currentStore = useChatStore.getState().chatHistory;

      const merged = newChats.map((newChat: ChatTopic) => {
        const existing = currentStore.find(
          (c: ChatTopic) => c.id === newChat.id,
        );
        return {
          ...newChat,
          history: existing?.history || newChat.history || [],
        };
      });

      setHasMore(result?.current_page < result?.total_page);

      if (isInitial) {
        const mergedIds = new Set(merged.map((c: ChatTopic) => c.id));

        const localOnly = currentStore.filter(
          (c: ChatTopic) => !mergedIds.has(c.id) && c.history.length > 0,
        );

        setChatHistory([...localOnly, ...merged]);
      } else {
        setChatHistory([...currentStore, ...merged]);
      }
    } catch {
      // silent — user might not be logged in
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isLoading || isFetchingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      setIsFetchingMore(true);
      pageRef.current += 1;
      fetchHistory(pageRef.current);
    }
  }, [isLoading, isFetchingMore, hasMore]);

  const filtered = chatHistory.filter((chat: ChatTopic) => {
    const title = (chat.title || t("chat.newChat")).toLowerCase();
    return title.includes(searchQuery.toLowerCase());
  });

  const handleNewChat = () => {
    if (isAnyStreaming) return;
    setActiveChatId(undefined);
    setLastVisitedChatId(null);
    router.push("/ai-chat");
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setLastVisitedChatId(chatId);
    router.push(`/ai-chat/${chatId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal || isDeleting || isAnyStreaming) return;
    setIsDeleting(true);

    try {
      await api.delete(`/api/chat/${deleteModal}`);
      deleteChat(deleteModal);

      const lastVisited = useChatStore.getState().lastVisitedChatId;
      if (lastVisited === deleteModal) {
        setLastVisitedChatId(null);
      }

      if (currentChatId === deleteModal) {
        setActiveChatId(undefined);
        router.push("/ai-chat");
      }
      toast.success(t("chat.chatDeleted"));
      setDeleteModal(null);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameConfirm = handleSubmitRename(async (data) => {
    if (!renameModal || isRenaming || isAnyStreaming) return;
    setIsRenaming(true);

    try {
      await api.patch(`/api/chat/${renameModal.id}`, {
        title: data.title,
      });
      updateTopicTitle(renameModal.id, data.title);
      triggerHistoryUpdate();
      toast.success(t("chat.chatRenamed"));
      setRenameModal(null);
      resetRename();
    } catch (error) {
      handleFormApiError(error, {
        setError: setErrorRename,
        t,
      });
    } finally {
      setIsRenaming(false);
    }
  });

  const handleShare = async (chatId: string) => {
    try {
      const res = await api.post(`/api/chat/${chatId}/share`);
      const url = res?.data?.result?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success(t("chat.shareLinkCopied"));
      }
    } catch (error) {
      handleApiError(error);
    }
  };

  return (
    <>
      <div
        className={cn(
          "border-l border-border bg-surface flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out",
          isCollapsed ? "w-12" : "w-72",
        )}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center py-3 gap-3 animate-in fade-in duration-200">
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
              title="Expand sidebar"
            >
              <PanelRightOpen size={18} />
            </button>
            <button
              onClick={handleNewChat}
              disabled={isAnyStreaming}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isAnyStreaming
                  ? "bg-primary/50 text-white/50 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark",
              )}
              title={t("chat.newChat")}
            >
              <PlusIcon size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border flex items-center gap-2 transition-all duration-300 ease-in-out opacity-0 animate-[fadeInSlide_0.3s_ease-out_forwards]">
              <Button
                onClick={handleNewChat}
                fullWidth
                icon={<Plus size={16} />}
                size="sm"
                disabled={isAnyStreaming}
              >
                {t("chat.newChat")}
              </Button>
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors shrink-0"
                title={t("chat.collapseSidebar")}
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            <div className="px-3 py-2 transition-all duration-300 ease-in-out opacity-0 animate-[fadeInSlide_0.3s_ease-out_0.05s_forwards]">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder={t("chat.searchPlaceholder")}
                  className="w-full bg-background border border-border rounded-lg py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto px-2 transition-all duration-300 ease-in-out opacity-0 animate-[fadeIn_0.3s_ease-out_0.1s_forwards]"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="sm" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-xs text-muted py-8">
                  {searchQuery ? t("chat.noChatsFound") : t("chat.noHistory")}
                </p>
              ) : (
                <ul className="space-y-0.5 py-1">
                  {filtered.map((chat: ChatTopic) => {
                    const isStreaming = streamingChatIds.has(chat.id);
                    return (
                      <li key={chat.id} className="relative group">
                        <button
                          onClick={() => handleSelectChat(chat.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${currentChatId === chat.id
                            ? "bg-primary/15 text-primary"
                            : "text-foreground hover:bg-surface-hover"
                            }`}
                        >
                          <MessageSquare
                            size={14}
                            className="shrink-0 text-muted"
                          />
                          <span className="truncate flex-1">
                            {chat.title || "Untitled Chat"}
                          </span>
                          {isStreaming && (
                            <Spinner size="sm" className="shrink-0" />
                          )}
                        </button>

                        {!isStreaming && (
                          <Dropdown
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            trigger={
                              <button className="p-1.5 rounded-md hover:bg-surface-hover text-muted transition-colors">
                                <MoreHorizontal size={14} />
                              </button>
                            }
                            items={[
                              {
                                label: t("chat.rename"),
                                icon: <Pencil size={12} />,
                                onClick: () =>
                                  setRenameModal({
                                    id: chat.id,
                                    title: chat.title || "",
                                  }),
                              },
                              {
                                label: t("chat.share"),
                                icon: <Share2 size={12} />,
                                onClick: () => handleShare(chat.id),
                              },
                              {
                                label: t("chat.delete"),
                                icon: <Trash2 size={12} />,
                                onClick: () => setDeleteModal(chat.id),
                                variant: "danger",
                              },
                            ]}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isFetchingMore && (
                <div className="flex justify-center py-3">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={!!renameModal}
        onClose={() => {
          if (!isRenaming) {
            setRenameModal(null);
            resetRename();
          }
        }}
        title={t("chat.renameChat")}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRenameModal(null);
                resetRename();
              }}
              disabled={isRenaming}
            >
              {t("chat.cancel")}
            </Button>
            <Button
              onClick={handleRenameConfirm}
              loading={isRenaming}
              disabled={isRenaming}
            >
              {t("chat.save")}
            </Button>
          </>
        }
      >
        <Input
          label={t("chat.chatTitle")}
          {...registerRename("title", {
            required: t("chat.titleRequired"),
            onChange: (e) => {
              if (renameModal) {
                setRenameModal({ ...renameModal, title: e.target.value });
              }
            },
          })}
          error={errorsRename.title?.message}
        />
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModal(null);
          }
        }}
        title={t("chat.deleteChat")}
        description={t("chat.deleteConfirmation")}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteModal(null)}
              disabled={isDeleting}
            >
              {t("chat.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={isDeleting}
              disabled={isDeleting}
            >
              {t("chat.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t("chat.deleteMessage")}</p>
      </Modal>
    </>
  );
}
