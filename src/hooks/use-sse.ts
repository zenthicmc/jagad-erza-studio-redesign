import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSSEOptions {
  url: string;
  withCredentials?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  eventTypes?: string[];
  parseJson?: boolean;
}

interface UseSSEReturn<T> {
  data: T | null;
  error: Event | null;
  isConnected: boolean;
  reconnect: () => void;
  close: () => void;
}

function useSSE<T = any>(options: UseSSEOptions): UseSSEReturn<T> {
  const {
    url,
    withCredentials = false,
    onMessage,
    onError,
    onOpen,
    eventTypes = [],
    parseJson = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL}${url}`, { withCredentials });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      onOpen?.();
    };

    eventSource.onerror = (event) => {
      setIsConnected(false);
      setError(event);
      onError?.(event);
    };

    const handleData = (event: MessageEvent) => {
      try {
        const parsedData = parseJson ? JSON.parse(event.data) : event.data;
        setData(parsedData);
        onMessage?.(parsedData);
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onmessage = handleData;

    eventTypes.forEach((eventType) => {
      eventSource.addEventListener(eventType, handleData as EventListener);
    });

    return eventSource;
  }, [url, withCredentials, onMessage, onError, onOpen, eventTypes, parseJson]);

  const close = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    close();
    connect();
  }, [close, connect]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      eventSource.close();
    };
  }, [connect]);

  return {
    data,
    error,
    isConnected,
    reconnect,
    close,
  };
}

export default useSSE;
