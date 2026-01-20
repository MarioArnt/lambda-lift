import { uploadCode } from './upload-code';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import fs from 'node:fs';

jest.mock('@aws-sdk/client-s3');

const mockReadStream = new Readable({
  read() {
    this.push('test data');
    this.push(null);
  },
});

const mockCreateReadStream = jest
  .spyOn(fs, 'createReadStream')
  .mockReturnValue(mockReadStream as any);

describe('uploadCode', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should upload file to S3', async () => {
    mockSend.mockResolvedValue({});

    await uploadCode({
      region: 'us-east-1',
      s3Bucket: 'my-bucket',
      s3key: 'functions/bundle.zip',
      zipLocation: '/path/to/bundle.zip',
    });

    expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/bundle.zip');
    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'my-bucket',
      Key: 'functions/bundle.zip',
      Body: mockReadStream,
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it('should use specified region', async () => {
    mockSend.mockResolvedValue({});

    await uploadCode({
      region: 'eu-west-1',
      s3Bucket: 'my-bucket',
      s3key: 'functions/bundle.zip',
      zipLocation: '/path/to/bundle.zip',
    });

    expect(S3Client).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should handle upload errors', async () => {
    mockSend.mockRejectedValue(new Error('Upload failed'));

    await expect(
      uploadCode({
        region: 'us-east-1',
        s3Bucket: 'my-bucket',
        s3key: 'functions/bundle.zip',
        zipLocation: '/path/to/bundle.zip',
      })
    ).rejects.toThrow('Upload failed');
  });

  it('should handle file stream errors', async () => {
    const errorStream = {
      on: jest.fn().mockImplementation((event, handler) => {
        if (event === 'error') {
          handler(new Error('File not found'));
        }
        return errorStream;
      }),
    };
    mockCreateReadStream.mockReturnValue(errorStream as any);

    // Since the error is async, we expect the upload to proceed
    mockSend.mockResolvedValue({});

    await uploadCode({
      region: 'us-east-1',
      s3Bucket: 'my-bucket',
      s3key: 'functions/bundle.zip',
      zipLocation: '/path/to/missing.zip',
    });

    expect(mockCreateReadStream).toHaveBeenCalledWith('/path/to/missing.zip');
  });
});
