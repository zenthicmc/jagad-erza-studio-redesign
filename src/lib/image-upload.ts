import Cookies from "js-cookie";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per image
const MAX_IMAGE_COUNT = 10;

/**
 * Convert a base64 data URL to a File object.
 */
function dataUrlToFile(dataUrl: string, index: number): File {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch?.[1] || "image/png";

  const byteString = atob(base64Data);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }

  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
  return new File([byteArray], `image-${index}.${extension}`, {
    type: mimeType,
  });
}

/**
 * Return the byte size of a base64 data URL without decoding it fully.
 * Formula: base64 chars * 3/4 (minus padding).
 */
function base64DataUrlByteSize(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = (base64.match(/=+$/) || [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

const API_BASE_URL = "https://api.dev.erza.ai";

/**
 * Upload images directly to the backend API, bypassing the Next.js proxy
 * which has body size limits that truncate large multipart uploads.
 */
async function uploadImagesToS3(
  files: File[],
  articleId: string,
): Promise<string[]> {
  const token = Cookies.get("access_token");
  const formData = new FormData();
  for (const file of files) {
    formData.append("images", file);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/assists/${articleId}/images`,
    {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || `Image upload failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.result?.urls || data?.urls || [];
}

export function hasBase64Images(html: string): boolean {
  return /src\s*=\s*["']data:image\/[^"']+["']/i.test(html);
}

const IMAGE_PLACEHOLDER_PREFIX = "{{IMG_PLACEHOLDER_";
const IMAGE_PLACEHOLDER_SUFFIX = "}}";

/**
 * Strip base64 images from HTML, replacing them with indexed placeholders.
 * Returns the stripped HTML and the array of extracted data URLs.
 * Used to reduce payload size when sending content to the API.
 */
export function stripBase64Images(html: string): {
  strippedHtml: string;
  imageDataUrls: string[];
} {
  if (!hasBase64Images(html)) {
    return { strippedHtml: html, imageDataUrls: [] };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));
  const imageDataUrls: string[] = [];

  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (src.startsWith("data:image/")) {
      const index = imageDataUrls.length;
      imageDataUrls.push(src);
      img.setAttribute(
        "src",
        `${IMAGE_PLACEHOLDER_PREFIX}${index}${IMAGE_PLACEHOLDER_SUFFIX}`,
      );
    }
  }

  return {
    strippedHtml: imageDataUrls.length > 0 ? doc.body.innerHTML : html,
    imageDataUrls,
  };
}

/**
 * Convenience: upload all base64 images found in the HTML to S3, returning
 * the HTML with base64 sources replaced by remote URLs.
 * Used by handleSave and handleAddToCollection.
 */
export async function uploadAndReplaceImages(
  html: string,
  articleId: string,
): Promise<string> {
  return replaceBase64WithUrls(html, articleId);
}

/**
 * Upload all base64 images found in the HTML to S3 and return the HTML with
 * base64 src values replaced directly by the returned S3 URLs.
 *
 * Images that exceed MAX_IMAGE_SIZE_BYTES (2 MB) or that would push the total
 * past MAX_IMAGE_COUNT (10) are skipped entirely — their <img> elements are
 * removed from the output HTML so they are never sent to the API and never
 * stored as base64 in the database.
 *
 * Images that pass validation are uploaded in a single batch.  If the upload
 * fails the validated images are also removed (rather than stored as base64)
 * so the database is never left with unresolvable data URLs.
 */
export async function replaceBase64WithUrls(
  html: string,
  articleId: string,
): Promise<string> {
  if (!articleId || !hasBase64Images(html)) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));

  // Collect all base64 images and classify each as eligible or rejected
  const eligible: { el: Element; src: string }[] = [];
  const rejected: Element[] = [];

  for (const img of images) {
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("data:image/")) continue;

    const tooLarge = base64DataUrlByteSize(src) > MAX_IMAGE_SIZE_BYTES;
    const overLimit = eligible.length >= MAX_IMAGE_COUNT;

    if (tooLarge || overLimit) {
      rejected.push(img);
    } else {
      eligible.push({ el: img, src });
    }
  }

  // Remove rejected images from the DOM immediately
  for (const el of rejected) {
    el.parentNode?.removeChild(el);
  }

  // Nothing eligible to upload — return cleaned HTML (rejections removed)
  if (eligible.length === 0) return doc.body.innerHTML;

  try {
    const files = eligible.map(({ src }, index) => dataUrlToFile(src, index));
    const urls = await uploadImagesToS3(files, articleId);

    if (urls.length === eligible.length) {
      // Replace each eligible image src with its S3 URL
      for (let i = 0; i < urls.length; i++) {
        eligible[i].el.setAttribute("src", urls[i]);
      }
    } else {
      // Partial / unexpected response — remove all eligible images too
      for (const { el } of eligible) {
        el.parentNode?.removeChild(el);
      }
    }
  } catch (error) {
    console.error("Failed to upload images:", error);
    // Upload failed — remove eligible images rather than storing base64
    for (const { el } of eligible) {
      el.parentNode?.removeChild(el);
    }
  }

  return doc.body.innerHTML;
}
