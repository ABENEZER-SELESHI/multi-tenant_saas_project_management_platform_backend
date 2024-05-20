import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: !!env.S3_ENDPOINT,
  credentials:
    env.S3_ACCESS_KEY && env.S3_SECRET_KEY
      ? { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY }
      : undefined,
});

export class StorageService {
  private bucket = env.S3_BUCKET;

  generateFileKey(organizationId: string, fileName: string): string {
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
    return `orgs/${organizationId}/${uuidv4()}${ext}`;
  }

  async getPresignedUploadUrl(
    fileKey: string,
    mimeType: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: mimeType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(fileKey: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  async deleteObject(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    await s3Client.send(command);
  }
}

export const storageService = new StorageService();
