"use client";

import { useState, useCallback, memo, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import Image from "next/image";
import type { ArticleImage } from "@/stores/article-store";

interface ImagePreviewProps {
  images: ArticleImage[];
  onRefresh?: () => void;
  onImageError?: (image: ArticleImage) => void;
  isRefreshing?: boolean;
  isLoading?: boolean;
}

function ImagePreview({
  images,
  onRefresh,
  onImageError,
  isRefreshing = false,
  isLoading = false,
}: ImagePreviewProps) {
  const t = useTranslations("article");
  const [expanded, setExpanded] = useState(false);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(() => new Set());

  const markBroken = useCallback(
    (image: ArticleImage) => {
      if (onImageError) {
        onImageError(image);
        return;
      }
      setBrokenUrls((prev) => new Set(prev).add(image.url));
    },
    [onImageError],
  );

  if (!images || images.length === 0) {
    if (!isLoading) return null;
  }

  const visibleImages = isLoading
    ? [null, null, null, null]
    : expanded
      ? images
      : images.slice(0, 4);

  const handleDragStart = (
    e: DragEvent<HTMLDivElement>,
    image: ArticleImage,
  ) => {
    const imgHtml = `<figure class="image-with-source" data-caption-align="left" data-align="left">
  <img src="${image.url}" alt="${image.source_name || "Article image"}" data-source-name="${image.source_name || ""}" data-source-url="${image.source_url || ""}" style="display: block; margin-left: 0; margin-right: auto;" />
  <figcaption style="text-align: left;">Source: <a href="${image.source_url || "#"}" target="_blank" rel="noopener noreferrer" class="source-link">${image.source_name || "Unknown"}</a></figcaption>
</figure>`;
    e.dataTransfer.setData("text/html", imgHtml);
    e.dataTransfer.setData("text/plain", image.url);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("imagePreview.title")}
        </h3>
        {!isLoading && (
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                {t("imagePreview.refresh")}
              </button>
            )}
            {images.length > 4 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors"
              >
                {expanded ? (
                  <>
                    {t("imagePreview.hide")}
                    <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    {t("imagePreview.show")} ({images.length - 4})
                    <ChevronDown size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {visibleImages.map((image, idx) => (
          <div
            key={image ? image.url : `skeleton-${idx}`}
            draggable={!!image}
            onDragStart={image ? (e) => handleDragStart(e, image) : undefined}
            className={`group relative aspect-video rounded-lg overflow-hidden border border-border bg-background transition-colors ${image
                ? "cursor-grab active:cursor-grabbing hover:border-primary/50"
                : "animate-pulse"
              }`}
          >
            {image && !brokenUrls.has(image.url) ? (
              <>
                <Image
                  src={image.url}
                  alt={image.source_name || `Image ${idx + 1}`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, 200px"
                  unoptimized
                  onError={() => markBroken(image)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-[10px] text-white truncate">
                    {image.source_name}
                  </p>
                </div>
              </>
            ) : image && brokenUrls.has(image.url) && !onImageError ? (
              <div className="w-full h-full flex items-center justify-center bg-surface-hover text-muted text-xs p-2 text-center">
                {t("imagePreview.refresh")}
              </div>
            ) : (
              <div className="w-full h-full bg-surface-hover" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ImagePreview);
