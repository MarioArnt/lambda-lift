import { updateLayer } from './update-layer';
import { LambdaClient, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';

jest.mock('@aws-sdk/client-lambda');

describe('updateLayer', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should update function with new layer', async () => {
    mockSend.mockResolvedValue({
      FunctionName: 'my-function',
    });

    await updateLayer({
      functionName: 'my-function',
      region: 'us-east-1',
      layerArn: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
    });

    expect(UpdateFunctionConfigurationCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Layers: ['arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1'],
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it('should use specified region', async () => {
    mockSend.mockResolvedValue({});

    await updateLayer({
      functionName: 'my-function',
      region: 'eu-west-1',
      layerArn: 'arn:aws:lambda:eu-west-1:123456789012:layer:my-layer:1',
    });

    expect(LambdaClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should handle update errors', async () => {
    mockSend.mockRejectedValue(new Error('Invalid layer ARN'));

    await expect(
      updateLayer({
        functionName: 'my-function',
        region: 'us-east-1',
        layerArn: 'invalid-arn',
      })
    ).rejects.toThrow('Invalid layer ARN');
  });
});
