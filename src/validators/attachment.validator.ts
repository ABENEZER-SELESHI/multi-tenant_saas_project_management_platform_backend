import { z } from 'zod';
import { AttachmentEntityType } from '@prisma/client';
import { uuidSchema } from './common.validator';

export const presignUploadSchema = z.object({
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: uuidSchema,
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().min(1).max(50 * 1024 * 1024),
});

export const confirmUploadSchema = z.object({
  fileKey: z.string().min(1).max(500),
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: uuidSchema,
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.coerce.number().int().min(1),
});

export const attachmentIdParamSchema = z.object({
  attachmentId: uuidSchema,
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
