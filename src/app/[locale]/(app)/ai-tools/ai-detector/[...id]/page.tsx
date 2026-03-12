"use client";

import { use } from "react";
import AiDetector from "@/components/features/ai-detector/ai-detector";

interface AiDetectorPageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export default function AiDetectorWithIdPage({ params }: AiDetectorPageProps) {
  const { id } = use(params);
  const articleId = id?.[0];
  return <AiDetector id={articleId} />;
}
