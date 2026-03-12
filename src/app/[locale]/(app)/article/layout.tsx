"use client";

import { useEffect } from "react";
import { useArticleStore } from "@/stores/article-store";

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initSocket = useArticleStore((s) => s.initSocket);
  const disconnectSocket = useArticleStore((s) => s.disconnectSocket);
  const syncArticles = useArticleStore((s) => s.syncArticles);

  useEffect(() => {
    // connect socket & sync articles when entering /article routes
    initSocket();
    syncArticles();

    // disconnect when leaving /article routes
    return () => {
      disconnectSocket();
    };
  }, [initSocket, disconnectSocket, syncArticles]);

  return <>{children}</>;
}
