"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-primary via-primary-dark to-primary-dark text-white hover:opacity-90 shadow-lg shadow-primary/20 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] border border-transparent",
  secondary:
    "bg-surface border border-border text-foreground hover:bg-surface-hover",
  outline:
    "bg-transparent border border-primary/40 text-primary hover:bg-primary/10",
  ghost:
    "bg-transparent text-muted hover:bg-surface-hover hover:text-foreground border border-transparent",
  danger:
    "bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm rounded-lg gap-2",
  lg: "h-14 px-5 text-base rounded-lg gap-2.5",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-semibold transition-all cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `.trim()}
      {...props}
    >
      {loading ? (
        <Loader2
          size={size === "sm" ? 14 : size === "lg" ? 20 : 16}
          className="animate-spin"
        />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </button>
  );
}
