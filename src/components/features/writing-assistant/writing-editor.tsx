"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { CustomImageExtension } from "../article/custom-image-extension";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Minus,
  Trash2,
  Columns,
  Rows,
  Merge,
  Split,
  Upload,
} from "lucide-react";

interface EditorRef {
  getSelection: () => { from: number; to: number; text: string } | null;
  replaceText: (from: number, to: number, text: string) => void;
  insertAtPosition: (position: number, text: string) => void;
  getCursorPosition: () => number;
}

interface WritingEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onTextSelection?: (selectedText: string, range: { from: number; to: number }, rect: DOMRect) => void;
  editorRef?: React.MutableRefObject<EditorRef | null>;
  selectionDisabled?: boolean;
  editable?: boolean;
}

function ToolbarButton({
  onClick,
  isActive = false,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${isActive
        ? "bg-primary/20 text-primary"
        : "text-muted hover:text-foreground hover:bg-surface-hover"
        }`}
    >
      {children}
    </button>
  );
}

interface ToolbarProps {
  editor: Editor;
}

function Toolbar({ editor }: ToolbarProps) {
  const t = useTranslations("tiptapEditor");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageData, setImageData] = useState({
    url: "",
    sourceName: "",
    sourceUrl: "",
  });

  const handleLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: linkUrl })
          .run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkInput(false);
      setLinkUrl("");
    } else {
      const previousUrl = editor.getAttributes("link").href;
      setLinkUrl(previousUrl || "");
      setShowLinkInput(true);
    }
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkInput(false);
    setLinkUrl("");
  };

  const handleImage = () => {
    setShowImageModal(true);
  };

  const handleImageSubmit = () => {
    if (imageData.url) {
      editor
        .chain()
        .focus()
        .setCustomImage({
          src: imageData.url,
          alt: imageData.sourceName || undefined,
          sourceName: imageData.sourceName || undefined,
          sourceUrl: imageData.sourceUrl || undefined,
        })
        .run();
      setShowImageModal(false);
      setImageData({ url: "", sourceName: "", sourceUrl: "" });
    }
  };

  const handleImageCancel = () => {
    setShowImageModal(false);
    setImageData({ url: "", sourceName: "", sourceUrl: "" });
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl) setImageData((prev) => ({ ...prev, url: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData?.items || []).find((item) =>
      item.type.startsWith("image/"),
    )?.getAsFile();
    if (file) {
      e.preventDefault();
      handleImageFile(file);
    }
  };

  const handleTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const iconSize = 15;

  return (
    <div className="sticky top-14 z-10 flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-surface shadow-sm">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title={t("undo")}
      >
        <Undo size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title={t("redo")}
      >
        <Redo size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title={t("heading1")}
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title={t("heading2")}
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title={t("heading3")}
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title={t("bold")}
      >
        <Bold size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title={t("italic")}
      >
        <Italic size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title={t("underline")}
      >
        <UnderlineIcon size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title={t("strikethrough")}
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title={t("alignLeft")}
      >
        <AlignLeft size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title={t("alignCenter")}
      >
        <AlignCenter size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title={t("alignRight")}
      >
        <AlignRight size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title={t("alignJustify")}
      >
        <AlignJustify size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title={t("bulletList")}
      >
        <List size={iconSize} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title={t("orderedList")}
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>

      <div className="w-px h-5 bg-border mx-1" />

      <ToolbarButton
        onClick={handleLink}
        isActive={editor.isActive("link")}
        title={t("insertLink")}
      >
        <LinkIcon size={iconSize} />
      </ToolbarButton>

      <ToolbarButton onClick={handleImage} title={t("insertImage")}>
        <ImageIcon size={iconSize} />
      </ToolbarButton>

      <ToolbarButton onClick={handleTable} title={t("insertTable")}>
        <TableIcon size={iconSize} />
      </ToolbarButton>

      {showLinkInput && (
        <div className="flex items-center gap-1 ml-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLink()}
            placeholder={t("enterUrl")}
            className="px-2 py-1 text-xs bg-background border border-border rounded-md text-foreground w-48 focus:outline-none focus:border-primary/50"
            autoFocus
          />
          <button
            onClick={handleLink}
            className="text-xs text-primary hover:text-primary-light px-1.5"
          >
            OK
          </button>
          {editor.isActive("link") && (
            <button
              onClick={handleUnlink}
              className="text-xs text-red-500 hover:text-red-400 px-1.5"
              title="Remove link"
            >
              Unlink
            </button>
          )}
          <button
            onClick={() => {
              setShowLinkInput(false);
              setLinkUrl("");
            }}
            className="text-xs text-muted hover:text-foreground px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onPaste={handleImagePaste}
        >
          <div className="bg-surface rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Insert Image
            </h3>
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={handleImageDrop}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-10 h-10 mx-auto text-muted mb-2" />
                <p className="text-sm text-muted mb-1">
                  Drag and drop an image here, or paste from clipboard
                </p>
                <p className="text-xs text-muted">PNG, JPG, GIF, WebP</p>
                {imageData.url && (
                  <p className="text-xs text-primary mt-2 font-medium">
                    Image loaded ✓
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Or enter Image URL
                </label>
                <input
                  type="url"
                  value={imageData.url}
                  onChange={(e) =>
                    setImageData({ ...imageData, url: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Source Name (optional)
                </label>
                <input
                  type="text"
                  value={imageData.sourceName}
                  onChange={(e) =>
                    setImageData({ ...imageData, sourceName: e.target.value })
                  }
                  placeholder="e.g., Pexels, Unsplash"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Source URL (optional)
                </label>
                <input
                  type="url"
                  value={imageData.sourceUrl}
                  onChange={(e) =>
                    setImageData({ ...imageData, sourceUrl: e.target.value })
                  }
                  placeholder="https://example.com/source"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={handleImageCancel}
                className="px-4 py-2 text-sm text-muted hover:text-foreground rounded-lg hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImageSubmit}
                disabled={!imageData.url}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FloatingTableMenu({ editor }: { editor: Editor }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updatePosition = () => {
      if (editor.isActive("table")) {
        const { view } = editor;
        const { state } = view;
        const { from } = state.selection;

        let tableNode: ProseMirrorNode | null = null;
        let tablePos = 0;
        state.doc.descendants((node, pos) => {
          if (
            node.type.name === "table" &&
            pos <= from &&
            from <= pos + node.nodeSize
          ) {
            tableNode = node;
            tablePos = pos;
            return false;
          }
        });

        if (tableNode) {
          const tableDOM = view.nodeDOM(tablePos) as HTMLElement;
          if (tableDOM) {
            const editorRect = view.dom.getBoundingClientRect();
            const tableRect = tableDOM.getBoundingClientRect();
            setPosition({
              top: tableRect.top - editorRect.top - 45,
              left: tableRect.left - editorRect.left,
            });
            setVisible(true);
            return;
          }
        }
      }
      setVisible(false);
    };

    updatePosition();
    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);

    return () => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
    };
  }, [editor]);

  if (!visible) return null;

  return (
    <div
      className="absolute z-20 flex items-center gap-1 bg-surface/95 backdrop-blur-sm border border-border rounded-lg p-1.5 shadow-lg"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <button
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Add column before"
      >
        <Plus size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Add column after"
      >
        <Columns size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Delete column"
      >
        <Minus size={14} />
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Add row before"
      >
        <Plus size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Add row after"
      >
        <Rows size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Delete row"
      >
        <Minus size={14} />
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => editor.chain().focus().mergeCells().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Merge cells"
      >
        <Merge size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().splitCell().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
        title="Split cell"
      >
        <Split size={14} />
      </button>
      <div className="w-px h-4 bg-border" />
      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="p-1.5 rounded hover:bg-background transition-colors text-red-500 hover:text-red-400"
        title="Delete table"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function WritingEditor({
  content,
  onChange,
  onTextSelection,
  editorRef,
  selectionDisabled = false,
  editable = true,
}: WritingEditorProps) {
  const contentRef = useRef(content);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph", "tableCell", "tableHeader"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      CustomImageExtension,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "full-width-table",
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    editable: editable,
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      contentRef.current = html;
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class:
          "selectable markdown-render-area min-h-[400px] p-5 focus:outline-none",
      },
    },
    immediatelyRender: false,
  });

  // Handle text selection
  useEffect(() => {
    if (!editor || selectionDisabled) return;

    const handleSelectionChange = () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const { state } = editor;
        const { from, to } = state.selection;

        if (from !== to) {
          const selectedText = state.doc.textBetween(from, to, " ");
          if (selectedText.trim().length > 0) {
            // Get selection coordinates
            const { view } = editor;
            const { ranges } = view.state.selection;
            if (ranges.length > 0) {
              const range = ranges[0];
              const start = view.coordsAtPos(range.$from.pos);
              const end = view.coordsAtPos(range.$to.pos);
              const rect = {
                left: Math.min(start.left, end.left),
                right: Math.max(start.right, end.right),
                top: Math.min(start.top, end.top),
                bottom: Math.max(start.bottom, end.bottom),
                width: Math.abs(end.left - start.left),
                height: Math.abs(end.bottom - start.top),
              } as DOMRect;

              onTextSelection?.(selectedText, { from, to }, rect);
            }
          }
        }
      }, 500);
    };

    editor.on("selectionUpdate", handleSelectionChange);

    return () => {
      editor.off("selectionUpdate", handleSelectionChange);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [editor, onTextSelection, selectionDisabled]);

  // Expose editor methods via ref
  useEffect(() => {
    if (editorRef) {
      editorRef.current = {
        getSelection: () => {
          if (!editor) return null;
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to, " ");
          return { from, to, text };
        },
        replaceText: (from: number, to: number, text: string) => {
          if (!editor) return;

          // Get the document length to check if positions are valid
          const docLength = editor.state.doc.content.size;

          // If positions are out of range (e.g., editor was cleared),
          // just insert at the beginning
          if (from >= docLength || to > docLength) {
            editor.chain().focus().insertContent(text).run();
          } else {
            // Normal case: delete range and insert
            editor
              .chain()
              .focus()
              .deleteRange({ from, to })
              .insertContent(text)
              .run();
          }
        },
        insertAtPosition: (position: number, text: string) => {
          if (!editor) return;
          const docLength = editor.state.doc.content.size;
          const safePosition = Math.min(position, docLength - 1);
          editor
            .chain()
            .focus()
            .setTextSelection(safePosition)
            .insertContent(text)
            .run();
        },
        getCursorPosition: () => {
          if (!editor) return 0;
          return editor.state.selection.from;
        },
      };
    }
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor) return;
    const isEmpty = !content || content === "<p></p>" || content === "<p><br></p>" || content.trim() === "";
    const editorIsEmpty = !contentRef.current || contentRef.current === "<p></p>" || contentRef.current === "<p><br></p>" || contentRef.current.trim() === "";
    // Always sync when content changed, including a reset to empty
    if (content !== contentRef.current || (isEmpty && !editorIsEmpty)) {
      contentRef.current = content;
      editor.commands.setContent(isEmpty ? "<p></p>" : content);
    }
  }, [content, editor]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Add table resize handles
  useEffect(() => {
    if (!editor) return;

    const addResizeHandles = () => {
      const tables = editor.view.dom.querySelectorAll("table");
      tables.forEach((table) => {
        const wrapper = table.closest(".tableWrapper") as HTMLElement;
        if (!wrapper || wrapper.dataset.resizable) return;

        wrapper.dataset.resizable = "true";
        wrapper.style.position = "relative";

        const handle = document.createElement("div");
        handle.className = "table-resize-handle";
        handle.style.cssText = `
          position: absolute;
          right: -6px;
          bottom: -6px;
          width: 12px;
          height: 12px;
          background: var(--color-primary);
          cursor: nwse-resize;
          border-radius: 2px;
          z-index: 10;
          opacity: 0;
          transition: opacity 0.2s;
        `;

        wrapper.addEventListener("mouseenter", () => {
          handle.style.opacity = "1";
        });
        wrapper.addEventListener("mouseleave", () => {
          handle.style.opacity = "0";
        });

        handle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = table.offsetWidth;
          const startHeight = table.offsetHeight;
          const aspectRatio = startWidth / startHeight;

          const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            const delta = Math.max(deltaX, deltaY / aspectRatio);
            const newWidth = Math.max(200, startWidth + delta);

            table.style.width = `${newWidth}px`;
            wrapper.style.width = `${newWidth}px`;
          };

          const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
          };

          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });

        wrapper.appendChild(handle);
      });
    };

    addResizeHandles();
    editor.on("update", addResizeHandles);

    return () => {
      editor.off("update", addResizeHandles);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <Toolbar editor={editor} />
      <div className="relative">
        <FloatingTableMenu editor={editor} />
        <EditorContent editor={editor} className="border-none ring-0" />
      </div>
    </div>
  );
}
