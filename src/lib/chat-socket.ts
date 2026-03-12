import Cookies from "js-cookie";

export interface ChatSocketMessage {
  type: "chat";
  data: {
    content: string;
    topic_id?: string;
    share_id?: string;
    deep_search: boolean;
    lite: boolean;
    images_base64?: Array<{
      filename: string;
      data: string;
    }>;
  };
}

export interface TaskProgressEvent {
  event: "task_progress";
  result: {
    chat_id: string;
    content: string;
    title: string;
  };
}

export interface TaskCompletedEvent {
  event: "task_completed";
  result: {
    id: string;
    chat_id: string;
    chat_title: string;
    role: "assistant";
    content: string;
    file_url: string[];
    user_file_url?: string;
    active: boolean;
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
  };
}

export interface TaskErrorEvent {
  event: "task_error";
  result: {
    chat_id?: string;
    message?: string;
    errors?: unknown;
  };
}

export interface GenericErrorEvent {
  event: "error" | "validation_error";
  code?: number;
  error?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

type ChatEvent =
  | TaskProgressEvent
  | TaskCompletedEvent
  | TaskErrorEvent
  | GenericErrorEvent;

type ProgressCallback = (data: TaskProgressEvent["result"]) => void;
type CompletedCallback = (data: TaskCompletedEvent["result"]) => void;
type ErrorCallback = (chatId: string, error: string) => void;

interface ChatCallbacks {
  onProgress?: ProgressCallback;
  onCompleted?: CompletedCallback;
  onError?: ErrorCallback;
}

class ChatSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private locale: string = "id-ID";
  private isManualClose = false;
  private chatCallbacks = new Map<string, ChatCallbacks>();
  private connectionPromise: Promise<void> | null = null;
  private connectionResolve: (() => void) | null = null;

  onReconnect: (() => void) | null = null;

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(locale: string = "id-ID") {
    this.locale = locale;
    this.isManualClose = false;

    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.ws?.readyState === WebSocket.CONNECTING) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://api.dev.erza.ai";
    const host = baseUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    const token = Cookies.get("access_token");
    const params = new URLSearchParams({
      "Accept-Language": locale,
      tz_offset: String(new Date().getTimezoneOffset()),
    });

    if (token) params.set("access_token", token);

    const wsUrl = `wss://${host}/ws/chat?${params.toString()}`;

    this.connectionPromise = new Promise<void>((resolve) => {
      this.connectionResolve = resolve;
    });

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        if (this.isManualClose) {
          this.ws?.close();
          this.ws = null;
          return;
        }
        this.clearReconnectTimer();
        this.connectionResolve?.();
        this.connectionResolve = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.event) {
            this.handleEvent(data as ChatEvent);
          }
        } catch {
          // ignore unparseable messages
        }
      };

      this.ws.onerror = () => { };

      this.ws.onclose = () => {
        this.ws = null;
        this.connectionResolve?.();
        this.connectionResolve = null;
        this.connectionPromise = null;

        if (!this.isManualClose) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      this.connectionResolve?.();
      this.connectionResolve = null;
      this.connectionPromise = null;

      if (error instanceof DOMException && error.name === "SecurityError") {
        return;
      }
      this.scheduleReconnect();
    }
  }

  async waitForConnection(timeoutMs = 5000): Promise<boolean> {
    if (this.isConnected) return true;
    if (!this.connectionPromise) return false;

    const timeout = new Promise<void>((resolve) =>
      setTimeout(resolve, timeoutMs),
    );
    await Promise.race([this.connectionPromise, timeout]);
    return this.isConnected;
  }

  disconnect() {
    this.isManualClose = true;
    this.clearReconnectTimer();
    this.chatCallbacks.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionPromise = null;
    this.connectionResolve = null;
  }

  send(message: ChatSocketMessage, senderChatId?: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (senderChatId) {
        const cb = this.chatCallbacks.get(senderChatId);
        cb?.onError?.(senderChatId, "WebSocket not connected");
      }
      return false;
    }

    this.ws.send(JSON.stringify(message));
    return true;
  }

  registerChat(chatId: string, callbacks: ChatCallbacks) {
    this.chatCallbacks.set(chatId, callbacks);
  }

  unregisterChat(chatId: string) {
    this.chatCallbacks.delete(chatId);
  }

  migrateChat(oldId: string, newId: string) {
    const cb = this.chatCallbacks.get(oldId);
    if (cb) {
      this.chatCallbacks.delete(oldId);
      this.chatCallbacks.set(newId, cb);
    }
  }

  getActiveChats(): string[] {
    return Array.from(this.chatCallbacks.keys());
  }

  clearAllCallbacks() {
    this.chatCallbacks.clear();
  }

  private handleEvent(data: ChatEvent) {
    switch (data.event) {
      case "task_progress": {
        const chatId = data.result.chat_id;
        if (!chatId) return;
        const match = this.findCallbacks(chatId);
        match?.callbacks.onProgress?.(data.result);
        break;
      }
      case "task_completed": {
        const chatId = data.result.chat_id;
        if (!chatId) return;
        const match = this.findCallbacks(chatId);

        match?.callbacks.onCompleted?.(data.result);
        break;
      }
      case "task_error": {
        const errorMsg = data.result?.message || "An error occurred";
        const errorChatId = data.result?.chat_id;

        if (errorChatId) {
          const match = this.findCallbacks(errorChatId);
          if (match) {
            match.callbacks.onError?.(match.registeredId, errorMsg);
            this.chatCallbacks.delete(match.registeredId);
            break;
          }
        }

        const entries = Array.from(this.chatCallbacks.entries());
        if (entries.length > 0) {
          const [registeredId, cb] = entries[entries.length - 1];
          cb.onError?.(registeredId, errorMsg);
          this.chatCallbacks.delete(registeredId);
        }
        break;
      }
      case "error":
      case "validation_error": {
        const genericData = data as GenericErrorEvent;
        const errorMsg =
          genericData.error ||
          genericData.errors
            ?.map((e) => `${e.field}: ${e.message}`)
            .join(", ") ||
          "An error occurred";

        const entries = Array.from(this.chatCallbacks.entries());
        if (entries.length > 0) {
          const [registeredId, cb] = entries[entries.length - 1];
          cb.onError?.(registeredId, errorMsg);
          this.chatCallbacks.delete(registeredId);
        }
        break;
      }
    }
  }

  private findCallbacks(chatId: string) {
    const direct = this.chatCallbacks.get(chatId);
    if (direct) return { callbacks: direct, registeredId: chatId };
    const tempEntries: [string, ChatCallbacks][] = [];
    for (const [registeredId, cb] of this.chatCallbacks.entries()) {
      if (registeredId.startsWith("temp-")) {
        tempEntries.push([registeredId, cb]);
      }
    }

    if (tempEntries.length === 1) {
      const [registeredId, cb] = tempEntries[0];
      return { callbacks: cb, registeredId };
    }

    return undefined;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.locale);
      this.onReconnect?.();
    }, 3000);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const chatSocket = new ChatSocket();
