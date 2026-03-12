import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  file_url?: string[];
  file_name?: string | null;
  isLoading?: boolean;
  created_at?: string;
}

export interface ChatTopic {
  id: string;
  title: string;
  history: ChatMessage[];
  topic_id?: string;
}

interface GlobalConfig {
  deepSearch: boolean;
  mode: "lite" | "pro";
}

/** Serialisable version of a pending message (for localStorage persistence) */
export interface PendingMessageData {
  temporaryUserId: string;
  activeId: string | undefined;
  tempChatId: string;
  isNewChat: boolean;
  isShareMode: boolean;
  userMsg: string;
}

export interface ChatState {
  chatHistory: ChatTopic[];
  setChatHistory: (history: ChatTopic[]) => void;
  setChatContents: (
    chatId: string,
    contents: ChatMessage[],
    title?: string,
  ) => void;
  prependChatContents: (chatId: string, newContents: ChatMessage[]) => void;
  deleteChat: (id: string) => void;
  updateTopicTitle: (id: string, newTitle: string) => void;

  // --- Per-chat typing / response state (Bug #5, #16, #17) ---
  /** responseText keyed by chatId — stores the user message text while AI is processing */
  responseTexts: Record<string, string>;
  setResponseText: (chatId: string, text: string) => void;
  clearResponseText: (chatId: string) => void;

  /** isTyping keyed by chatId */
  typingChats: Record<string, boolean>;
  setTypingChat: (chatId: string, typing: boolean) => void;

  // Legacy global accessors (kept temporarily for consumers not yet migrated)
  responseText: string;
  isTyping: boolean;
  setIsTyping: (typing: boolean) => void;

  streamingContents: Map<string, string>;
  appendStreamingContent: (chatId: string, chunk: string) => void;
  setStreamingContent: (chatId: string, content: string) => void;
  clearStreamingContent: (chatId: string) => void;
  getStreamingContent: (chatId: string) => string;

  isTypingEffect: Record<string, boolean>;
  setIsTypingEffect: (chatId: string, status: boolean) => void;

  chatDrafts: Record<string, string>;
  setChatDraft: (chatId: string, text: string) => void;

  fileDrafts: Record<
    string,
    { fileObject: File; previewUrl: string; name: string } | null
  >;
  setFileDraft: (
    chatId: string,
    file: { fileObject: File; previewUrl: string; name: string } | null,
  ) => void;

  globalConfig: GlobalConfig;
  setGlobalConfig: (config: Partial<GlobalConfig>) => void;

  activeShareData: ChatTopic | null;
  setActiveShareData: (data: ChatTopic | null) => void;
  prependActiveShareContents: (newContents: ChatMessage[]) => void;

  historyVersion: number;
  triggerHistoryUpdate: () => void;

  activeChatId: string | undefined;
  setActiveChatId: (id: string | undefined) => void;

  lastVisitedChatId: string | null;
  setLastVisitedChatId: (id: string | null) => void;

  pendingMessages: Map<string, PendingMessageData>;
  setPendingMessage: (
    chatId: string,
    pending: PendingMessageData | null,
  ) => void;
  getPendingMessage: (chatId: string) => PendingMessageData | undefined;
  /** Migrate a pending message from one key to another (temp -> real) */
  migratePendingMessage: (
    oldChatId: string,
    newChatId: string,
    patch?: Partial<PendingMessageData>,
  ) => void;

  retryContent: { message: string; aiMessageId: string } | null;
  setRetryContent: (content: ChatState["retryContent"]) => void;

  streamingChatIds: Set<string>;
  addStreamingChat: (chatId: string) => void;
  removeStreamingChat: (chatId: string) => void;
  isStreamingChat: (chatId: string) => boolean;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chatHistory: [] as ChatTopic[],
      setChatHistory: (history) => set({ chatHistory: history }),
      setChatContents: (chatId, contents, title) =>
        set((state) => {
          const exists = state.chatHistory.find((c) => c.id === chatId);
          if (exists) {
            return {
              chatHistory: state.chatHistory.map((chat) =>
                chat.id === chatId
                  ? { ...chat, history: [...contents].reverse() }
                  : chat,
              ),
            };
          }
          return {
            chatHistory: [
              ...state.chatHistory,
              {
                id: chatId,
                history: [...contents].reverse(),
                title: title || "New Chat",
              },
            ],
          };
        }),
      prependChatContents: (chatId, newContents) =>
        set((state) => ({
          chatHistory: state.chatHistory.map((chat) => {
            if (chat.id === chatId) {
              const reversed = [...newContents].reverse();
              const combined = [...reversed, ...chat.history];
              const unique = combined.filter(
                (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
              );
              return { ...chat, history: unique };
            }
            return chat;
          }),
        })),
      deleteChat: (id) =>
        set((state) => {
          if (state.streamingChatIds.size > 0) return state;
          return {
            chatHistory: state.chatHistory.filter((c) => c.id !== id),
          };
        }),
      updateTopicTitle: (id, newTitle) =>
        set((state) => {
          if (state.streamingChatIds.size > 0) return state;
          return {
            chatHistory: state.chatHistory.map((c) =>
              c.id === id ? { ...c, title: newTitle } : c,
            ),
          };
        }),

      // --- Per-chat typing / response state ---
      responseTexts: {},
      setResponseText: (chatId, text) =>
        set((state) => ({
          responseTexts: { ...state.responseTexts, [chatId]: text },
        })),
      clearResponseText: (chatId) =>
        set((state) => {
          const next = { ...state.responseTexts };
          delete next[chatId];
          return { responseTexts: next };
        }),

      typingChats: {},
      setTypingChat: (chatId, typing) =>
        set((state) => {
          if (!typing) {
            const next = { ...state.typingChats };
            delete next[chatId];
            return { typingChats: next };
          }
          return {
            typingChats: { ...state.typingChats, [chatId]: true },
          };
        }),

      // Legacy global accessors — computed from per-chat maps using activeChatId
      get responseText() {
        const state = get();
        const id = state.activeChatId;
        return id ? state.responseTexts[id] || "" : "";
      },
      get isTyping() {
        const state = get();
        const id = state.activeChatId;
        return id ? !!state.typingChats[id] : false;
      },
      setIsTyping: (typing: boolean) => {
        const id = get().activeChatId;
        if (id) {
          set((state) => {
            if (!typing) {
              const next = { ...state.typingChats };
              delete next[id];
              return { typingChats: next };
            }
            return {
              typingChats: { ...state.typingChats, [id]: true },
            };
          });
        }
      },

      streamingContents: new Map(),
      appendStreamingContent: (chatId, chunk) =>
        set((state) => {
          const newMap = new Map(state.streamingContents);
          const current = newMap.get(chatId) || "";
          newMap.set(chatId, current + chunk);
          return { streamingContents: newMap };
        }),
      setStreamingContent: (chatId, content) =>
        set((state) => {
          const newMap = new Map(state.streamingContents);
          newMap.set(chatId, content);
          return { streamingContents: newMap };
        }),
      clearStreamingContent: (chatId) =>
        set((state) => {
          const newMap = new Map(state.streamingContents);
          newMap.delete(chatId);
          return { streamingContents: newMap };
        }),
      getStreamingContent: (chatId: string): string => {
        return get().streamingContents.get(chatId) || "";
      },

      isTypingEffect: {},
      setIsTypingEffect: (chatId: string, status: boolean) =>
        set((state) => ({
          isTypingEffect: {
            ...state.isTypingEffect,
            [chatId || "new"]: status,
          },
        })),

      chatDrafts: {},
      setChatDraft: (chatId: string, text: string) =>
        set((state) => ({
          chatDrafts: { ...state.chatDrafts, [chatId || "new"]: text },
        })),

      fileDrafts: {},
      setFileDraft: (
        chatId: string,
        file: { fileObject: File; previewUrl: string; name: string } | null,
      ) =>
        set((state) => ({
          fileDrafts: { ...state.fileDrafts, [chatId || "new"]: file },
        })),

      globalConfig: { deepSearch: false, mode: "lite" },
      setGlobalConfig: (config: Partial<GlobalConfig>) =>
        set((state) => ({
          globalConfig: { ...state.globalConfig, ...config },
        })),

      activeShareData: null,
      setActiveShareData: (data: ChatTopic | null) =>
        set({ activeShareData: data }),
      prependActiveShareContents: (newContents: ChatMessage[]) =>
        set((state) => {
          const reversed = [...newContents].reverse();
          const existing = state.activeShareData?.history || [];
          const combined = [...reversed, ...existing];
          const unique = combined.filter(
            (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
          );
          return {
            activeShareData: state.activeShareData
              ? { ...state.activeShareData, history: unique }
              : null,
          };
        }),

      historyVersion: 0,
      triggerHistoryUpdate: () =>
        set((state) => ({ historyVersion: state.historyVersion + 1 })),

      activeChatId: undefined,
      setActiveChatId: (id: string | undefined) =>
        set({ activeChatId: id }),

      lastVisitedChatId: null,
      setLastVisitedChatId: (id: string | null) =>
        set({ lastVisitedChatId: id }),

      pendingMessages: new Map(),
      setPendingMessage: (
        chatId: string,
        pending: PendingMessageData | null,
      ) =>
        set((state) => {
          const newMap = new Map(state.pendingMessages);
          if (pending === null) {
            newMap.delete(chatId);
          } else {
            newMap.set(chatId, pending);
          }
          return { pendingMessages: newMap };
        }),
      getPendingMessage: (chatId: string) => {
        return get().pendingMessages.get(chatId);
      },
      migratePendingMessage: (
        oldChatId: string,
        newChatId: string,
        patch?: Partial<PendingMessageData>,
      ) =>
        set((state) => {
          const newMap = new Map(state.pendingMessages);
          const existing = newMap.get(oldChatId);
          if (existing) {
            newMap.delete(oldChatId);
            newMap.set(newChatId, { ...existing, ...patch });
          }
          return { pendingMessages: newMap };
        }),

      retryContent: null,
      setRetryContent: (content: ChatState["retryContent"]) =>
        set({ retryContent: content }),

      streamingChatIds: new Set<string>(),
      addStreamingChat: (chatId: string) =>
        set((state) => {
          const newSet = new Set(state.streamingChatIds);
          newSet.add(chatId);
          return { streamingChatIds: newSet };
        }),
      removeStreamingChat: (chatId: string) =>
        set((state) => {
          const newSet = new Set(state.streamingChatIds);
          newSet.delete(chatId);
          return { streamingChatIds: newSet };
        }),
      isStreamingChat: (chatId: string): boolean => {
        return get().streamingChatIds.has(chatId);
      },
    }),
    {
      name: "chat-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        lastVisitedChatId: state.lastVisitedChatId,
        chatDrafts: state.chatDrafts,
        globalConfig: state.globalConfig,
        // Persist pending/streaming so we can detect orphans after refresh
        _pendingMessages: Array.from(state.pendingMessages.entries()),
        _streamingChatIds: Array.from(state.streamingChatIds),
      }),
      merge: (persisted, current) => {
        const p = persisted as Record<string, unknown>;
        const restored = { ...current, ...p } as ChatState;

        // Rehydrate pendingMessages from serialised array
        if (Array.isArray(p?._pendingMessages)) {
          restored.pendingMessages = new Map(
            p._pendingMessages as [string, PendingMessageData][],
          );
        } else {
          restored.pendingMessages = new Map();
        }

        // Rehydrate streamingChatIds from serialised array
        if (Array.isArray(p?._streamingChatIds)) {
          restored.streamingChatIds = new Set(
            p._streamingChatIds as string[],
          );
        } else {
          restored.streamingChatIds = new Set();
        }

        return restored;
      },
    },
  ),
);
