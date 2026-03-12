"use client";

import React, { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type InputSize = "sm" | "md" | "lg";

const sizeStyles: Record<InputSize, {
  input: string;
  label: string;
  iconWrapper: string;
  iconPadding: string;
  passwordPadding: string;
  eyeSize: number;
}> = {
  sm: {
    input: "h-9 px-3 text-xs rounded-md",
    label: "text-xs font-medium mb-1",
    iconWrapper: "left-2.5",
    iconPadding: "pl-8",
    passwordPadding: "pr-9",
    eyeSize: 14,
  },
  md: {
    input: "h-11 px-4 text-sm rounded-lg",
    label: "text-sm font-medium mb-1.5",
    iconWrapper: "left-3.5",
    iconPadding: "pl-11",
    passwordPadding: "pr-12",
    eyeSize: 18,
  },
  lg: {
    input: "h-14 px-5 text-base rounded-lg",
    label: "text-base font-medium mb-2",
    iconWrapper: "left-4",
    iconPadding: "pl-12",
    passwordPadding: "pr-14",
    eyeSize: 20,
  },
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  inputSize?: InputSize;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon,
      type = "text",
      fullWidth = true,
      inputSize = "md",
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const styles = sizeStyles[inputSize];

    return (
      <div className={cn(fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn("block text-foreground", styles.label)}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className={cn("absolute top-1/2 -translate-y-1/2 text-muted", styles.iconWrapper)}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={isPassword && showPassword ? "text" : type}
            onKeyDown={(e) => {
              if (type === "number" && ["-", "e", "E", "+"].includes(e.key)) {
                e.preventDefault();
              }
              props.onKeyDown?.(e);
            }}
            className={cn(
              "w-full bg-surface border text-foreground placeholder:text-muted focus:outline-none transition-colors",
              styles.input,
              icon && styles.iconPadding,
              isPassword && styles.passwordPadding,
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500/25"
                : "border-border",
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={styles.eyeSize} /> : <Eye size={styles.eyeSize} />}
            </button>
          )}
        </div>
        {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
        {hint && !error && <p className="text-muted text-xs mt-1.5">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
