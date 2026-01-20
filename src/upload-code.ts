import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs';

export const uploadCode = async (options: {
  region: string;
  s3Bucket: string;
  s3key: string;
  zipLocation: string;
}): Promise<void> => {
  const s3Client = new S3Client({ region: options.region, maxAttempts: 10 });
  const stream = fs.createReadStream(options.zipLocation);

  const params = {
    Bucket: options.s3Bucket,
    Key: options.s3key,
    Body: stream,
  };
  const uploadCommand = new PutObjectCommand(params);
  await s3Client.send(uploadCommand);
};
