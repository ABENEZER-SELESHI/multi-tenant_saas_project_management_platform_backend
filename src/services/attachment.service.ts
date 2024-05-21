import { AttachmentEntityType } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { activityService } from './activity.service';
import { storageService } from './storage.service';
import { ConfirmUploadInput, PresignUploadInput } from '../validators/attachment.validator';

export class AttachmentService {
  private async assertEntityExists(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ): Promise<void> {
    switch (entityType) {
      case AttachmentEntityType.TASK: {
        const task = await prisma.task.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        if (!task) throw new AppError('Task not found', 404);
        break;
      }
      case AttachmentEntityType.PROJECT: {
        const project = await prisma.project.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        if (!project) throw new AppError('Project not found', 404);
        break;
      }
      case AttachmentEntityType.COMMENT: {
        const comment = await prisma.comment.findFirst({
          where: { id: entityId, organizationId, deletedAt: null },
        });
        if (!comment) throw new AppError('Comment not found', 404);
        break;
      }
    }
  }

  async presignUpload(organizationId: string, _userId: string, input: PresignUploadInput) {
    await this.assertEntityExists(organizationId, input.entityType, input.entityId);

    const fileKey = storageService.generateFileKey(organizationId, input.fileName);
    const uploadUrl = await storageService.getPresignedUploadUrl(fileKey, input.mimeType);

    return { uploadUrl, fileKey, expiresIn: 3600 };
  }

  async confirmUpload(organizationId: string, userId: string, input: ConfirmUploadInput) {
    await this.assertEntityExists(organizationId, input.entityType, input.entityId);

    if (!input.fileKey.startsWith(`orgs/${organizationId}/`)) {
      throw new AppError('Invalid file key for this organization', 400);
    }

    const attachment = await prisma.attachment.create({
      data: {
        organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName,
        fileKey: input.fileKey,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'attachment.uploaded',
      entityType: 'attachment',
      entityId: attachment.id,
      metadata: {
        entityType: input.entityType,
        entityId: input.entityId,
        fileName: input.fileName,
      },
    });

    return attachment;
  }

  async getById(organizationId: string, attachmentId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, organizationId, deletedAt: null },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!attachment) {
      throw new AppError('Attachment not found', 404);
    }
    return attachment;
  }

  async getSignedUrl(organizationId: string, attachmentId: string) {
    const attachment = await this.getById(organizationId, attachmentId);
    const downloadUrl = await storageService.getPresignedDownloadUrl(attachment.fileKey);
    return { downloadUrl, expiresIn: 3600, attachment };
  }

  async listByEntity(
    organizationId: string,
    entityType: AttachmentEntityType,
    entityId: string,
  ) {
    await this.assertEntityExists(organizationId, entityType, entityId);

    return prisma.attachment.findMany({
      where: { organizationId, entityType, entityId, deletedAt: null },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(organizationId: string, attachmentId: string, userId: string) {
    const attachment = await this.getById(organizationId, attachmentId);

    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });

    try {
      await storageService.deleteObject(attachment.fileKey);
    } catch {
      // Storage deletion is best-effort; DB record is soft-deleted
    }

    await activityService.log({
      organizationId,
      actorId: userId,
      action: 'attachment.deleted',
      entityType: 'attachment',
      entityId: attachmentId,
    });
  }
}

export const attachmentService = new AttachmentService();
