"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

export interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
  disabled?: boolean;
}

export function Dropdown({
  trigger,
  items,
  align = "right",
  className = "",
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
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

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={className}
      style={isOpen ? { opacity: 1, zIndex: 50 } : undefined}
    >
      <div className="relative">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
        >
          {trigger}
        </div>

        {isOpen && (
          <div
            className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1 w-36 border border-border rounded-lg shadow-xl z-[100] py-1`}
            style={{ backgroundColor: "var(--surface)" }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(item.onClick);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-xs w-full transition-colors ${item.variant === "danger"
                    ? "text-red-500 hover:bg-red-500/10"
                    : "text-foreground hover:bg-surface-hover"
                  }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
