import React from "react";
import Image from "next/image";

type AvatarSize = "xs" | "sm" | "md" | "lg";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<
  AvatarSize,
  { container: string; text: string; px: number }
> = {
  xs: { container: "w-6 h-6", text: "text-[10px]", px: 24 },
  sm: { container: "w-8 h-8", text: "text-xs", px: 32 },
  md: { container: "w-10 h-10", text: "text-sm", px: 40 },
  lg: { container: "w-14 h-14", text: "text-lg", px: 56 },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({
  src,
  alt = "",
  name = "",
  size = "md",
  className = "",
}: AvatarProps) {
  const s = sizeStyles[size];

  if (src) {
    return (
      <div
        className={`${s.container} rounded-full overflow-hidden flex-shrink-0 ${className}`}
      >
        <Image
          src={src}
          alt={alt || name}
          width={s.px}
          height={s.px}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`
        ${s.container} rounded-full flex-shrink-0
        bg-primary/20 flex items-center justify-center
        text-primary font-semibold ${s.text}
        ${className}
      `.trim()}
      title={name}
    >
      {name ? getInitials(name) : "?"}
    </div>
  );
}
