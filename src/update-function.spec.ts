import { updateCode } from './update-function';
import { LambdaClient, UpdateFunctionCodeCommand } from '@aws-sdk/client-lambda';

jest.mock('@aws-sdk/client-lambda');

describe('updateCode', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should update function code from S3', async () => {
    mockSend.mockResolvedValue({
      FunctionName: 'my-function',
    });

    await updateCode({
      functionName: 'my-function',
      region: 'us-east-1',
      s3Bucket: 'my-bucket',
      s3key: 'functions/bundle.zip',
    });

    expect(UpdateFunctionCodeCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      S3Bucket: 'my-bucket',
      S3Key: 'functions/bundle.zip',
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it('should use specified region', async () => {
    mockSend.mockResolvedValue({});

    await updateCode({
      functionName: 'my-function',
      region: 'eu-west-1',
      s3Bucket: 'my-bucket',
      s3key: 'functions/bundle.zip',
    });

    expect(LambdaClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should handle update errors', async () => {
    mockSend.mockRejectedValue(new Error('Function not found'));

    await expect(
      updateCode({
        functionName: 'non-existent',
        region: 'us-east-1',
        s3Bucket: 'my-bucket',
        s3key: 'functions/bundle.zip',
      })
    ).rejects.toThrow('Function not found');
  });
});
