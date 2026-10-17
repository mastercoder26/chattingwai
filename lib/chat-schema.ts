import { z } from 'zod';
import { imageDataSchema } from './attachments';

const textPart = z.object({ type: z.literal('text'), text: z.string().min(1).max(100_000) });
const imagePart = z.object({
  type: z.literal('image_url'),
  image_url: z.object({ url: imageDataSchema }),
});
const userContent = z.union([
  z.string().min(1).max(100_000),
  z
    .array(z.discriminatedUnion('type', [textPart, imagePart]))
    .min(1)
    .max(5)
    .refine(
      (parts) => parts.filter((p) => p.type === 'image_url').length <= 4,
      'Attach up to four images per message.',
    ),
]);
export const chatSchema = z
  .object({
    model: z.string().min(1).max(180),
    messages: z
      .array(
        z.discriminatedUnion('role', [
          z.object({ role: z.literal('user'), content: userContent }),
          z.object({ role: z.literal('assistant'), content: z.string().min(1).max(100_000) }),
        ]),
      )
      .min(1)
      .max(150),
    instructions: z.string().max(6000).default(''),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(256).max(16384).default(4096),
  })
  .superRefine((data, ctx) => {
    let text = 0,
      images = 0;
    for (const message of data.messages) {
      if (typeof message.content === 'string') text += message.content.length;
      else
        for (const part of message.content) {
          if (part.type === 'text') text += part.text.length;
          else images += part.image_url.url.length;
        }
    }
    if (text > 300_000)
      ctx.addIssue({
        code: 'custom',
        message: 'This conversation is too long. Start a new chat to continue.',
      });
    if (images > 2_800_000)
      ctx.addIssue({
        code: 'custom',
        message: 'This conversation has too much image data. Start a new chat to add more images.',
      });
  });
