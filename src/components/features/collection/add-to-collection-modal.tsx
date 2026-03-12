"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  PlusCircle,
  Folder,
  Star,
  Heart,
  Bookmark,
  Tag,
  Zap,
  Award,
  Flag,
  FileText,
  Music,
  Camera,
  Coffee,
} from "lucide-react";
import { Modal, Button } from "@/components/ui";
import { useCollectionStore } from "@/stores/collection-store";
import toast from "react-hot-toast";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  folder: Folder,
  star: Star,
  heart: Heart,
  bookmark: Bookmark,
  tag: Tag,
  zap: Zap,
  award: Award,
  flag: Flag,
  "file-text": FileText,
  music: Music,
  camera: Camera,
  coffee: Coffee,
};

interface AddToCollectionModalProps {
  isOpen: boolean;
  articleId: string;
  onClose: () => void;
  onCreateNew: () => void;
}

export function AddToCollectionModal({
  isOpen,
  articleId,
  onClose,
  onCreateNew,
}: AddToCollectionModalProps) {
  const t = useTranslations("collection");
  const tCommon = useTranslations("common");
  const { collections, fetchCollections, addItemToCollection } =
    useCollectionStore();

  const [selected, setSelected] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCollections();
      setSelected(null);
    }
  }, [isOpen, fetchCollections]);

  const handleAdd = async () => {
    if (!selected || !articleId) return;
    setIsAdding(true);
    try {
      await addItemToCollection(selected, articleId);
      toast.success(t("addedToCollection"));
      onClose();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (status === 409) {
        toast.error(t("alreadyInCollection"));
      } else {
        toast.error(t("addToCollectionError"));
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("selectCollection")}
      description={t("selectCollectionDesc")}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isAdding}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleAdd}
            disabled={!selected || isAdding}
          >
            {isAdding ? tCommon("loading") : tCommon("add")}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            onClose();
            onCreateNew();
          }}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-hover text-muted">
            <PlusCircle size={20} />
          </div>
          <span className="text-xs font-medium text-muted truncate w-full text-center">
            {t("createNew")}
          </span>
        </button>

        {collections.map((c) => {
          const IconComp = ICON_MAP[c.icon || "folder"] || Folder;
          const isSelected = selected === c.id;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-surface-hover"
                }`}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: c.color
                    ? `${c.color}20`
                    : "var(--surface-hover)",
                  color: c.color || "var(--muted)",
                }}
              >
                <IconComp size={20} />
              </div>
              <span className="text-xs font-medium text-foreground truncate w-full text-center">
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
