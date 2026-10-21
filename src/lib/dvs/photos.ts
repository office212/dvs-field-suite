/**
 * Photo pipeline: turn a picked image file into a compact JPEG data URL
 * (max edge 1400, quality 0.72) for storage and the certificate.
 *
 * Decode chain:
 *  - A file that positively identifies as HEIC/HEIF (type or extension) is
 *    converted first with heic2any (libheif, loaded lazily so its bulk
 *    stays out of the main bundle), because Chrome on Android cannot decode
 *    HEIC natively; if conversion fails, native decode still gets a chance
 *    (Safari handles HEIC on its own). This is the path that saves Samsung
 *    camera photos: before it existed, those picks failed without a trace.
 *  - Everything else is decoded natively, first via <img> + object URL,
 *    then via createImageBitmap with EXIF orientation applied. If the
 *    browser still refuses it (e.g. a HEIC the picker handed over with an
 *    empty type), the same heic2any conversion runs as a last resort.
 *
 * Only when every step fails does compressImage reject, and the caller
 * surfaces that to the user; a pick never fails silently.
 */

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

/** The file positively identifies as HEIC/HEIF, by type or by file name. */
function isHeicTyped(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return HEIC_TYPES.has(type) || name.endsWith(".heic") || name.endsWith(".heif");
}

/**
 * A file that probably needs conversion rather than native decode: it
 * identifies as HEIC/HEIF, or it carries no type at all (the Samsung
 * gallery picker often hands over HEIC files with an empty type).
 */
export function looksHeic(file: File): boolean {
  return isHeicTyped(file) || (file.type || "") === "";
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = url;
  });
}

async function decodeBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return createImageBitmap(source);
  }
}

function rasterize(source: CanvasImageSource, width: number, height: number, maxEdge: number, quality: number): string {
  if (!(width > 0) || !(height > 0)) throw new Error("image has no dimensions");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Decode a blob with the browser's own codecs and rasterize it to a JPEG data URL. */
async function decodeNative(source: Blob, maxEdge: number, quality: number): Promise<string> {
  // (a) <img> + object URL. Modern browsers apply EXIF orientation here.
  try {
    const url = URL.createObjectURL(source);
    try {
      const img = await loadImage(url);
      return rasterize(img, img.naturalWidth || img.width, img.naturalHeight || img.height, maxEdge, quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    // fall through to createImageBitmap
  }
  // (b) createImageBitmap, with EXIF orientation honoured explicitly.
  const bitmap = await decodeBitmap(source);
  try {
    return rasterize(bitmap, bitmap.width, bitmap.height, maxEdge, quality);
  } finally {
    bitmap.close();
  }
}

/** Convert a HEIC/HEIF file to a plain JPEG blob via libheif (lazy chunk). */
async function convertHeic(file: File): Promise<Blob> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(out) ? out[0] : out;
  if (!blob) throw new Error("HEIC conversion produced no image");
  return blob;
}

export async function compressImage(file: File, maxEdge = 1400, quality = 0.72): Promise<string> {
  if (isHeicTyped(file)) {
    // Confident HEIC/HEIF: Chrome (and Android generally) cannot decode it
    // natively, so convert first instead of burning two doomed decode
    // attempts. If conversion itself fails, still give the native decoder a
    // chance (Safari decodes HEIC on its own).
    try {
      const converted = await convertHeic(file);
      return await decodeNative(converted, maxEdge, quality);
    } catch {
      return decodeNative(file, maxEdge, quality);
    }
  }
  try {
    return await decodeNative(file, maxEdge, quality);
  } catch {
    // The browser cannot decode this file. If it only *looks* like it might
    // be HEIC (empty type from the picker, see looksHeic) or is HEIC in
    // disguise, libheif conversion is the last resort before giving up.
    const converted = await convertHeic(file);
    return decodeNative(converted, maxEdge, quality);
  }
}
