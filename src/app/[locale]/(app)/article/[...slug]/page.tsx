"use client";

import { useParams, redirect } from "next/navigation";
import { ArticleGenerator } from "@/components/features/article";
import AutopostWizard from "@/components/features/article/autopost-wizard";

const VALID_SLUGS = ["listicle", "longform", "news", "faq"];

export default function ArticleSlugPage() {
  const params = useParams();
  const slugArray = params.slug as string[];
  const articleType = slugArray?.[0];
  const articleId = slugArray?.[1];
  const subPage = slugArray?.[2];

  if (!articleType || !VALID_SLUGS.includes(articleType)) {
    redirect("/article");
  }

  if (subPage === "post" && articleId) {
    return <AutopostWizard articleSlug={articleType} articleId={articleId} />;
  }

  return <ArticleGenerator slug={articleType} id={articleId} />;
}

