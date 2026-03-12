"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X, Loader2, Sparkles, Copy } from "lucide-react";
import toast from "react-hot-toast";

interface AISuggestionPopupProps {
  position: { top: number; left: number };
  suggestedText: string;
  isLoading: boolean;
  onApply: () => void;
  onCancel: () => void;
}

export default function AISuggestionPopup({
  position,
  suggestedText,
  isLoading,
  onApply,
  onCancel,
}: AISuggestionPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedLeft = position.left - rect.width / 2;
      let adjustedTop = position.top;

      // Prevent overflow on right
      if (adjustedLeft + rect.width > viewportWidth) {
        adjustedLeft = viewportWidth - rect.width - 20;
      }
      // Prevent overflow on left
      if (adjustedLeft < 10) {
        adjustedLeft = 10;
      }
      // Prevent overflow on bottom
      if (adjustedTop + rect.height > viewportHeight) {
        adjustedTop = position.top - rect.height - 20;
      }

      popupRef.current.style.left = `${adjustedLeft}px`;
      popupRef.current.style.top = `${adjustedTop}px`;
    }
  }, [position]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestedText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
      style={{ left: position.left, top: position.top }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border-b border-border">
        <Sparkles size={16} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">AI Suggestion</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <Loader2 size={24} className="animate-spin text-primary mb-3" />
            <p className="text-sm text-muted">Generating suggestion...</p>
          </div>
        ) : (
          <>
            {/* Suggested Text */}
            <div className="mb-4">
              <p className="text-sm text-foreground bg-green-50 dark:bg-green-950/20 px-3 py-2.5 rounded-lg border-l-2 border-green-500 leading-relaxed">
                {suggestedText}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground bg-surface-hover rounded-lg transition-colors"
              >
                <Copy size={14} />
                {copied ? "Copied" : "Copy"}
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground bg-surface-hover rounded-lg transition-colors"
                >
                  <X size={14} />
                  Cancel
                </button>
                <button
                  onClick={onApply}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  <Check size={14} />
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Arrow pointing up */}
      <div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-surface border-l border-t border-border transform rotate-45"
        style={{ display: isLoading ? "none" : "block" }}
      />
    </div>
  );
}
