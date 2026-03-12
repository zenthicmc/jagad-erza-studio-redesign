import {
  chatSocket,
  type ChatSocketMessage,
  type TaskProgressEvent,
  type TaskCompletedEvent,
} from "./chat-socket";
import { useChatStore, type ChatMessage, type PendingMessageData } from "@/stores/chat-store";

class ChatService {
  private lastProgressChunk: { chatId: string; content: string } | null = null;
  private _router: { replace: (url: string) => void } | null = null;
  private _locale: string = "id-ID";

  setRouter(router: { replace: (url: string) => void }) {
    this._router = router;
  }

  init(locale: string = "id-ID") {
    this._locale = locale;
    chatSocket.connect(locale);

    chatSocket.onReconnect = () => {
      this.handleReconnect();
    };

    this.cleanupOrphanedState();
  }

  shutdown() {
    const store = useChatStore.getState();
    if (store.streamingChatIds.size > 0) {
      this._router = null;
      return;
    }
    chatSocket.onReconnect = null;
    chatSocket.disconnect();
    this._router = null;
  }

  async sendMessage(opts: {
    userMsg: string;
    activeId: string | undefined;
    isNewChat: boolean;
    isShareMode: boolean;
    shareData?: { id: string; title: string; history: ChatMessage[] } | null;
    imagesBase64?: Array<{ filename: string; data: string }>;
    globalConfig: { deepSearch: boolean; mode: "lite" | "pro" };
  }): Promise<boolean> {
    const {
      userMsg,
      activeId,
      isNewChat,
      isShareMode,
      shareData,
      imagesBase64,
      globalConfig,
    } = opts;

    const store = useChatStore.getState();

    const timestamp = Date.now();
    const temporaryUserId = `user-${timestamp}`;
    const tempChatId = `temp-${timestamp}`;
    const streamChatId = activeId || tempChatId;

    store.clearStreamingContent(streamChatId);
    store.setTypingChat(streamChatId, true);
    store.setResponseText(streamChatId, userMsg);

    const pendingData: PendingMessageData = {
      temporaryUserId,
      activeId,
      tempChatId,
      isNewChat,
      isShareMode,
      userMsg,
    };
    store.setPendingMessage(streamChatId, pendingData);

    const newUserChat: ChatMessage = {
      id: temporaryUserId,
      role: "user",
      content: userMsg,
      file_url: [],
      file_name: null,
    };

    const newAiLoading: ChatMessage = {
      id: `ai-loading-${Date.now()}`,
      role: "assistant",
      content: "...",
      isLoading: true,
    };

    const currentStore = [...store.chatHistory];

    if (isShareMode && shareData) {
      const shareHistory = shareData.history || [];
      currentStore.unshift({
        id: tempChatId,
        title: shareData.title || userMsg.substring(0, 30),
        history: [...shareHistory, newUserChat, newAiLoading],
      });
      useChatStore.setState({ activeShareData: null });
    } else if (isNewChat) {
      const filtered = currentStore.filter((c) => !c.id.startsWith("temp-"));
      filtered.unshift({
        id: tempChatId,
        title: userMsg.substring(0, 30),
        history: [newUserChat, newAiLoading],
      });
      store.setChatHistory([...filtered]);
      store.setActiveChatId(tempChatId);
      this._router?.replace(`/ai-chat/${tempChatId}`);
    } else {
      const idx = currentStore.findIndex((c) => c.id === activeId);
      if (idx !== -1) {
        const updated = { ...currentStore[idx] };
        updated.history = [...updated.history, newUserChat, newAiLoading];
        currentStore.splice(idx, 1);
        currentStore.unshift(updated);
      } else {
        currentStore.unshift({
          id: activeId!,
          title: userMsg.substring(0, 30),
          history: [newUserChat, newAiLoading],
        });
      }
      store.setChatHistory([...currentStore]);
    }

    if (!chatSocket.isConnected) {
      chatSocket.connect(this._locale);
      await chatSocket.waitForConnection(5000);
    }
    this.lastProgressChunk = null;
    this.registerCallbacks(streamChatId);
    store.addStreamingChat(streamChatId);

    const sent = chatSocket.send(
      {
        type: "chat",
        data: {
          content: userMsg,
          ...(isShareMode && shareData ? { share_id: shareData.id } : {}),
          ...(activeId ? { topic_id: activeId } : {}),
          deep_search: globalConfig.deepSearch,
          lite: globalConfig.mode === "lite",
          ...(imagesBase64 ? { images_base64: imagesBase64 } : {}),
        },
      },
      streamChatId,
    );

    if (!sent) {
      this.handleWsError(streamChatId, "WebSocket not connected");
      return false;
    }

    return true;
  }

  private registerCallbacks(chatId: string) {
    chatSocket.registerChat(chatId, {
      onProgress: (data) => {
        this.handleWsProgress(data);
      },
      onCompleted: (data) => {
        this.handleWsCompleted(data);
      },
      onError: (cid, err) => {
        this.handleWsError(cid, err);
      },
    });
  }

  private handleWsProgress(data: TaskProgressEvent["result"]) {
    const realChatId = data.chat_id;

    const store = useChatStore.getState();
    const pending = store.getPendingMessage(realChatId);

    const prev = this.lastProgressChunk;
    if (
      prev?.chatId === realChatId &&
      prev?.content === data.content &&
      data.content.length > 0
    ) {
      return;
    }
    this.lastProgressChunk = { chatId: realChatId, content: data.content };

    if (!pending) {
      let migratedFromTemp = false;
      const allPending = store.pendingMessages;

      for (const [tempId, tempPending] of allPending.entries()) {
        if (tempId.startsWith("temp-") && tempPending.isNewChat) {
          chatSocket.migrateChat(tempId, realChatId);

          store.removeStreamingChat(tempId);
          store.addStreamingChat(realChatId);
          store.clearStreamingContent(tempId);
          store.migratePendingMessage(tempId, realChatId, {
            activeId: realChatId,
          });

          store.setTypingChat(realChatId, true);
          const oldResponse = store.responseTexts[tempId] || "";
          if (oldResponse) {
            store.setResponseText(realChatId, oldResponse);
            store.clearResponseText(tempId);
          }
          store.setTypingChat(tempId, false);

          const currentHistory = [...useChatStore.getState().chatHistory];
          const tempIdx = currentHistory.findIndex((c) => c.id === tempId);
          if (tempIdx !== -1) {
            currentHistory[tempIdx] = {
              ...currentHistory[tempIdx],
              id: realChatId,
            };
            useChatStore.getState().setChatHistory([...currentHistory]);
          }

          const currentActiveId = useChatStore.getState().activeChatId;
          const userNavigatedAway =
            currentActiveId !== undefined &&
            currentActiveId !== tempId &&
            currentActiveId !== realChatId;

          if (!userNavigatedAway) {
            store.setActiveChatId(realChatId);
            this._router?.replace(`/ai-chat/${realChatId}`);
            setTimeout(() => store.triggerHistoryUpdate(), 100);
          }

          migratedFromTemp = true;
          break;
        }
      }

      if (!migratedFromTemp) return;
    }

    store.appendStreamingContent(realChatId, data.content);
  }

  private handleWsCompleted(data: TaskCompletedEvent["result"]) {
    const newChatId = data.chat_id;

    const store = useChatStore.getState();
    const pending = store.getPendingMessage(newChatId);

    if (!pending) {
      console.warn(
        `[ChatService] Received completion for unknown chat: ${newChatId}`,
      );
      return;
    }

    const { temporaryUserId, activeId, tempChatId, isNewChat, isShareMode } =
      pending;

    const currentActiveId = store.activeChatId;
    const userNavigatedAway =
      currentActiveId !== undefined &&
      currentActiveId !== tempChatId &&
      currentActiveId !== newChatId &&
      currentActiveId !== activeId;

    this.lastProgressChunk = null;
    store.removeStreamingChat(newChatId);
    chatSocket.unregisterChat(newChatId);

    const latestStore = [...useChatStore.getState().chatHistory];
    const finalIdx = latestStore.findIndex(
      (c) => c.id === tempChatId || c.id === activeId || c.id === newChatId,
    );

    const completedAiMessage: ChatMessage = {
      id: data.id,
      role: "assistant",
      content: data.content,
      file_url: data.file_url || [],
      isLoading: false,
      created_at: data.created_at,
    };

    if (finalIdx !== -1) {
      const finalTopic = { ...latestStore[finalIdx] };

      let replacedLoading = false;
      finalTopic.history = finalTopic.history.map((item: ChatMessage) => {
        if (item.isLoading && !replacedLoading) {
          replacedLoading = true;
          return completedAiMessage;
        }
        if (item.id === temporaryUserId && data.user_file_url) {
          return { ...item, file_url: [data.user_file_url] };
        }
        return item;
      });

      const seen = new Set<string>();
      finalTopic.history = finalTopic.history.filter((m: ChatMessage) => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });

      finalTopic.id = data.chat_id;
      finalTopic.title = data.chat_title || finalTopic.title;
      latestStore[finalIdx] = finalTopic;
      store.setChatHistory([...latestStore]);

      if (!userNavigatedAway) {
        store.setActiveChatId(newChatId);
        if ((isShareMode || isNewChat) && newChatId) {
          this._router?.replace(`/ai-chat/${newChatId}`);
        }
        setTimeout(() => store.triggerHistoryUpdate(), 100);
      }
    } else {
      latestStore.unshift({
        id: newChatId,
        title: data.chat_title || "New Chat",
        history: [completedAiMessage],
      });
      store.setChatHistory([...latestStore]);

      if (!userNavigatedAway) {
        store.setActiveChatId(newChatId);
        if ((isShareMode || isNewChat) && newChatId) {
          this._router?.replace(`/ai-chat/${newChatId}`);
        }
        setTimeout(() => store.triggerHistoryUpdate(), 100);
      }
    }

    store.clearStreamingContent(newChatId);
    store.setTypingChat(newChatId, false);
    store.clearResponseText(newChatId);
    store.setPendingMessage(newChatId, null);
  }

  handleWsError(chatId: string, error: string) {
    const store = useChatStore.getState();
    const pending = store.getPendingMessage(chatId);

    if (!pending) {
      console.warn(
        `[ChatService] Received error for unknown chat: ${chatId}`,
      );
      return;
    }

    const history = [...store.chatHistory];
    const errIdx = history.findIndex(
      (c) => c.id === pending.tempChatId || c.id === pending.activeId,
    );
    if (errIdx !== -1) {
      const topic = { ...history[errIdx] };
      topic.history = topic.history.filter(
        (m: ChatMessage) => !m.isLoading,
      );

      if (
        topic.id === pending.tempChatId &&
        topic.history.length === 0
      ) {
        history.splice(errIdx, 1);
      } else {
        history[errIdx] = topic;
      }
      store.setChatHistory([...history]);
    }

    this.lastProgressChunk = null;
    store.clearStreamingContent(chatId);
    store.setTypingChat(chatId, false);
    store.clearResponseText(chatId);
    store.setPendingMessage(chatId, null);
    store.removeStreamingChat(chatId);
    chatSocket.unregisterChat(chatId);

    return { userMsg: pending.userMsg, error };
  }

  private handleReconnect() {
    const store = useChatStore.getState();

    for (const chatId of store.streamingChatIds) {
      if (store.getPendingMessage(chatId)) {
        this.registerCallbacks(chatId);
      }
    }
  }

  private cleanupOrphanedState() {
    const store = useChatStore.getState();

    if (store.streamingChatIds.size > 0) {
      for (const chatId of store.streamingChatIds) {
        store.clearStreamingContent(chatId);
        store.setTypingChat(chatId, false);
        store.clearResponseText(chatId);
        store.setPendingMessage(chatId, null);
      }
      useChatStore.setState({ streamingChatIds: new Set() });
    }

    if (store.pendingMessages.size > 0) {
      useChatStore.setState({ pendingMessages: new Map() });
    }

    const history = store.chatHistory;
    let changed = false;
    const cleaned = history.map((topic) => {
      const hasLoading = topic.history.some((m) => m.isLoading);
      if (!hasLoading) return topic;
      changed = true;
      const filteredHistory = topic.history.filter((m) => !m.isLoading);
      return { ...topic, history: filteredHistory };
    });
    const final = cleaned.filter(
      (topic) => !(topic.id.startsWith("temp-") && topic.history.length === 0),
    );
    if (changed) {
      store.setChatHistory(final);
    }
  }
}

export const chatService = new ChatService();
