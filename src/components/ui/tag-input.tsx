"use client";

import React, { useState, KeyboardEvent, ChangeEvent, ClipboardEvent, useRef } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  value?: string[];
  onChange?: (tags: string[]) => void;
  fullWidth?: boolean;
}

export default function TagInput({
  label,
  error,
  hint,
  placeholder,
  value = [],
  onChange,
  fullWidth = true,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val.endsWith(", ")) {
      const tag = val.slice(0, -2).trim();
      if (tag && !value.includes(tag)) {
        const newTags = [...value, tag];
        onChange?.(newTags);
        setInputValue("");
      } else {
        setInputValue("");
      }
    } else {
      setInputValue(val);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const tag = inputValue.trim();
      if (tag && !value.includes(tag)) {
        const newTags = [...value, tag];
        onChange?.(newTags);
        setInputValue("");
      }
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      const newTags = value.slice(0, -1);
      onChange?.(newTags);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.includes(",")) return;
    e.preventDefault();
    const newTags = pasted
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t && !value.includes(t));
    if (newTags.length > 0) {
      onChange?.([...value, ...newTags]);
    }
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = value.filter((_, index) => index !== indexToRemove);
    onChange?.(newTags);
  };

  const inputId = label?.toLowerCase().replace(/\s+/g, "-") || "tag-input";

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {label}
        </label>
      )}

      <div
        className={`
          flex flex-wrap gap-2 p-1.5 min-h-[48px] bg-surface border rounded-lg
          ${
            error
              ? "border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/25"
              : "border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/25"
          }
          transition-all cursor-text
        `}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, index) => (
          <span
            key={`tag-${index}`}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover border border-border rounded-lg text-sm text-foreground transition-colors group"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="text-muted hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-none text-sm min-w-[120px] px-2 py-1 placeholder:text-muted"
          style={{ outline: "none", boxShadow: "none" }}
        />
      </div>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
      {hint && !error && <p className="text-muted text-xs mt-1.5">{hint}</p>}
    </div>
  );
}
