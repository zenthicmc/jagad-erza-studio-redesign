"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, GripVertical } from "lucide-react";
import React, { useState, useRef, useCallback } from "react";

export const CustomImageNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const [showControls, setShowControls] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const captionAlign = node.attrs["caption-align"] || "left";
  const figureAlign = node.attrs.align || "left";
  const sourceName = node.attrs["data-source-name"];
  const sourceUrl = node.attrs["data-source-url"];
  const hasSources = sourceName || sourceUrl;
  const customWidth = node.attrs.width;

  const handleAlignmentChange = (align: string) => {
    updateAttributes({
      "caption-align": align,
      align: align,
    });
  };

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = imageRef.current?.offsetWidth || 0;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startXRef.current;
        const newWidth = Math.max(100, startWidthRef.current + diff);
        updateAttributes({ width: newWidth });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes],
  );

  const handleResetSize = () => {
    updateAttributes({ width: null });
  };

  const figureStyles: React.CSSProperties = {};
  if (customWidth) {
    figureStyles.width = `${customWidth}px`;
    figureStyles.maxWidth = `${customWidth}px`;
    figureStyles.minWidth = `${customWidth}px`;
  }
  if (figureAlign === "center") {
    figureStyles.marginLeft = "auto";
    figureStyles.marginRight = "auto";
  } else if (figureAlign === "right") {
    figureStyles.marginLeft = "auto";
    figureStyles.marginRight = 0;
  } else {
    figureStyles.marginLeft = 0;
    figureStyles.marginRight = "auto";
  }

  return (
    <NodeViewWrapper
      className="custom-image-node-view flex gap-2 items-start"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isResizing && setShowControls(false)}
    >
      <div
        data-drag-handle
        className="mt-2 p-1 rounded cursor-grab active:cursor-grabbing text-muted hover:text-foreground hover:bg-surface-hover transition-colors shrink-0 touch-none"
        title="Drag to move image"
      >
        <GripVertical size={20} />
      </div>
      <figure
        className={`image-with-source min-w-0 ${customWidth ? "shrink-0" : "flex-1"} ${selected ? "selected" : ""}`}
        data-caption-align={captionAlign}
        data-align={figureAlign}
        style={figureStyles}
      >
        <div className="relative group">
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt || sourceName || "Article image"}
            data-source-name={sourceName || ""}
            data-source-url={sourceUrl || ""}
            className="w-full h-auto rounded-lg"
            draggable={false}
          />

          {(selected || showControls) && (
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2">
              {customWidth && (
                <div className="bg-surface/90 backdrop-blur-sm border border-border rounded px-2 py-1 text-xs text-muted shadow-lg">
                  {customWidth}px
                  <button
                    onClick={handleResetSize}
                    className="ml-2 text-primary hover:underline"
                    title="Reset to original size"
                  >
                    Reset
                  </button>
                </div>
              )}

              <div className="flex-1" />

              <div className="flex gap-1 bg-surface/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg">
                <button
                  onClick={() => handleAlignmentChange("left")}
                  className={`p-1.5 rounded hover:bg-background transition-colors ${
                    figureAlign === "left"
                      ? "bg-background text-primary"
                      : "text-muted"
                  }`}
                  title="Align image left"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  onClick={() => handleAlignmentChange("center")}
                  className={`p-1.5 rounded hover:bg-background transition-colors ${
                    figureAlign === "center"
                      ? "bg-background text-primary"
                      : "text-muted"
                  }`}
                  title="Align image center"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  onClick={() => handleAlignmentChange("right")}
                  className={`p-1.5 rounded hover:bg-background transition-colors ${
                    figureAlign === "right"
                      ? "bg-background text-primary"
                      : "text-muted"
                  }`}
                  title="Align image right"
                >
                  <AlignRight size={16} />
                </button>
              </div>
            </div>
          )}

          {(selected || showControls) && (
            <>
              <div
                className="absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize hover:bg-primary/20 transition-colors"
                onMouseDown={handleResizeStart}
                title="Drag to resize"
              />
              <div
                className="absolute top-1/2 right-0 w-3 h-3 -translate-y-1/2 translate-x-1/2 bg-primary border-2 border-background rounded-full cursor-ew-resize shadow-lg"
                onMouseDown={handleResizeStart}
                title="Drag to resize"
              />
            </>
          )}
        </div>

        {hasSources && (
          <figcaption
            contentEditable={false}
            style={{ textAlign: captionAlign }}
            className="text-[11px] text-muted italic mt-1"
          >
            Source:{" "}
            <a
              href={sourceUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline source-link"
            >
              {sourceName || "Unknown"}
            </a>
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  );
};
