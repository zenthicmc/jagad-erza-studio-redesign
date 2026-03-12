/**
 * Download utilities for exporting content as PDF or DOCX.
 * TypeScript port of v1 downloadUtils.js.
 */

export const sanitizeFilename = (name: string, maxLength = 100): string => {
  if (!name) return "Untitled";
  return name.replace(/[<>:"/\\|?*]/g, "-").substring(0, maxLength);
};

export const getTitleFromElement = (element: HTMLElement): string | null => {
  if (!element) return null;
  const heading = element.querySelector("h1, h2");
  return heading?.textContent?.trim() || null;
};

interface ImageData {
  dataUrl: string;
  width: number;
  height: number;
}

const loadImageAsDataUrl = async (
  imgElement: HTMLImageElement,
): Promise<ImageData | null> => {
  const src = imgElement.src || imgElement.getAttribute("src");
  if (!src) return null;

  if (imgElement.complete && imgElement.naturalWidth > 0) {
    try {
      const canvas = document.createElement("canvas");
      const width = imgElement.naturalWidth;
      const height = imgElement.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(imgElement, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      if (dataUrl && dataUrl !== "data:,") return { dataUrl, width, height };
    } catch {
      /* canvas tainted */
    }
  }

  try {
    const response = await fetch(src, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) {
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 400, height: 300 });
            img.src = dataUrl;
          },
        );
        return { dataUrl, ...dimensions };
      }
    }
  } catch {
    /* CORS fetch failed */
  }

  try {
    const result = await new Promise<ImageData | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve({
            dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src + (src.includes("?") ? "&" : "?") + "_t=" + Date.now();
    });
    if (result) return result;
  } catch {
    /* crossOrigin load failed */
  }

  return null;
};

interface PdfOptions {
  pdfOptions?: Record<string, unknown>;
}

export const downloadAsPdf = async ({
  element,
  filename,
}: {
  element: HTMLElement;
  filename: string;
} & PdfOptions): Promise<void> => {
  if (!element) throw new Error("Content element not found");

  const { jsPDF } = await import("jspdf");

  /** Parse a CSS color value (hex, rgb, named) into {r,g,b} 0-255. */
  const parseColorToRgb = (
    color: string,
  ): { r: number; g: number; b: number } | null => {
    if (!color) return null;

    // #RGB or #RRGGBB
    const hexMatch = color.match(
      /^#([0-9a-f]{3,8})$/i,
    );
    if (hexMatch) {
      let hex = hexMatch[1];
      if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
      if (hex.length >= 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
        };
      }
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = color.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/,
    );
    if (rgbMatch) {
      let r = parseInt(rgbMatch[1]);
      let g = parseInt(rgbMatch[2]);
      let b = parseInt(rgbMatch[3]);
      // Alpha-blend against white when alpha < 1
      if (rgbMatch[4] !== undefined) {
        const a = parseFloat(rgbMatch[4]);
        if (a < 1) {
          r = Math.round(r * a + 255 * (1 - a));
          g = Math.round(g * a + 255 * (1 - a));
          b = Math.round(b * a + 255 * (1 - a));
        }
      }
      return { r, g, b };
    }

    return null;
  };

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const maxY = pageHeight - margin;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let currentY = margin;
  const processedImages = new Set<string>();

  const checkNewPage = (neededHeight: number): boolean => {
    if (currentY + neededHeight > maxY) {
      pdf.addPage();
      currentY = margin;
      return true;
    }
    return false;
  };

  const getTextAlign = (el: Element): string => {
    const style = (el as HTMLElement).getAttribute("style") || "";
    if (
      style.includes("text-align: center") ||
      style.includes("text-align:center")
    )
      return "center";
    if (
      style.includes("text-align: right") ||
      style.includes("text-align:right")
    )
      return "right";
    if (
      style.includes("text-align: justify") ||
      style.includes("text-align:justify")
    )
      return "justify";
    return "left";
  };

  interface TextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough?: boolean;
    link: string | null;
    color: string | null;
    backgroundColor: string | null;
    textDecorationColor: string | null;
  }

  const extractFormattedSegments = (el: Element): TextSegment[] => {
    const segments: TextSegment[] = [];

    const walk = (
      node: Node,
      formatting = {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        link: null as string | null,
        color: null as string | null,
        backgroundColor: null as string | null,
        textDecorationColor: null as string | null,
      },
    ) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) segments.push({ text, ...formatting });
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tag = element.tagName.toLowerCase();
        const style = element.style;
        const newFormatting = { ...formatting };

        if (tag === "strong" || tag === "b") newFormatting.bold = true;
        if (tag === "em" || tag === "i") newFormatting.italic = true;
        if (tag === "u") newFormatting.underline = true;
        if (tag === "s" || tag === "strike" || tag === "del")
          newFormatting.strikethrough = true;
        if (tag === "a")
          newFormatting.link = (element as HTMLAnchorElement).getAttribute(
            "href",
          );

        if (style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600)
          newFormatting.bold = true;
        if (style.fontStyle === "italic") newFormatting.italic = true;
        if (style.textDecoration.includes("underline"))
          newFormatting.underline = true;
        if (style.textDecoration.includes("line-through"))
          newFormatting.strikethrough = true;
        if (style.color) newFormatting.color = style.color;
        if (style.backgroundColor) newFormatting.backgroundColor = style.backgroundColor;
        if (style.textDecorationColor) newFormatting.textDecorationColor = style.textDecorationColor;

        if (tag === "img") return;
        for (const child of Array.from(node.childNodes))
          walk(child, newFormatting);
      }
    };

    walk(el);
    return segments;
  };

  const addFormattedText = (
    el: Element,
    fontSize: number,
    defaultBold = false,
    lineHeight = 1.4,
  ) => {
    const segments = extractFormattedSegments(el);
    if (segments.length === 0) return;

    const textAlign = getTextAlign(el);
    const lineHeightMm = fontSize * 0.352778 * lineHeight;

    const fullText = segments.map((s) => s.text).join("");
    if (!fullText.trim()) return;

    const hasFormatting = segments.some(
      (s) =>
        s.bold ||
        s.italic ||
        s.underline ||
        s.link ||
        s.strikethrough ||
        s.color,
    );

    if (!hasFormatting) {
      pdf.setFontSize(fontSize);
      pdf.setFont("helvetica", defaultBold ? "bold" : "normal");

      const lines = pdf.splitTextToSize(fullText.trim(), contentWidth);
      const totalLines = lines.length;

      for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
        const line = lines[lineIndex];
        const isLastLine = lineIndex === totalLines - 1;
        checkNewPage(lineHeightMm);

        if (textAlign === "justify" && !isLastLine) {
          const words = line.split(" ").filter((w: string) => w);
          if (words.length > 1) {
            const totalWordsWidth = words.reduce(
              (sum: number, word: string) => sum + pdf.getTextWidth(word),
              0,
            );
            const totalSpaceWidth = contentWidth - totalWordsWidth;
            const spacePerGap = totalSpaceWidth / (words.length - 1);

            let x = margin;
            for (let i = 0; i < words.length; i++) {
              pdf.text(words[i], x, currentY);
              x += pdf.getTextWidth(words[i]) + spacePerGap;
            }
          } else {
            pdf.text(line, margin, currentY);
          }
        } else {
          let x = margin;
          if (textAlign === "center") {
            const textWidth = pdf.getTextWidth(line);
            x = margin + (contentWidth - textWidth) / 2;
          } else if (textAlign === "right") {
            const textWidth = pdf.getTextWidth(line);
            x = margin + contentWidth - textWidth;
          }
          pdf.text(line, x, currentY);
        }
        currentY += lineHeightMm;
      }
      return;
    }

    // Token-based wrapping logic
    // 1. Flatten segments into tokens (words and whitespace)
    // 2. Measure tokens individually with their specific formatting
    // 3. Build lines respecting max width

    interface Token {
      text: string;
      width: number;
      fontStyle: string;
      segment: TextSegment;
    }

    const tokens: Token[] = [];

    pdf.setFontSize(fontSize);

    segments.forEach((segment) => {
      // Split by whitespace but keep delimiters
      // This regex matches: (whitespace sequence) OR (non-whitespace sequence)
      const parts = segment.text.split(/(\s+)/).filter((p) => p.length > 0);

      // Determine font style for this segment
      let fontStyle = "normal";
      if ((segment.bold || defaultBold) && segment.italic)
        fontStyle = "bolditalic";
      else if (segment.bold || defaultBold) fontStyle = "bold";
      else if (segment.italic) fontStyle = "italic";

      pdf.setFont("helvetica", fontStyle);

      parts.forEach((part) => {
        tokens.push({
          text: part,
          width: pdf.getTextWidth(part),
          fontStyle,
          segment,
        });
      });
    });

    const lines: Token[][] = [];
    let currentLineTokens: Token[] = [];
    let currentLineWidth = 0;

    tokens.forEach((token) => {
      const isWhitespace = /^\s+$/.test(token.text);

      if (
        currentLineWidth + token.width > contentWidth &&
        !isWhitespace &&
        currentLineTokens.length > 0
      ) {
        lines.push(currentLineTokens);
        currentLineTokens = [];
        currentLineWidth = 0;

        currentLineTokens.push(token);
        currentLineWidth += token.width;
      } else {
        currentLineTokens.push(token);
        currentLineWidth += token.width;
      }
    });
    if (currentLineTokens.length > 0) lines.push(currentLineTokens);

    const totalLines = lines.length;

    for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
      const lineTokens = lines[lineIndex];
      const isLastLine = lineIndex === totalLines - 1;
      checkNewPage(lineHeightMm);

      // Calculate actual line width for alignment
      const actualLineWidth = lineTokens.reduce((sum, t) => sum + t.width, 0);

      // Trim trailing whitespace width for alignment calculation
      // (Visual alignment shouldn't count invisible trailing spaces)
      let visualLineWidth = actualLineWidth;
      for (let i = lineTokens.length - 1; i >= 0; i--) {
        if (/^\s+$/.test(lineTokens[i].text)) {
          visualLineWidth -= lineTokens[i].width;
        } else {
          break;
        }
      }

      let leadingWhitespaceWidth = 0;
      for (const t of lineTokens) {
        if (/^\s+$/.test(t.text)) leadingWhitespaceWidth += t.width;
        else break;
      }
      const alignWidth = visualLineWidth - leadingWhitespaceWidth;

      let startX = margin;
      if (textAlign === "center") {
        startX =
          margin + (contentWidth - alignWidth) / 2 - leadingWhitespaceWidth;
      } else if (textAlign === "right") {
        startX = margin + contentWidth - alignWidth - leadingWhitespaceWidth;
      }

      // Justify logic (distribute space among whitespace tokens)
      let justifyGap = 0;
      if (textAlign === "justify" && !isLastLine) {
        // Find whitespace tokens to expand
        const whitespaceTokens = lineTokens.filter((t) => /^\s+$/.test(t.text));
        // Trim last whitespace token from justification logic
        let effectiveWhitespaceCount = whitespaceTokens.length;
        if (
          lineTokens.length > 0 &&
          /^\s+$/.test(lineTokens[lineTokens.length - 1].text)
        ) {
          effectiveWhitespaceCount--;
        }

        if (effectiveWhitespaceCount > 0) {
          const missingWidth = contentWidth - visualLineWidth;
          if (missingWidth > 0) {
            justifyGap = missingWidth / effectiveWhitespaceCount;
          }
        }
      }

      let currentX = startX;

      for (let i = 0; i < lineTokens.length; i++) {
        const token = lineTokens[i];
        const isWhitespace = /^\s+$/.test(token.text);

        pdf.setFont("helvetica", token.fontStyle);
        const segment = token.segment;

        if (segment.color) {
          pdf.setTextColor(segment.color);
        } else if (segment.link) {
          pdf.setTextColor(0, 102, 204);
        } else {
          pdf.setTextColor(0, 0, 0);
        }

        pdf.text(token.text, currentX, currentY);

        // Draw background highlight behind text if present
        if (segment.backgroundColor) {
          const rgb = parseColorToRgb(segment.backgroundColor);
          if (rgb) {
            const highlightHeight = fontSize * 0.352778 * 1.2;
            pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            pdf.rect(
              currentX,
              currentY - highlightHeight + 0.8,
              token.width,
              highlightHeight + 0.4,
              "F",
            );
            // Re-draw text on top of the highlight background
            pdf.setFont("helvetica", token.fontStyle);
            if (segment.color) {
              pdf.setTextColor(segment.color);
            } else {
              pdf.setTextColor(0, 0, 0);
            }
            pdf.text(token.text, currentX, currentY);
          }
        }

        const segmentWidth = token.width + (isWhitespace ? justifyGap : 0);
        void segmentWidth; // Used for future calculations

        if (!isWhitespace || segment.underline || segment.strikethrough) {
          if (segment.underline || segment.link) {
            if (segment.textDecorationColor) {
              const decRgb = parseColorToRgb(segment.textDecorationColor);
              if (decRgb) pdf.setDrawColor(decRgb.r, decRgb.g, decRgb.b);
              else pdf.setDrawColor(0, 0, 0);
            } else if (segment.color) {
              pdf.setDrawColor(segment.color);
            } else {
              pdf.setDrawColor(
                segment.link ? 0 : 0,
                segment.link ? 102 : 0,
                segment.link ? 204 : 0,
              );
            }
            const lineThickness = segment.textDecorationColor ? 0.5 : 0.2;
            pdf.setLineWidth(lineThickness);
            pdf.line(
              currentX,
              currentY + 0.5,
              currentX + token.width,
              currentY + 0.5,
            );
          }
          if (segment.strikethrough) {
            if (segment.color) pdf.setDrawColor(segment.color);
            else pdf.setDrawColor(0, 0, 0);
            pdf.setLineWidth(0.2);
            const strikeY = currentY - (fontSize * 0.352778) / 3;
            pdf.line(currentX, strikeY, currentX + token.width, strikeY);
          }
          if (segment.link) {
            const linkHeight = fontSize * 0.352778 * 1.2;
            pdf.link(
              currentX,
              currentY - linkHeight + 1,
              token.width,
              linkHeight,
              { url: segment.link },
            );
          }
        }

        currentX += token.width;
        if (isWhitespace && justifyGap > 0 && i < lineTokens.length - 1) {
          currentX += justifyGap;
        }
      }

      pdf.setTextColor(0, 0, 0);
      currentY += lineHeightMm;
    }
  };

  const addText = (
    text: string,
    fontSize: number,
    isBold = false,
    lineHeight = 1.4,
  ) => {
    if (!text?.trim()) return;
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", isBold ? "bold" : "normal");
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(text.trim(), contentWidth);
    const lineHeightMm = fontSize * 0.352778 * lineHeight;
    for (const line of lines) {
      checkNewPage(lineHeightMm);
      pdf.text(line, margin, currentY);
      currentY += lineHeightMm;
    }
  };

  const getImageAlign = (img: HTMLElement): string => {
    const pdfAlign = img.getAttribute("data-pdf-align");
    if (pdfAlign) return pdfAlign;

    const style = img.getAttribute("style") || "";
    if (
      style.includes("margin-left: auto") &&
      style.includes("margin-right: auto")
    )
      return "center";
    if (
      style.includes("margin-left: auto") &&
      !style.includes("margin-right: auto")
    )
      return "right";
    if (style.includes("float: right")) return "right";
    if (style.includes("float: left")) return "left";

    if (
      style.includes("display: block") &&
      style.includes("margin") &&
      style.includes("auto")
    )
      return "center";

    const className = img.className || "";
    if (className.includes("mx-auto") || className.includes("center"))
      return "center";
    if (className.includes("ml-auto") || className.includes("float-right"))
      return "right";
    if (className.includes("mr-auto") || className.includes("float-left"))
      return "left";

    const dataAlign = img.getAttribute("data-align");
    if (dataAlign) return dataAlign;

    const parent = img.parentElement;
    if (parent) {
      const parentStyle = parent.getAttribute("style") || "";
      if (parentStyle.includes("text-align: center")) return "center";
      if (parentStyle.includes("text-align: right")) return "right";

      const parentClass = parent.className || "";
      if (parentClass.includes("text-center")) return "center";
      if (parentClass.includes("text-right")) return "right";
    }

    return "center";
  };

  const getSpecifiedSize = (
    img: HTMLElement,
  ): { width: number | null; height: number | null } => {
    let width: number | null = null;
    let height: number | null = null;

    const style = img.getAttribute("style") || "";
    const widthMatch = style.match(/width:\s*(\d+)(px|%)?/);
    const heightMatch = style.match(/height:\s*(\d+)(px|%)?/);

    if (widthMatch) {
      width = parseInt(widthMatch[1]);
      if (widthMatch[2] === "%") {
        width = (width / 100) * contentWidth;
      } else {
        width = width * 0.264583;
      }
    }

    if (heightMatch) {
      height = parseInt(heightMatch[1]);
      if (heightMatch[2] !== "%") {
        height = height * 0.264583;
      }
    }

    if (!width && img.getAttribute("width")) {
      const attrWidth = parseInt(img.getAttribute("width") || "0");
      if (!isNaN(attrWidth)) {
        width = attrWidth * 0.264583;
      }
    }

    if (!height && img.getAttribute("height")) {
      const attrHeight = parseInt(img.getAttribute("height") || "0");
      if (!isNaN(attrHeight)) {
        height = attrHeight * 0.264583;
      }
    }

    return { width, height };
  };

  const addImage = async (imgElement: HTMLImageElement, spacingAfter = 8) => {
    const src = imgElement.src || imgElement.getAttribute("src");
    if (!src || processedImages.has(src)) return;
    processedImages.add(src);

    const imgData = await loadImageAsDataUrl(imgElement);
    if (!imgData?.dataUrl) {
      addText(`[Image: ${imgElement.alt || "Unable to load image"}]`, 10);
      return;
    }

    const alignment = getImageAlign(imgElement);
    const specifiedSize = getSpecifiedSize(imgElement);

    const aspectRatio = imgData.height / imgData.width;
    let imgWidth: number;
    let imgHeight: number;

    if (specifiedSize.width && specifiedSize.height) {
      imgWidth = Math.min(specifiedSize.width, contentWidth);
      imgHeight = specifiedSize.height;
    } else if (specifiedSize.width) {
      imgWidth = Math.min(specifiedSize.width, contentWidth);
      imgHeight = imgWidth * aspectRatio;
    } else if (specifiedSize.height) {
      imgHeight = specifiedSize.height;
      imgWidth = imgHeight / aspectRatio;
      imgWidth = Math.min(imgWidth, contentWidth);
    } else {
      imgWidth = contentWidth;
      imgHeight = imgWidth * aspectRatio;
    }

    const maxImgHeight = maxY - margin - 20;
    if (imgHeight > maxImgHeight) {
      const scale = maxImgHeight / imgHeight;
      imgHeight = maxImgHeight;
      imgWidth *= scale;
    }

    if (imgWidth > contentWidth) {
      const scale = contentWidth / imgWidth;
      imgWidth = contentWidth;
      imgHeight = imgHeight * scale;
    }

    checkNewPage(imgHeight + 5);

    let imgX: number;
    switch (alignment) {
      case "left":
        imgX = margin;
        break;
      case "right":
        imgX = margin + contentWidth - imgWidth;
        break;
      case "center":
      default:
        imgX = margin + (contentWidth - imgWidth) / 2;
        break;
    }

    pdf.addImage(imgData.dataUrl, "JPEG", imgX, currentY, imgWidth, imgHeight);
    currentY += imgHeight + spacingAfter;
  };

  const processListElement = async (
    listEl: Element,
    listType: string,
    depth: number,
  ) => {
    const indentPerLevel = 6;
    const baseIndent = margin + depth * indentPerLevel;
    const items = listEl.querySelectorAll(":scope > li");
    const lineHeightMm = 11 * 0.352778 * 1.4;

    for (let index = 0; index < items.length; index++) {
      const li = items[index];

      let bullet: string;
      if (listType === "ol") {
        bullet = `${index + 1}. `;
      } else {
        const bullets = ["•", "◦", "▪", "▫"];
        bullet = bullets[depth % bullets.length] + " ";
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      checkNewPage(lineHeightMm);
      pdf.text(bullet, baseIndent, currentY);

      const bulletWidth = pdf.getTextWidth(bullet);

      const textNodes: Node[] = [];
      li.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          textNodes.push(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const childTag = (child as HTMLElement).tagName.toLowerCase();
          if (childTag !== "ul" && childTag !== "ol") {
            textNodes.push(child);
          }
        }
      });

      const tempDiv = document.createElement("div");
      textNodes.forEach((node) => tempDiv.appendChild(node.cloneNode(true)));

      const segments = extractFormattedSegments(tempDiv);
      const fullText = segments.map((s) => s.text).join("");

      if (fullText.trim()) {
        const availableWidth =
          contentWidth - depth * indentPerLevel - bulletWidth;
        const lines = pdf.splitTextToSize(fullText.trim(), availableWidth);

        let segmentIndex = 0;
        let charOffset = 0;

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          let currentX = baseIndent + bulletWidth;

          if (lineIdx > 0) {
            checkNewPage(lineHeightMm);
          }

          let linePos = 0;
          while (linePos < line.length && segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            const segmentText = segment.text;
            const remainingInSegment = segmentText.length - charOffset;
            const remainingInLine = line.length - linePos;

            const charsToRender = Math.min(remainingInSegment, remainingInLine);
            const textToRender = segmentText.substring(
              charOffset,
              charOffset + charsToRender,
            );

            let fontStyle = "normal";
            const defaultBold = false;
            if ((segment.bold || defaultBold) && segment.italic)
              fontStyle = "bolditalic";
            else if (segment.bold || defaultBold) fontStyle = "bold";
            else if (segment.italic) fontStyle = "italic";

            pdf.setFont("helvetica", fontStyle);

            if (segment.link) {
              pdf.setTextColor(0, 102, 204);
            } else {
              pdf.setTextColor(0, 0, 0);
            }

            const textStartX = currentX;
            pdf.text(textToRender, currentX, currentY);
            const textWidth = pdf.getTextWidth(textToRender);

            if (segment.underline || segment.link) {
              if (segment.textDecorationColor) {
                const decRgb = parseColorToRgb(segment.textDecorationColor);
                if (decRgb) pdf.setDrawColor(decRgb.r, decRgb.g, decRgb.b);
                else pdf.setDrawColor(0, 0, 0);
              } else if (segment.link) {
                pdf.setDrawColor(0, 102, 204);
              } else {
                pdf.setDrawColor(0, 0, 0);
              }
              const lineThickness = segment.textDecorationColor ? 0.5 : 0.2;
              pdf.setLineWidth(lineThickness);
              pdf.line(
                currentX,
                currentY + 0.5,
                currentX + textWidth,
                currentY + 0.5,
              );
            }

            if (segment.link) {
              const linkHeight = 11 * 0.352778 * 1.2;
              pdf.link(
                textStartX,
                currentY - linkHeight + 1,
                textWidth,
                linkHeight,
                { url: segment.link },
              );
            }

            currentX += textWidth;
            linePos += charsToRender;
            charOffset += charsToRender;

            if (charOffset >= segmentText.length) {
              segmentIndex++;
              charOffset = 0;
            }
          }

          currentY += lineHeightMm;
        }
      } else {
        currentY += lineHeightMm;
      }

      pdf.setTextColor(0, 0, 0);

      const nestedLists = li.querySelectorAll(":scope > ul, :scope > ol");
      for (const nestedList of Array.from(nestedLists)) {
        const nestedType = nestedList.tagName.toLowerCase();
        await processListElement(nestedList, nestedType, depth + 1);
      }
    }
  };

  const processElement = async (el: Element) => {
    const tagName = el.tagName?.toLowerCase();

    if (tagName === "img") {
      await addImage(el as HTMLImageElement);
      return;
    }

    if (tagName === "h1") {
      currentY += 4;
      addFormattedText(el, 22, true);
      currentY += 4;
      return;
    }

    if (tagName === "h2") {
      currentY += 3;
      addFormattedText(el, 18, true);
      currentY += 3;
      return;
    }

    if (tagName === "h3") {
      currentY += 2;
      addFormattedText(el, 15, true);
      currentY += 2;
      return;
    }

    if (tagName === "h4" || tagName === "h5" || tagName === "h6") {
      currentY += 2;
      addFormattedText(el, 13, true);
      currentY += 1;
      return;
    }

    if (tagName === "p") {
      const imgs = el.querySelectorAll("img");
      for (const img of Array.from(imgs))
        await addImage(img as HTMLImageElement);
      addFormattedText(el, 11);
      currentY += 3;
      return;
    }

    if (tagName === "ul" || tagName === "ol") {
      await processListElement(el, tagName, 0);
      currentY += 3;
      return;
    }

    if (tagName === "blockquote") {
      currentY += 2;
      const quoteLineHeight = 15;
      pdf.setDrawColor(180);
      pdf.setLineWidth(0.8);
      pdf.line(
        margin + 2,
        currentY - 2,
        margin + 2,
        currentY + quoteLineHeight,
      );
      pdf.setTextColor(80, 80, 80);
      const segments = extractFormattedSegments(el);
      const fullText = segments.map((s) => s.text).join("");
      const lineHeightMm = 11 * 0.352778 * 1.4;
      const quoteIndent = 8;
      const lines = pdf.splitTextToSize(
        fullText.trim(),
        contentWidth - quoteIndent,
      );
      for (const line of lines) {
        checkNewPage(lineHeightMm);
        pdf.setFont("helvetica", "italic");
        pdf.text(line, margin + quoteIndent, currentY);
        currentY += lineHeightMm;
      }
      pdf.setTextColor(0, 0, 0);
      currentY += 3;
      return;
    }

    if (tagName === "table") {
      currentY += 0;

      const tableEl = el as HTMLElement;
      const rows = tableEl.querySelectorAll("tr");
      if (rows.length === 0) return;

      // Get actual table width from styles
      const computedTableStyle = window.getComputedStyle(tableEl);
      const tableWidthPx =
        tableEl.offsetWidth || parseFloat(computedTableStyle.width) || 0;

      // Calculate table width in mm (convert from px to mm)
      // Assuming standard 96 DPI: 1 inch = 96px = 25.4mm
      const pxToMm = 0.264583; // 25.4 / 96
      let tableWidthMm = tableWidthPx * pxToMm;

      // If table has explicit width style, use it; otherwise use contentWidth
      const tableHasExplicitWidth =
        tableEl.style.width && tableEl.style.width !== "100%";
      if (!tableHasExplicitWidth || tableWidthMm > contentWidth) {
        tableWidthMm = contentWidth;
      }

      // Get first row to calculate column widths
      const firstRow = rows[0];
      const firstRowCells = firstRow.querySelectorAll("th, td");
      const colCount = firstRowCells.length;

      // Calculate actual column widths from the first row
      const colWidths: number[] = [];
      let totalCalculatedWidth = 0;

      for (let i = 0; i < colCount; i++) {
        const cell = firstRowCells[i] as HTMLElement;
        const cellWidthPx = cell.offsetWidth || 0;
        const cellWidthMm = cellWidthPx * pxToMm;
        colWidths.push(cellWidthMm);
        totalCalculatedWidth += cellWidthMm;
      }

      // Normalize column widths to fit within tableWidthMm
      const scaleFactor = tableWidthMm / totalCalculatedWidth;
      const normalizedColWidths = colWidths.map((w) => w * scaleFactor);

      const cellPadding = 2;
      const fontSize = 10;
      const lineHeightMm = fontSize * 0.352778 * 1.3;

      for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const cells = row.querySelectorAll("th, td");
        const isHeader = row.querySelector("th") !== null;

        let maxCellHeight = lineHeightMm + cellPadding * 2;
        const cellContents: {
          text: string;
          lines: string[];
          isHeader: boolean;
          align: string;
        }[] = [];

        for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
          const cell = cells[cellIdx] as HTMLElement;
          const cellText = cell.textContent?.trim() || "";
          const cellColWidth = normalizedColWidths[cellIdx] - cellPadding * 2;

          // Get text alignment from style or attribute
          const computedStyle = window.getComputedStyle(cell);
          const textAlign =
            computedStyle.textAlign || cell.style.textAlign || "left";

          pdf.setFontSize(fontSize);
          pdf.setFont("helvetica", isHeader ? "bold" : "normal");
          const lines = pdf.splitTextToSize(cellText, cellColWidth);

          const cellHeight = lines.length * lineHeightMm + cellPadding * 2;
          maxCellHeight = Math.max(maxCellHeight, cellHeight);

          cellContents.push({
            text: cellText,
            lines: lines as string[],
            isHeader,
            align: textAlign,
          });
        }

        checkNewPage(maxCellHeight);

        let currentX = margin;
        for (let cellIdx = 0; cellIdx < colCount; cellIdx++) {
          const colWidth = normalizedColWidths[cellIdx];
          const content = cellContents[cellIdx] || {
            text: "",
            lines: [],
            isHeader: false,
            align: "left",
          };

          // Draw cell border
          pdf.setDrawColor(180);
          pdf.setLineWidth(0.3);
          pdf.rect(currentX, currentY, colWidth, maxCellHeight);

          // Fill header background
          if (content.isHeader) {
            pdf.setFillColor(240, 240, 240);
            pdf.rect(currentX, currentY, colWidth, maxCellHeight, "F");
            pdf.rect(currentX, currentY, colWidth, maxCellHeight, "S");
          }

          pdf.setFontSize(fontSize);
          pdf.setFont("helvetica", content.isHeader ? "bold" : "normal");
          pdf.setTextColor(0, 0, 0);

          let textY = currentY + cellPadding + lineHeightMm * 0.7;
          for (const line of content.lines) {
            let textX = currentX + cellPadding;

            // Apply alignment
            if (content.align === "center") {
              const textWidth = pdf.getTextWidth(line);
              textX = currentX + (colWidth - textWidth) / 2;
            } else if (content.align === "right") {
              const textWidth = pdf.getTextWidth(line);
              textX = currentX + colWidth - textWidth - cellPadding;
            } else if (
              content.align === "justify" &&
              content.lines.length > 1
            ) {
              textX = currentX + cellPadding;
            }

            pdf.text(line, textX, textY);
            textY += lineHeightMm;
          }

          currentX += colWidth;
        }

        currentY += maxCellHeight;
      }

      currentY += 5;
      return;
    }

    if (tagName === "hr") {
      currentY += 3;
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 5;
      return;
    }

    if (tagName === "figure") {
      const img = el.querySelector("img");
      const caption = el.querySelector("figcaption");
      const hasCaption = caption && caption.textContent?.trim();

      if (img) {
        const figureEl = el as HTMLElement;
        const figureWidth = figureEl.style.width;
        const imgEl = img as HTMLImageElement;
        const originalImgStyle = imgEl.getAttribute("style");

        let alignmentOverride: string | null = null;
        if (figureWidth) {
          const figureStyle = figureEl.getAttribute("style") || "";
          if (
            figureStyle.includes("margin-left: auto") &&
            figureStyle.includes("margin-right: auto")
          ) {
            alignmentOverride = "center";
          } else if (
            figureStyle.includes("margin-left: auto") &&
            figureStyle.includes("margin-right: 0")
          ) {
            alignmentOverride = "right";
          } else if (
            figureStyle.includes("margin-left: 0") &&
            figureStyle.includes("margin-right: auto")
          ) {
            alignmentOverride = "left";
          }

          if (!imgEl.style.width) {
            const existingStyle = originalImgStyle || "";
            imgEl.setAttribute(
              "style",
              `${existingStyle} width: ${figureWidth};`,
            );
          }
        }

        if (alignmentOverride) {
          imgEl.setAttribute("data-pdf-align", alignmentOverride);
        }

        await addImage(imgEl, hasCaption ? 4 : 8);

        imgEl.removeAttribute("data-pdf-align");
        if (originalImgStyle) {
          imgEl.setAttribute("style", originalImgStyle);
        } else {
          imgEl.removeAttribute("style");
        }
      }

      if (hasCaption) {
        const captionEl = caption as HTMLElement;
        const originalColor = captionEl.style.color;
        if (!originalColor) {
          captionEl.style.color = "rgb(107, 114, 128)";
        }

        addFormattedText(captionEl, 9, false, 1.2);
        if (!originalColor) {
          captionEl.style.color = "";
        }
        currentY += 4;
      }
      return;
    }

    if (tagName === "div" || !tagName) {
      const directImg = el.querySelector(":scope > img");
      if (directImg) await addImage(directImg as HTMLImageElement);
    }

    if (el.children && el.children.length > 0) {
      for (const child of Array.from(el.children)) {
        await processElement(child);
      }
    } else if (el.textContent?.trim()) {
      addText(el.textContent, 11);
    }
  };

  const allImages = element.querySelectorAll("img");
  await Promise.all(
    Array.from(allImages).map((img) => {
      const imgEl = img as HTMLImageElement;
      if (imgEl.complete && imgEl.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }),
  );

  for (const child of Array.from(element.children)) {
    await processElement(child);
  }

  // Fallback: if no element children were processed but the container has
  // text content (e.g. plain-text articles), render it as simple text.
  if (element.children.length === 0 && element.textContent?.trim()) {
    addText(element.textContent, 11);
  }

  pdf.save(`${sanitizeFilename(filename)}.pdf`);
};

const detectImageType = (src: string, mimeType = ""): string => {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg";
  const urlLower = src.toLowerCase();
  if (urlLower.includes(".png")) return "png";
  if (urlLower.includes(".gif")) return "gif";
  if (urlLower.includes(".jpg") || urlLower.includes(".jpeg")) return "jpg";
  if (urlLower.includes(".webp")) return "png";
  if (src.startsWith("data:image/png")) return "png";
  if (src.startsWith("data:image/jpeg") || src.startsWith("data:image/jpg"))
    return "jpg";
  return "png";
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const imageToCanvasArrayBuffer = (
  imgElement: HTMLImageElement,
): Promise<{
  data: ArrayBuffer;
  width: number;
  height: number;
  type: string;
} | null> => {
  return new Promise((resolve) => {
    try {
      const width = imgElement.naturalWidth || imgElement.width || 500;
      const height = imgElement.naturalHeight || imgElement.height || 300;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(imgElement, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          blob
            .arrayBuffer()
            .then((buffer) =>
              resolve({ data: buffer, width, height, type: "png" }),
            )
            .catch(() => resolve(null));
        } else {
          resolve(null);
        }
      }, "image/png");
    } catch {
      resolve(null);
    }
  });
};

interface ArrayBufferImageData {
  data: ArrayBuffer;
  width: number;
  height: number;
  type: string;
}

const fetchImageAsArrayBuffer = async (
  src: string,
  existingImg: HTMLImageElement | null = null,
): Promise<ArrayBufferImageData | null> => {
  try {
    if (src.startsWith("data:")) {
      const base64 = src.split(",")[1];
      const type = detectImageType(src);
      const dimensions = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new Image();
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: 500, height: 300 });
          img.src = src;
        },
      );
      return { data: base64ToArrayBuffer(base64), type, ...dimensions };
    }

    if (existingImg?.complete && existingImg.naturalWidth > 0) {
      const canvasResult = await imageToCanvasArrayBuffer(existingImg);
      if (canvasResult) return canvasResult;
    }

    try {
      const response = await fetch(src, { mode: "cors" });
      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const type = detectImageType(src, contentType);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 500, height: 300 });
            img.src = URL.createObjectURL(blob);
          },
        );
        return { data: arrayBuffer, type, ...dimensions };
      }
    } catch {
      /* CORS failed */
    }

    // Canvas fallback
    const canvasResult = await new Promise<ArrayBufferImageData | null>(
      (resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = async () => resolve(await imageToCanvasArrayBuffer(img));
        img.onerror = () => resolve(null);
        img.src = src;
      },
    );
    if (canvasResult) return canvasResult;

    return null;
  } catch {
    return null;
  }
};

export const downloadAsDocx = async ({
  element,
  filename,
  includeImages = true,
}: {
  element: HTMLElement;
  filename: string;
  includeImages?: boolean;
}): Promise<void> => {
  if (!element) throw new Error("Content element not found");

  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
  } = await import("docx");

  const allImages = element.querySelectorAll("img");
  const docChildren: any[] = [];
  const MAX_IMAGE_WIDTH = 550;
  const MAX_IMAGE_HEIGHT = 700;

  const imageDataMap = new Map<string, ArrayBufferImageData | null>();
  for (const img of Array.from(allImages)) {
    const imgEl = img as HTMLImageElement;
    const src = imgEl.src || imgEl.getAttribute("src");
    if (src && !imageDataMap.has(src)) {
      const imageData = await fetchImageAsArrayBuffer(src, imgEl);
      imageDataMap.set(src, imageData);
    }
  }

  const createImageParagraph = async (
    imgEl: HTMLImageElement,
  ): Promise<any | null> => {
    if (!includeImages) {
      return new Paragraph({
        children: [
          new TextRun({
            text: "[Image]",
            italics: true,
            color: "888888",
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      });
    }
    const src = imgEl.src || imgEl.getAttribute("src");
    if (!src) return null;
    let imageData = imageDataMap.get(src) ?? null;
    if (!imageData) imageData = await fetchImageAsArrayBuffer(src, imgEl);
    if (!imageData) {
      return new Paragraph({
        children: [
          new TextRun({
            text: "[Image failed to load]",
            italics: true,
            color: "888888",
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      });
    }
    let width = imageData.width;
    let height = imageData.height;
    if (width > MAX_IMAGE_WIDTH) {
      const s = MAX_IMAGE_WIDTH / width;
      width = MAX_IMAGE_WIDTH;
      height = Math.round(height * s);
    }
    if (height > MAX_IMAGE_HEIGHT) {
      const s = MAX_IMAGE_HEIGHT / height;
      height = MAX_IMAGE_HEIGHT;
      width = Math.round(width * s);
    }
    const imageBuffer =
      imageData.data instanceof Uint8Array
        ? imageData.data
        : new Uint8Array(imageData.data);
    try {
      const imageRun = new ImageRun({
        data: imageBuffer,
        transformation: {
          width: Math.round(width),
          height: Math.round(height),
        },
      } as any);
      return new Paragraph({ children: [imageRun], spacing: { after: 200 } });
    } catch {
      return new Paragraph({
        children: [
          new TextRun({
            text: "[Image error]",
            italics: true,
            color: "888888",
            size: 24,
          }),
        ],
        spacing: { after: 200 },
      });
    }
  };

  const getParagraphAlignment = (el: HTMLElement): any => {
    try {
      const computed = window.getComputedStyle(el);
      const textAlign =
        computed.textAlign || el.style.textAlign || el.getAttribute("align") || "";

      if (textAlign === "center") return AlignmentType.CENTER;
      if (textAlign === "right") return AlignmentType.RIGHT;
      if (textAlign === "justify") return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    } catch {
      return AlignmentType.LEFT;
    }
  };

  const createTextRunsFromElement = (
    el: HTMLElement,
    defaultSize: number,
    defaultBold = false,
  ): any[] => {
    const runs: any[] = [];

    type Formatting = {
      bold: boolean;
      italic: boolean;
      underline: boolean;
      strike: boolean;
      color?: string;
      backgroundColor?: string;
      underlineColor?: string;
    };

    /** Convert a CSS color to a hex string without '#' for docx shading.
     *  Handles rgba alpha by blending against white. */
    const cssColorToHex = (color: string): string | undefined => {
      if (!color) return undefined;
      const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
      if (hexMatch) {
        let hex = hexMatch[1];
        if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
        return hex.slice(0, 6).toUpperCase();
      }
      const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d]+)(?:\s*,\s*([\d.]+))?/);
      if (rgbMatch) {
        let r = parseInt(rgbMatch[1]);
        let g = parseInt(rgbMatch[2]);
        let b = parseInt(rgbMatch[3]);
        if (rgbMatch[4] !== undefined) {
          const a = parseFloat(rgbMatch[4]);
          if (a < 1) {
            r = Math.round(r * a + 255 * (1 - a));
            g = Math.round(g * a + 255 * (1 - a));
            b = Math.round(b * a + 255 * (1 - a));
          }
        }
        return [r, g, b]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();
      }
      return undefined;
    };

    const walk = (node: Node, formatting: Formatting) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text && text.trim()) {
          const bgHex = cssColorToHex(formatting.backgroundColor || "");
          runs.push(
            new TextRun({
              text,
              bold: formatting.bold || defaultBold,
              italics: formatting.italic,
              strike: formatting.strike,
              underline: formatting.underline
                ? {
                    type: "single" as any,
                    ...(formatting.underlineColor
                      ? { color: cssColorToHex(formatting.underlineColor) || "000000" }
                      : {}),
                  }
                : undefined,
              color: formatting.color,
              size: defaultSize,
              ...(bgHex
                ? {
                    shading: {
                      type: "clear" as any,
                      fill: bgHex,
                    },
                  }
                : {}),
            }),
          );
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tag = element.tagName.toLowerCase();
        const style = element.style;
        const next: Formatting = { ...formatting };

        if (tag === "strong" || tag === "b") next.bold = true;
        if (tag === "em" || tag === "i") next.italic = true;
        if (tag === "u") next.underline = true;
        if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;

        if (tag === "a") {
          next.underline = true;
          next.color = "3b82f6";
        }

        if (style.fontWeight === "bold" || parseInt(style.fontWeight || "0") >= 600)
          next.bold = true;
        if (style.fontStyle === "italic") next.italic = true;
        if (style.textDecoration.includes("underline")) next.underline = true;
        if (style.textDecoration.includes("line-through")) next.strike = true;
        if (style.backgroundColor) next.backgroundColor = style.backgroundColor;
        if (style.textDecorationColor) next.underlineColor = style.textDecorationColor;

        for (const child of Array.from(element.childNodes)) {
          walk(child, next);
        }
      }
    };

    walk(el, { bold: false, italic: false, underline: false, strike: false });

    if (runs.length === 0 && el.textContent?.trim()) {
      runs.push(
        new TextRun({
          text: el.textContent.trim(),
          bold: defaultBold,
          size: defaultSize,
        }),
      );
    }

    return runs;
  };

  const processNode = async (node: Node): Promise<any | null> => {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;
    const el = node as HTMLElement;
    const tagName = el.tagName?.toLowerCase();

    if (tagName === "img")
      return await createImageParagraph(el as HTMLImageElement);

    if (tagName === "figure") {
      const img = el.querySelector("img");
      if (img) {
        const results: any[] = [];
        const imgP = await createImageParagraph(img as HTMLImageElement);
        if (imgP) results.push(imgP);
        const figcaption = el.querySelector("figcaption");
        if (figcaption?.textContent?.trim()) {
          const textRuns: any[] = [];
          const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim();
              if (text) {
                textRuns.push(
                  new TextRun({
                    text,
                    italics: true,
                    size: 20,
                    color: "666666",
                  }),
                );
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.tagName === "A") {
                const href = element.getAttribute("href");
                const text = element.textContent?.trim();
                if (text && href) {
                  textRuns.push(
                    new TextRun({
                      text,
                      italics: true,
                      size: 20,
                      color: "3b82f6",
                      underline: {
                        type: "single" as any,
                      },
                    }),
                  );
                }
              } else {
                for (const child of Array.from(node.childNodes)) {
                  walk(child);
                }
              }
            }
          };
          walk(figcaption);

          if (textRuns.length > 0) {
            results.push(
              new Paragraph({
                children: textRuns,
                spacing: { after: 200 },
              }),
            );
          }
        }
        return results.length > 0 ? results : null;
      }

      const childResults: any[] = [];
      for (const child of Array.from(el.children)) {
        const result = await processNode(child);
        if (result) {
          if (Array.isArray(result)) {
            childResults.push(...result);
          } else {
            childResults.push(result);
          }
        }
      }
      return childResults.length > 0 ? childResults : null;
    }

    if (tagName === "div" || tagName === "span") {
      const text = el.textContent?.trim();
      if (
        text &&
        !el.querySelector("h1, h2, h3, h4, p, ul, ol, blockquote, table, figure")
      ) {
        return new Paragraph({
          children: [new TextRun({ text, size: 24 })],
          spacing: { after: 200 },
        });
      }

      const childResults: any[] = [];
      for (const child of Array.from(el.children)) {
        const result = await processNode(child);
        if (result) {
          if (Array.isArray(result)) {
            childResults.push(...result);
          } else {
            childResults.push(result);
          }
        }
      }
      return childResults.length > 0 ? childResults : null;
    }

    const text = el.textContent?.trim() || "";

    switch (tagName) {
      case "h1": {
        const children = createTextRunsFromElement(el, 48, true);
        return new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: getParagraphAlignment(el),
          children,
        });
      }
      case "h2": {
        const children = createTextRunsFromElement(el, 36, true);
        return new Paragraph({
          heading: HeadingLevel.HEADING_2,
          alignment: getParagraphAlignment(el),
          children,
        });
      }
      case "h3": {
        const children = createTextRunsFromElement(el, 28, true);
        return new Paragraph({
          heading: HeadingLevel.HEADING_3,
          alignment: getParagraphAlignment(el),
          children,
        });
      }
      case "h4": {
        const children = createTextRunsFromElement(el, 24, true);
        return new Paragraph({
          heading: HeadingLevel.HEADING_4,
          alignment: getParagraphAlignment(el),
          children,
        });
      }
      case "p": {
        const img = el.querySelector("img");
        if (img) return await createImageParagraph(img as HTMLImageElement);
        if (!text) return null;
        const children = createTextRunsFromElement(el, 24);
        return new Paragraph({
          children,
          spacing: { after: 200 },
          alignment: getParagraphAlignment(el),
        });
      }
      case "ul":
      case "ol":
        return Array.from(el.querySelectorAll(":scope > li")).map((li, idx) => {
          const prefix = tagName === "ol" ? `${idx + 1}. ` : "• ";
          return new Paragraph({
            children: [
              new TextRun({
                text: prefix + (li.textContent?.trim() || ""),
                size: 24,
              }),
            ],
            spacing: { after: 200 },
          });
        });
      case "blockquote": {
        const children = createTextRunsFromElement(el, 24);
        return new Paragraph({
          children,
          indent: { left: 720 },
          spacing: { after: 200 },
          alignment: getParagraphAlignment(el),
        });
      }
      case "table": {
        const rows = el.querySelectorAll("tr");
        if (rows.length === 0) return null;

        const tableRows: any[] = [];

        for (const row of Array.from(rows)) {
          const cells = row.querySelectorAll("th, td");
          const isHeader = row.querySelector("th") !== null;

          const tableCells: any[] = [];

          for (const cell of Array.from(cells)) {
            const cellEl = cell as HTMLElement;
            const cellText = cellEl.textContent?.trim() || "";

            // Get text alignment
            const computedStyle = window.getComputedStyle(cellEl);
            const textAlign =
              computedStyle.textAlign || cellEl.style.textAlign || "left";

            let alignment: any = AlignmentType.LEFT;
            if (textAlign === "center") alignment = AlignmentType.CENTER;
            else if (textAlign === "right") alignment = AlignmentType.RIGHT;
            else if (textAlign === "justify")
              alignment = AlignmentType.JUSTIFIED;

            tableCells.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cellText,
                        bold: isHeader,
                        size: 20,
                      }),
                    ],
                    alignment,
                  }),
                ],
                shading: isHeader
                  ? {
                      fill: "F0F0F0",
                    }
                  : undefined,
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                  },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
                  right: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "CCCCCC",
                  },
                },
              }),
            );
          }

          tableRows.push(new TableRow({ children: tableCells }));
        }

        return new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        });
      }
      default: {
        if (text) {
          const children = createTextRunsFromElement(el, 24);
          return new Paragraph({
            children,
            spacing: { after: 200 },
            alignment: getParagraphAlignment(el),
          });
        }
        return null;
      }
    }
  };

  for (const child of Array.from(element.children)) {
    const result = await processNode(child);
    if (result) {
      if (Array.isArray(result)) {
        docChildren.push(...result);
      } else {
        docChildren.push(result);
      }
    }
  }

  if (docChildren.length === 0) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: element.textContent || "Empty document",
            size: 24,
          }),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [{ properties: {}, children: docChildren }],
  });
  const blob = await Packer.toBlob(doc);

  // Use file-saver for reliable cross-browser downloads
  const { saveAs } = await import("file-saver");
  saveAs(blob, `${sanitizeFilename(filename)}.docx`);
};

export const downloadContent = async ({
  element,
  filename,
  format,
  includeImages = true,
}: {
  element: HTMLElement;
  filename: string;
  format: "pdf" | "docx";
  includeImages?: boolean;
}): Promise<void> => {
  if (format === "pdf") {
    return downloadAsPdf({ element, filename });
  } else {
    return downloadAsDocx({ element, filename, includeImages });
  }
};
