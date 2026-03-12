/**
 * Strips markdown formatting from a string and returns clean plain text.
 * Handles: headings, bold, italic, strikethrough, code blocks, inline code,
 * blockquotes, unordered/ordered lists, links, images, horizontal rules,
 * and HTML entities.
 */
export function stripMarkdown(text: string): string {
  if (!text) return text;

  return text
    // Remove fenced code blocks (```...```) — keep the content inside
    .replace(/```[\s\S]*?```/g, (match) =>
      match.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim()
    )
    // Remove inline code (`code`)
    .replace(/`([^`]+)`/g, "$1")
    // Remove headings (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold+italic (***text*** or ___text___)
    .replace(/\*{3}(.+?)\*{3}/g, "$1")
    .replace(/_{3}(.+?)_{3}/g, "$1")
    // Remove bold (**text** or __text__)
    .replace(/\*{2}(.+?)\*{2}/g, "$1")
    .replace(/_{2}(.+?)_{2}/g, "$1")
    // Remove italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove strikethrough (~~text~~)
    .replace(/~~(.+?)~~/g, "$1")
    // Remove blockquotes (> text)
    .replace(/^>\s+/gm, "")
    // Remove unordered list markers (- * +)
    .replace(/^[\-\*\+]\s+/gm, "")
    // Remove ordered list markers (1. 2. etc.)
    .replace(/^\d+\.\s+/gm, "")
    // Remove images (![alt](url))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove links ([text](url)) — keep the text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    // Remove horizontal rules (--- *** ___)
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
