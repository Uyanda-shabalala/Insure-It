const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1280;

export async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a supported image file.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("Image must be smaller than 8 MB.");

  const source = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process this image.");
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
