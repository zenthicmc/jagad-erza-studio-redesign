"use client";

import { use } from "react";
import Humanizer from "@/components/features/humanizer/humanizer";

interface HumanizePageProps {
  params: Promise<{
    id?: string[];
  }>;
}

export default function HumanizeWithIdPage({ params }: HumanizePageProps) {
  const { id } = use(params);
  const articleId = id?.[0];
  return <Humanizer id={articleId} />;
}

