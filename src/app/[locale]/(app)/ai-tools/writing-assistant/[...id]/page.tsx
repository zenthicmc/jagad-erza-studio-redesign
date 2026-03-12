"use client";

import { use } from "react";
import WritingAssistant from "@/components/features/writing-assistant";

interface WritingAssistantPageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export default function WritingAssistantPage({ params }: WritingAssistantPageProps) {
  const { id } = use(params);
  const articleId = id?.[0];
  return <WritingAssistant key={articleId} id={articleId} />;
}
