import mammoth from "mammoth";

/**
 * Convert a PDF or DOCX/DOC file to HTML with embedded images.
 *
 * - DOCX/DOC: uses Mammoth to produce HTML with base64-encoded images.
 * - PDF: extracts text (grouped into paragraphs by position) and embedded
 *   images, interleaving them in the correct reading order.
 */
export async function parseFileToHtml(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "docx" || ext === "doc") {
    return convertDocxToHtml(file);
  }

  if (ext === "pdf") {
    return convertPdfToHtml(file);
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ---------------------------------------------------------------------------
// DOCX / DOC
// ---------------------------------------------------------------------------

async function convertDocxToHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const mammothAny = mammoth as any;

  const result = await mammothAny.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammothAny.images.imgElement(
        (image: {
          contentType: string;
          read: (type: string) => Promise<string>;
        }) =>
          image.read("base64").then((imageBuffer: string) => ({
            src: `data:${image.contentType};base64,${imageBuffer}`,
          })),
      ),
    },
  );

  return result.value;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

type ContentItem =
  | { type: "text"; text: string; y: number }
  | { type: "image"; dataUrl: string; y: number };

/** Threshold (pt) to decide two text items belong to the same line. */
const LINE_THRESHOLD = 3;
/** Gap (pt) between lines to separate paragraphs. */
const PARA_GAP = 12;
/** Images smaller than this (px) are skipped (bullets, icons…). */
const MIN_IMAGE_SIZE = 50;
/** Timeout (ms) waiting for a single PDF image object to load. */
const IMAGE_LOAD_TIMEOUT = 3000;

async function convertPdfToHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let html = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const pageHeight = page.getViewport({ scale: 1 }).height;

    const items: ContentItem[] = [];

    // Text ---------------------------------------------------------------
    extractTextItems(await page.getTextContent(), pageHeight, items);

    // Images -------------------------------------------------------------
    await extractImageItems(page, pdfjsLib, pageHeight, items);

    // Sort by Y (top → bottom) and emit HTML -----------------------------
    items.sort((a, b) => a.y - b.y);
    for (const item of items) {
      if (item.type === "text") {
        html += `<p>${item.text}</p>`;
      } else {
        html += `<img src="${item.dataUrl}" alt="Image from page ${i}" style="max-width:100%;height:auto;" />`;
      }
    }
  }

  return html;
}

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

function extractTextItems(
  textContent: { items: any[] },
  pageHeight: number,
  out: ContentItem[],
) {
  const textItems = textContent.items as Array<{
    str?: string;
    transform?: number[];
  }>;

  // Group text items into lines by Y position
  const lineMap = new Map<number, { y: number; texts: string[] }>();

  for (const item of textItems) {
    if (!item.str?.trim() || !item.transform) continue;
    const yTopDown = pageHeight - item.transform[5];

    let foundKey: number | null = null;
    for (const [key] of lineMap) {
      if (Math.abs(key - yTopDown) < LINE_THRESHOLD) {
        foundKey = key;
        break;
      }
    }

    if (foundKey !== null) {
      lineMap.get(foundKey)!.texts.push(item.str);
    } else {
      lineMap.set(yTopDown, { y: yTopDown, texts: [item.str] });
    }
  }

  // Group lines into paragraphs
  const sortedLines = Array.from(lineMap.values()).sort((a, b) => a.y - b.y);
  let para: string[] = [];
  let paraY = 0;

  for (let li = 0; li < sortedLines.length; li++) {
    const line = sortedLines[li];
    const lineText = line.texts.join(" ").trim();
    if (!lineText) continue;

    if (para.length === 0) {
      para.push(lineText);
      paraY = line.y;
    } else {
      const prevLine = sortedLines[li - 1];
      const gap = prevLine ? line.y - prevLine.y : 0;

      if (gap > PARA_GAP) {
        out.push({ type: "text", text: para.join(" "), y: paraY });
        para = [lineText];
        paraY = line.y;
      } else {
        para.push(lineText);
      }
    }
  }

  if (para.length > 0) {
    out.push({ type: "text", text: para.join(" "), y: paraY });
  }
}

// ---------------------------------------------------------------------------
// Image extraction helpers
// ---------------------------------------------------------------------------

async function extractImageItems(
  page: any,
  pdfjsLib: typeof import("pdfjs-dist"),
  pageHeight: number,
  out: ContentItem[],
) {
  try {
    const ops = await page.getOperatorList();
    const imageEntries: { name: string; y: number }[] = [];

    let lastTransformY = 0;
    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] === pdfjsLib.OPS.transform) {
        const args = ops.argsArray[j];
        if (args && args.length >= 6) {
          lastTransformY = pageHeight - args[5];
        }
      }
      if (
        ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject ||
        ops.fnArray[j] === pdfjsLib.OPS.paintImageXObjectRepeat
      ) {
        const imgName = ops.argsArray[j][0] as string;
        if (!imageEntries.find((e) => e.name === imgName)) {
          imageEntries.push({ name: imgName, y: lastTransformY });
        }
      }
    }

    if (imageEntries.length === 0) return;

    // Render page at tiny scale to trigger lazy image loading
    const viewport = page.getViewport({ scale: 0.1 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page
        .render({ canvasContext: ctx, viewport, canvas } as any)
        .promise;
    }

    for (const entry of imageEntries) {
      try {
        const dataUrl = await extractSingleImage(page, entry.name);
        if (dataUrl) {
          out.push({ type: "image", dataUrl, y: entry.y });
        }
      } catch {
        // Skip images that fail
      }
    }
  } catch {
    // If operator list fails, continue with text only
  }
}

async function extractSingleImage(
  page: any,
  imgName: string,
): Promise<string | null> {
  const imgObj: any = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("timeout")),
      IMAGE_LOAD_TIMEOUT,
    );
    page.objs.get(imgName, (obj: any) => {
      clearTimeout(timeout);
      if (obj) resolve(obj);
      else reject(new Error("not found"));
    });
  });

  const w = imgObj.width || imgObj.naturalWidth || 0;
  const h = imgObj.height || imgObj.naturalHeight || 0;
  if (w < MIN_IMAGE_SIZE || h < MIN_IMAGE_SIZE) return null;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (imgObj.bitmap && imgObj.bitmap instanceof ImageBitmap) {
    ctx.drawImage(imgObj.bitmap, 0, 0);
  } else if (imgObj instanceof ImageBitmap) {
    ctx.drawImage(imgObj, 0, 0);
  } else if (imgObj.data) {
    const imageData = ctx.createImageData(w, h);
    const src = imgObj.data;
    if (imgObj.kind === 1) {
      // Grayscale
      for (let p = 0; p < src.length; p++) {
        imageData.data[p * 4] = src[p];
        imageData.data[p * 4 + 1] = src[p];
        imageData.data[p * 4 + 2] = src[p];
        imageData.data[p * 4 + 3] = 255;
      }
    } else if (imgObj.kind === 2) {
      // RGB
      let si = 0;
      for (let p = 0; p < w * h; p++) {
        imageData.data[p * 4] = src[si++];
        imageData.data[p * 4 + 1] = src[si++];
        imageData.data[p * 4 + 2] = src[si++];
        imageData.data[p * 4 + 3] = 255;
      }
    } else {
      // RGBA
      imageData.data.set(src);
    }
    ctx.putImageData(imageData, 0, 0);
  } else {
    return null;
  }

  return canvas.toDataURL("image/png");
}
