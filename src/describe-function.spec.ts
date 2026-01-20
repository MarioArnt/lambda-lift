import { describeFunction } from './describe-function';
import { LambdaClient, GetFunctionCommand } from '@aws-sdk/client-lambda';

jest.mock('@aws-sdk/client-lambda');

describe('describeFunction', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should call GetFunctionCommand with function name', async () => {
    const mockResponse = {
      Configuration: {
        FunctionName: 'my-function',
        Runtime: 'nodejs20.x',
        Architectures: ['arm64'],
      },
    };

    mockSend.mockResolvedValue(mockResponse);

    const result = await describeFunction('my-function');

    expect(GetFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
    });
    expect(result).toEqual(mockResponse);
  });

  it('should use specified region', async () => {
    const mockResponse = {
      Configuration: {
        FunctionName: 'my-function',
      },
    };

    mockSend.mockResolvedValue(mockResponse);

    await describeFunction('my-function', 'eu-west-1');

    expect(LambdaClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should use default region when not specified', async () => {
    const mockResponse = {
      Configuration: {
        FunctionName: 'my-function',
      },
    };

    mockSend.mockResolvedValue(mockResponse);

    await describeFunction('my-function');

    expect(LambdaClient).toHaveBeenCalledWith({
      region: undefined,
      maxAttempts: 10,
    });
  });

  it('should handle errors from AWS SDK', async () => {
    const error = new Error('Function not found');
    mockSend.mockRejectedValue(error);

    await expect(describeFunction('non-existent-function')).rejects.toThrow('Function not found');
  });

  it('should return complete function configuration', async () => {
    const mockResponse = {
      Configuration: {
        FunctionName: 'my-function',
        FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:my-function',
        Runtime: 'nodejs20.x',
        Role: 'arn:aws:iam::123456789012:role/lambda-role',
        Handler: 'index.handler',
        CodeSize: 1024,
        Description: 'My Lambda function',
        Timeout: 30,
        MemorySize: 128,
        LastModified: '2024-01-01T00:00:00.000+0000',
        Architectures: ['x86_64'],
      },
      Code: {
        RepositoryType: 'S3',
        Location: 'https://s3.amazonaws.com/...',
      },
    };

    mockSend.mockResolvedValue(mockResponse);

    const result = await describeFunction('my-function', 'us-east-1');

    expect(result).toEqual(mockResponse);
    expect(result.Configuration?.Runtime).toBe('nodejs20.x');
    expect(result.Configuration?.Architectures).toEqual(['x86_64']);
  });
});
