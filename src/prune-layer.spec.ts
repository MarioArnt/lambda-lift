import { pruneLayers } from './prune-layer';
import {
  LambdaClient,
  ListLayerVersionsCommand,
  DeleteLayerVersionCommand,
} from '@aws-sdk/client-lambda';

jest.mock('@aws-sdk/client-lambda');

describe('pruneLayers', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should delete old layer versions', async () => {
    mockSend
      .mockResolvedValueOnce({
        LayerVersions: [
          { Version: 5 },
          { Version: 4 },
          { Version: 3 },
          { Version: 2 },
          { Version: 1 },
        ],
      })
      .mockResolvedValue({});

    await pruneLayers({
      region: 'us-east-1',
      functionName: 'my-function-layer',
      prune: 3,
    });

    expect(ListLayerVersionsCommand).toHaveBeenCalledWith({
      LayerName: 'my-function-layer',
    });

    // Should delete versions 2 and 1 (keeping the 3 most recent: 5, 4, 3)
    expect(DeleteLayerVersionCommand).toHaveBeenCalledTimes(2);
    expect(DeleteLayerVersionCommand).toHaveBeenCalledWith({
      LayerName: 'my-function-layer',
      VersionNumber: 2,
    });
    expect(DeleteLayerVersionCommand).toHaveBeenCalledWith({
      LayerName: 'my-function-layer',
      VersionNumber: 1,
    });
  });

  it('should not delete anything if versions count is below prune threshold', async () => {
    mockSend.mockResolvedValueOnce({
      LayerVersions: [{ Version: 2 }, { Version: 1 }],
    });

    await pruneLayers({
      region: 'us-east-1',
      functionName: 'my-function-layer',
      prune: 3,
    });

    expect(DeleteLayerVersionCommand).not.toHaveBeenCalled();
  });

  it('should handle empty layer versions list', async () => {
    mockSend.mockResolvedValueOnce({
      LayerVersions: [],
    });

    await pruneLayers({
      region: 'us-east-1',
      functionName: 'my-function-layer',
      prune: 3,
    });

    expect(DeleteLayerVersionCommand).not.toHaveBeenCalled();
  });

  it('should use specified region', async () => {
    mockSend.mockResolvedValueOnce({
      LayerVersions: [],
    });

    await pruneLayers({
      region: 'eu-west-1',
      functionName: 'my-function-layer',
      prune: 3,
    });

    expect(LambdaClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should handle deletion errors gracefully', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    mockSend
      .mockResolvedValueOnce({
        LayerVersions: [{ Version: 5 }, { Version: 4 }, { Version: 3 }, { Version: 2 }],
      })
      .mockRejectedValue(new Error('Deletion failed'));

    await pruneLayers({
      region: 'us-east-1',
      functionName: 'my-function-layer',
      prune: 3,
    });

    expect(consoleWarn).toHaveBeenCalledWith('Error pruning layers');
    expect(consoleError).toHaveBeenCalled();

    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('should keep exact number of versions specified by prune', async () => {
    mockSend
      .mockResolvedValueOnce({
        LayerVersions: [
          { Version: 10 },
          { Version: 9 },
          { Version: 8 },
          { Version: 7 },
          { Version: 6 },
        ],
      })
      .mockResolvedValue({});

    await pruneLayers({
      region: 'us-east-1',
      functionName: 'my-function-layer',
      prune: 2,
    });

    // Should keep versions 10 and 9, delete 8, 7, 6
    expect(DeleteLayerVersionCommand).toHaveBeenCalledTimes(3);
  });
});
