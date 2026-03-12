"use client";

import { useParams } from "next/navigation";
import GrammarChecker from "@/components/features/grammar-checker/grammar-checker";

export default function GrammarCorrectionArticlePage() {
  const params = useParams();
  const segments = params.id;
  const articleId = Array.isArray(segments) ? segments[0] : segments;

  return <GrammarChecker id={articleId} />;
}
