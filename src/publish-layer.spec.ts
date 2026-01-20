import { publishLayer } from './publish-layer';
import { LambdaClient, PublishLayerVersionCommand } from '@aws-sdk/client-lambda';
import { promises as fs } from 'fs';

jest.mock('@aws-sdk/client-lambda');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('publishLayer', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should publish layer with default architecture and runtime', async () => {
    const mockBuffer = Buffer.from('layer content');
    (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
    mockSend.mockResolvedValue({
      LayerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
    });

    const result = await publishLayer('us-east-1', '/path/to/layer.zip', 'my-function-layer');

    expect(fs.readFile).toHaveBeenCalledWith('/path/to/layer.zip');
    expect(PublishLayerVersionCommand).toHaveBeenCalledWith({
      Content: { ZipFile: mockBuffer },
      LayerName: 'my-function-layer',
      CompatibleArchitectures: ['arm64'],
      CompatibleRuntimes: ['nodejs20.x'],
      Description: 'Lambda layer for service my-function-layer',
    });
    expect(result).toBe('arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1');
  });

  it('should use custom architecture', async () => {
    const mockBuffer = Buffer.from('layer content');
    (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
    mockSend.mockResolvedValue({
      LayerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
    });

    await publishLayer('us-east-1', '/path/to/layer.zip', 'my-layer', 'x86_64' as any);

    expect(PublishLayerVersionCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        CompatibleArchitectures: ['x86_64'],
      })
    );
  });

  it('should use custom runtime', async () => {
    const mockBuffer = Buffer.from('layer content');
    (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
    mockSend.mockResolvedValue({
      LayerVersionArn: 'arn:aws:lambda:us-east-1:123456789012:layer:my-layer:1',
    });

    await publishLayer('us-east-1', '/path/to/layer.zip', 'my-layer', 'arm64', 'python3.11' as any);

    expect(PublishLayerVersionCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        CompatibleRuntimes: ['python3.11'],
      })
    );
  });

  it('should handle file read errors', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    await expect(publishLayer('us-east-1', '/path/to/missing.zip', 'my-layer')).rejects.toThrow(
      'File not found'
    );
  });

  it('should handle publish errors', async () => {
    const mockBuffer = Buffer.from('layer content');
    (fs.readFile as jest.Mock).mockResolvedValue(mockBuffer);
    mockSend.mockRejectedValue(new Error('Invalid layer'));

    await expect(publishLayer('us-east-1', '/path/to/layer.zip', 'my-layer')).rejects.toThrow(
      'Invalid layer'
    );
  });
});
