/**
 * Read an image file into a data URL, downscaling large images so they don't
 * bloat the page content (images are embedded inline in the note HTML).
 */
export async function fileToScaledDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));

  // Already small and light: keep as-is (preserves transparency, GIFs, etc.).
  if (scale === 1 && file.size < 400_000) return original;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(type, quality);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
