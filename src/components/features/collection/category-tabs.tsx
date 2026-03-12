"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
        .split("")
        .map((c) => c + c)
        .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

interface CategoryTabsProps {
  activeCategory: string;
  categories: Category[];
  onCategorySelect: (categoryId: string) => void;
  onCreateNew: () => void;
  onRenameCategory?: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
  isAuthenticated?: boolean;
}

export interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
  isDefault?: boolean;
  color?: string;
}

function TabMenu({
  categoryId,
  onRename,
  onDelete,
  onOpenChange,
}: {
  categoryId: string;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const tCommon = useTranslations("common");
  const t = useTranslations("collection");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const setOpenWithCallback = (value: boolean) => {
    setOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenWithCallback(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setOpenWithCallback(!open);
        }}
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-[200] min-w-[120px] rounded-lg border border-border shadow-xl py-1"
          style={{ backgroundColor: "var(--surface)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 px-3 py-2 text-xs w-full text-foreground hover:bg-surface-hover transition-colors"
            onClick={() => { onRename?.(categoryId); setOpenWithCallback(false); }}
          >
            <Pencil className="w-3.5 h-3.5" />
            {tCommon("edit")}
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 text-xs w-full text-red-500 hover:bg-red-500/10 transition-colors"
            onClick={() => { onDelete?.(categoryId); setOpenWithCallback(false); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}

export function CategoryTabs({
  activeCategory,
  categories,
  onCategorySelect,
  onCreateNew,
  onRenameCategory,
  onDeleteCategory,
  isAuthenticated = false,
}: CategoryTabsProps) {
  const t = useTranslations("collection");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        const color = category.color;
        const showMenu = isAuthenticated && !category.isDefault;
        const menuOpen = openMenuId === category.id;
        const lightBg = isActive && color ? isLightColor(color) : false;

        return (
          <div key={category.id} className="relative group/tab">
            <button
              onClick={() => onCategorySelect(category.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${isActive
                  ? color
                    ? `border-transparent ${lightBg ? "text-black" : "text-white"}`
                    : "bg-primary text-white border-transparent shadow-sm"
                  : "bg-surface border-border text-foreground hover:border-primary/50 hover:bg-surface-hover"
                } ${showMenu ? "group-hover/tab:pr-7" : ""} ${showMenu && menuOpen ? "pr-7" : ""}`}
              style={
                isActive && color
                  ? { backgroundColor: color, borderColor: color }
                  : !isActive && color
                    ? ({
                      "--hover-bg": `color-mix(in srgb, ${color} 15%, transparent)`,
                      "--hover-border": color,
                    } as React.CSSProperties)
                    : undefined
              }
            >
              <span
                className={`w-4 h-4 flex-shrink-0 ${isActive ? "opacity-100" : "opacity-60 group-hover/tab:opacity-100"}`}
                style={
                  isActive && color
                    ? { color: lightBg ? "#000" : "#fff" }
                    : !isActive && color
                      ? { color }
                      : undefined
                }
              >
                {category.icon}
              </span>
              <span>{category.label}</span>
            </button>

            {showMenu && (
              <div
                className={`absolute right-1 top-1/2 -translate-y-1/2 transition-opacity ${menuOpen
                    ? "opacity-100"
                    : "opacity-0 group-hover/tab:opacity-100"
                  }`}
              >
                <TabMenu
                  categoryId={category.id}
                  onRename={onRenameCategory}
                  onDelete={onDeleteCategory}
                  onOpenChange={(o) =>
                    setOpenMenuId(o ? category.id : null)
                  }
                />
              </div>
            )}
          </div>
        );
      })}

      {isAuthenticated && (
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-border text-muted hover:border-primary hover:text-primary hover:bg-surface-hover transition-all"
        >
          <Plus className="w-4 h-4" />
          {t("createNew")}
        </button>
      )}
    </div>
  );
}
