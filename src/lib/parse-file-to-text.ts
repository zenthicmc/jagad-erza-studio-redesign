import mammoth from "mammoth";

const PLAIN_TEXT_EXTS = ["txt", "md"];
const DOC_EXTS = ["doc", "docx"];
const PDF_EXT = "pdf";
const SUPPORTED_EXTENSIONS = [...PLAIN_TEXT_EXTS, ...DOC_EXTS, PDF_EXT];

export const SUPPORTED_FILE_EXTENSIONS = SUPPORTED_EXTENSIONS;
export const SUPPORTED_FILE_ACCEPT = ".txt,.md,.doc,.docx,.pdf";

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.documentElement.textContent || "").replace(/\s+/g, " ").trim();
}

/**
 * Extract plain text from an uploaded file.
 * Supports: .txt, .md (plain text), .doc/.docx (mammoth), .pdf (pdfjs-dist).
 * Mirrors the processing used in the writing assistant.
 */
export async function parseFileToText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  if (PLAIN_TEXT_EXTS.includes(ext)) {
    return file.text();
  }

  if (DOC_EXTS.includes(ext)) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return htmlToPlainText(result.value);
  }

  if (ext === PDF_EXT) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const parts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items as Array<{ str?: string }>)
        .map((item) => item.str || "")
        .join(" ");
      parts.push(pageText);
    }

    return parts.join("\n\n");
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
