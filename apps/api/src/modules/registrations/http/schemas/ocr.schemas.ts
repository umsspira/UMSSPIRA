import { z } from 'zod';

export const ocrUuid = z.string().uuid();
export const ocrLease = z.object({ token: ocrUuid }).strict();
export const ocrReadingSchema = z
  .object({
    lines: z
      .array(
        z
          .object({
            text: z.string().max(1000),
            confidence: z.number().min(0).max(1),
            page: z.number().int().min(1).max(5),
            box: z
              .array(z.array(z.number().finite().min(0).max(10000)).length(2))
              .length(4)
              .optional(),
          })
          .strict(),
      )
      .max(1500),
    pagesRead: z.number().int().min(1).max(5),
    totalPages: z.number().int().min(1).max(10000),
    partial: z.boolean(),
    engine: z.literal('PaddleOCR.js@0.4.2/PP-OCRv6_small/es'),
    loadMs: z.number().min(0).max(600000),
    readMs: z.number().min(0).max(600000),
    memoryBytes: z.number().min(0).max(16000000000).optional(),
  })
  .strict()
  .refine(
    (r) =>
      r.pagesRead <= r.totalPages &&
      r.lines.every((l) => l.page <= r.pagesRead) &&
      (r.partial || r.pagesRead === r.totalPages),
    'Páginas inconsistentes',
  );
export const ocrCompletion = ocrLease.extend({ reading: ocrReadingSchema });
