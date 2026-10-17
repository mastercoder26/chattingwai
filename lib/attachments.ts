import { z } from 'zod';
import type { Attachment, Message } from './types';

export const MAX_ATTACHMENTS = 4;
export const MAX_IMAGE_DATA = 700_000;
export const MAX_IMAGE_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 4_000_000;
export const IMAGE_DATA_PATTERN =
  /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
export const imageDataSchema = z.string().min(40).max(MAX_IMAGE_DATA).regex(IMAGE_DATA_PATTERN);
export const attachmentSchema = z.union([
  z.object({ type: z.literal('image'), name: z.string().max(250), content: imageDataSchema }),
  z.object({
    type: z.literal('text').optional(),
    name: z.string().max(250),
    content: z.string().max(80_000),
  }),
]);
export type ContentPart =
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export function textContent(message: Message): string {
  return (
    message.content +
    (message.attachments
      ?.filter((a) => a.type !== 'image')
      .map((a) => `\n\nAttached file: ${a.name}\n\n${a.content}`)
      .join('') || '')
  );
}

export function modelContent(message: Message): string | ContentPart[] {
  const images = message.attachments?.filter((a) => a.type === 'image') || [];
  if (!images.length || message.role !== 'user') return textContent(message);
  return [
    { type: 'text', text: textContent(message) || 'Describe these images.' },
    ...images.map((a) => ({ type: 'image_url' as const, image_url: { url: a.content } })),
  ];
}

export function exportContent(message: Message): string {
  return (
    textContent(message) +
    (message.attachments
      ?.filter((a) => a.type === 'image')
      .map((a) => `\n\n![${a.name.replace(/[\[\]\\]/g, '')}](${a.content})`)
      .join('') || '')
  );
}

function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

/** Decode and resize locally; no image leaves the browser until Send. */
export async function prepareImage(file: File): Promise<Attachment> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('Use a PNG, JPEG, or WebP image.');
  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error('Images must be under 10 MB each.');
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (
      !img.naturalWidth ||
      !img.naturalHeight ||
      img.naturalWidth * img.naturalHeight > 40_000_000
    )
      throw new Error('This image is too large to process. Choose an image under 40 megapixels.');
    if (file.size < 450_000 && Math.max(img.naturalWidth, img.naturalHeight) <= 1600)
      return { type: 'image', name: file.name.slice(0, 250), content: await readDataUrl(file) };
    const canvas = document.createElement('canvas');
    let scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    for (let attempt = 0; attempt < 4; attempt++) {
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is unavailable in this browser.');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const content = canvas.toDataURL('image/webp', 0.86 - attempt * 0.1);
      if (content.length <= MAX_IMAGE_DATA)
        return { type: 'image', name: file.name.slice(0, 250), content };
      scale *= 0.75;
    }
    throw new Error('This image is too detailed. Try a smaller image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
