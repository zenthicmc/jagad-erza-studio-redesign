export interface TaskSsePayload<Result = any> {
  event?: string;
  result?: Result;
  error?: string | { error?: string } | null;
}

export interface TaskSseHandlers<Result = any> {
  onProgress?(result: Result): void;
  onCompleted?(result: Result): void;
  onFailed?(message: string, raw: TaskSsePayload<Result>): void;
}

export interface TaskSseRequestOptions {
  url: string;
  body: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function handleTaskEvent<Result>(
  payload: TaskSsePayload<Result>,
  fallbackEventName: string | undefined,
  handlers: TaskSseHandlers<Result>,
) {
  const eventName = payload.event ?? fallbackEventName;
  const { result, error } = payload;

  if (!eventName) return;

  if (eventName === "task_progress" && result && handlers.onProgress) {
    handlers.onProgress(result);
    return;
  }

  if (eventName === "task_completed" && result && handlers.onCompleted) {
    handlers.onCompleted(result);
    return;
  }

  if (eventName === "task_failed") {
    const message =
      (typeof error === "string" && error) ||
      ((error && typeof (error as any).error === "string" && (error as any).error) as
        | string
        | undefined) ||
      (result && typeof (result as any).error === "string" && (result as any).error) ||
      "";

    handlers.onFailed?.(message, payload);
  }
}

async function internalStreamTaskSse<Result = any>(
  { url, body, headers, signal }: TaskSseRequestOptions,
  handlers: TaskSseHandlers<Result>,
  hasRefreshed = false,
) {
  const response = await fetch(url, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    if (!hasRefreshed && typeof window !== "undefined") {
      try {
        const refreshResponse = await fetch("/api/auth/refresh-token", {
          method: "GET",
          credentials: "include",
        });

        if (refreshResponse.ok) {
          const Cookies = (await import("js-cookie")).default;
          let newToken: string | undefined;

          try {
            const data = (await refreshResponse.json()) as any;
            newToken =
              data?.key?.access_token ||
              data?.access_token ||
              Cookies.get("access_token");
          } catch {
            newToken = Cookies.get("access_token");
          }

          const nextHeaders: Record<string, string> = {
            ...(headers || {}),
          };

          if (newToken) {
            nextHeaders.Authorization = `Bearer ${newToken}`;
          } else {
            delete nextHeaders.Authorization;
          }

          return internalStreamTaskSse(
            { url, body, headers: nextHeaders, signal },
            handlers,
            true,
          );
        }
      } catch {
        // fall through to logout logic below
      }
    }

    if (typeof window !== "undefined") {
      const Cookies = (await import("js-cookie")).default;
      Cookies.remove("access_token", { path: "/" });
      Cookies.remove("refresh_token", { path: "/" });
      localStorage.removeItem("user-profile");
      window.location.href = "/signin";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error(response.statusText || "Request failed");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (rawEvent) {
        const lines = rawEvent.split("\n");
        let eventName = "";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim());
          }
        }

        if (dataLines.length) {
          const dataStr = dataLines.join("\n");
          try {
            const payload = JSON.parse(dataStr) as TaskSsePayload<Result>;
            handleTaskEvent(payload, eventName || undefined, handlers);
          } catch {
            // ignore non-JSON payloads
          }
        }
      }

      boundary = buffer.indexOf("\n\n");
    }
  }

  const trimmed = buffer.trim();
  if (trimmed) {
    const lines = trimmed.split("\n");
    let eventName = "";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length) {
      const dataStr = dataLines.join("\n");
      try {
        const payload = JSON.parse(dataStr) as TaskSsePayload<Result>;
        handleTaskEvent(payload, eventName || undefined, handlers);
      } catch {
        // ignore non-JSON payloads
      }
    }
  }
}

export async function streamTaskSse<Result = any>(
  options: TaskSseRequestOptions,
  handlers: TaskSseHandlers<Result>,
) {
  return internalStreamTaskSse(options, handlers);
}

