import React from "react";
import { Loader2 } from "lucide-react";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

export default function Spinner({
  size = "md",
  label,
  className = "",
}: SpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
    >
      <Loader2 size={sizeMap[size]} className="animate-spin text-primary" />
      {label && <span className="text-sm text-muted">{label}</span>}
      <span className="sr-only">Loading...</span>
    </div>
  );
}
