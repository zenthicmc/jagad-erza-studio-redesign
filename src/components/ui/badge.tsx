import React from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-hover text-muted border-transparent",
  primary: "bg-primary/15 text-primary border-primary/25",
  success: "bg-green-500/15 text-green-500 border-green-500/25",
  warning: "bg-amber-500/15 text-amber-500 border-amber-500/25",
  danger: "bg-red-500/15 text-red-500 border-red-500/25",
  outline: "bg-transparent text-muted border-border",
};

export default function Badge({
  children,
  variant = "default",
  dot = false,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${variantStyles[variant]}
        ${className}
      `.trim()}
    >
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      )}
      {children}
    </span>
  );
}
