"use client";

import { use } from "react";
import Paraphraser from "@/components/features/paraphraser/paraphraser";

interface ParaphrasePageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export default function ParaphraseWithIdPage({ params }: ParaphrasePageProps) {
  const { id } = use(params);
  const articleId = id?.[0];
  return <Paraphraser id={articleId} />;
}
