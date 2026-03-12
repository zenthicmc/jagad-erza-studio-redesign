"use client";

import React, { forwardRef } from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, hint, fullWidth = true, className = "", id, ...props },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

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
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 bg-surface border rounded-xl text-foreground
            placeholder:text-muted text-sm resize-y min-h-[100px]
            focus:outline-none focus:ring-1 transition-colors
            ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                : "border-border focus:border-primary/50 focus:ring-primary/25"
            }
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        {hint && !error && <p className="text-muted text-xs mt-1.5">{hint}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
export default Textarea;
