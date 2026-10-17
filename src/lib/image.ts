/**
 * Reduz a foto no próprio celular antes de enviar (fotos de câmera têm 3–8 MB).
 * 1024 px no maior lado é suficiente para a IA reconhecer o prato e deixa o envio rápido no 4G.
 */
export async function resizeImageToJpegBase64(file: File, maxSide = 1024, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}
