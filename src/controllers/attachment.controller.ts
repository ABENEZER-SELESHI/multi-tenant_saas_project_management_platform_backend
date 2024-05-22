import { Request, Response, NextFunction } from 'express';
import { AttachmentEntityType } from '@prisma/client';
import { sendSuccess } from '../utils/apiResponse';
import { attachmentService } from '../services/attachment.service';
import { ConfirmUploadInput, PresignUploadInput } from '../validators/attachment.validator';

export class AttachmentController {
  presign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await attachmentService.presignUpload(
        req.organizationId!,
        req.userId!,
        req.body as PresignUploadInput,
      );
      sendSuccess(res, result, 'Upload URL generated');
    } catch (err) {
      next(err);
    }
  };

  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attachment = await attachmentService.confirmUpload(
        req.organizationId!,
        req.userId!,
        req.body as ConfirmUploadInput,
      );
      sendSuccess(res, attachment, 'Upload confirmed', 201);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attachment = await attachmentService.getById(
        req.organizationId!,
        req.params.attachmentId,
      );
      sendSuccess(res, attachment);
    } catch (err) {
      next(err);
    }
  };

  getSignedUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await attachmentService.getSignedUrl(
        req.organizationId!,
        req.params.attachmentId,
      );
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  };

  listByEntity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attachments = await attachmentService.listByEntity(
        req.organizationId!,
        req.params.entityType as AttachmentEntityType,
        req.params.entityId,
      );
      sendSuccess(res, attachments);
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await attachmentService.delete(
        req.organizationId!,
        req.params.attachmentId,
        req.userId!,
      );
      sendSuccess(res, null, 'Attachment deleted');
    } catch (err) {
      next(err);
    }
  };
}

export const attachmentController = new AttachmentController();
