"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: {
    trigger: "px-2.5 py-1.5 text-xs rounded-lg",
    chevron: 14,
    item: "px-2.5 py-1.5 text-xs",
    dropdown: "rounded-lg mt-1",
  },
  md: {
    trigger: "px-4 py-3 text-sm rounded-lg",
    chevron: 16,
    item: "px-4 py-2.5 text-sm",
    dropdown: "rounded-lg mt-2",
  },
  lg: {
    trigger: "px-5 py-3.5 text-base rounded-lg",
    chevron: 18,
    item: "px-5 py-3 text-base",
    dropdown: "rounded-lg mt-2",
  },
};

export default function Select({
  label,
  error,
  hint,
  options,
  placeholder,
  fullWidth = true,
  value,
  onChange,
  disabled = false,
  size = "md",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const inputId = label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""} ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full ${sizeStyles[size].trigger} bg-surface border text-left
            flex items-center justify-between cursor-pointer
            focus:outline-none transition-all
            hover:bg-surface-hover
            ${!value ? "text-muted" : "text-foreground"}
            ${error
              ? "border-red-500"
              : isOpen
                ? "border-foreground/20"
                : "border-border"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `.trim()}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown
            size={sizeStyles[size].chevron}
            className={`text-muted transition-transform flex-shrink-0 ml-2 ${isOpen ? "rotate-180" : ""
              }`}
          />
        </button>

        {isOpen && (
          <div className={`absolute z-50 w-full ${sizeStyles[size].dropdown} bg-surface border border-border shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
            <div className="max-h-60 overflow-y-auto py-1">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full ${sizeStyles[size].item} text-left flex items-center justify-between
                      transition-colors
                      ${isSelected
                        ? "bg-primary/10 text-foreground"
                        : "text-foreground hover:bg-surface-hover"
                      }
                    `.trim()}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <Check size={16} className="text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
      {hint && !error && <p className="text-muted text-xs mt-1.5">{hint}</p>}
    </div>
  );
}
