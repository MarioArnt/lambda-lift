import { publishVersion } from './create-version';
import {
  LambdaClient,
  PublishVersionCommand,
  ListVersionsByFunctionCommand,
  DeleteFunctionCommand,
} from '@aws-sdk/client-lambda';

jest.mock('@aws-sdk/client-lambda');

describe('publishVersion', () => {
  const mockSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (LambdaClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  it('should publish a new version', async () => {
    mockSend
      .mockResolvedValueOnce({}) // PublishVersion
      .mockResolvedValueOnce({
        // ListVersions
        Versions: [{ Version: '$LATEST' }, { Version: '3' }, { Version: '2' }, { Version: '1' }],
      });

    await publishVersion('us-east-1', 'my-function', 3);

    expect(PublishVersionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
    });
    expect(ListVersionsByFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
    });
  });

  it('should delete old versions beyond prune threshold', async () => {
    mockSend
      .mockResolvedValueOnce({}) // PublishVersion
      .mockResolvedValueOnce({
        // ListVersions
        Versions: [
          { Version: '$LATEST' },
          { Version: '5' },
          { Version: '4' },
          { Version: '3' },
          { Version: '2' },
          { Version: '1' },
        ],
      })
      .mockResolvedValue({}); // DeleteFunction calls

    await publishVersion('us-east-1', 'my-function', 3);

    // Should delete versions 2 and 1 (keeping the 3 most recent: 5, 4, 3)
    expect(DeleteFunctionCommand).toHaveBeenCalledTimes(2);
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '2',
    });
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '1',
    });
  });

  it('should filter out $LATEST from deletion', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Versions: [{ Version: '$LATEST' }, { Version: '2' }, { Version: '1' }],
      })
      .mockResolvedValue({});

    await publishVersion('us-east-1', 'my-function', 1);

    // Only version 1 should be deleted (2 is kept, $LATEST is filtered out)
    expect(DeleteFunctionCommand).toHaveBeenCalledTimes(1);
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '1',
    });
  });

  it('should not delete anything if versions are below prune threshold', async () => {
    mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({
      Versions: [{ Version: '$LATEST' }, { Version: '2' }, { Version: '1' }],
    });

    await publishVersion('us-east-1', 'my-function', 3);

    expect(DeleteFunctionCommand).not.toHaveBeenCalled();
  });

  it('should use default prune value of 3', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Versions: [
          { Version: '$LATEST' },
          { Version: '5' },
          { Version: '4' },
          { Version: '3' },
          { Version: '2' },
        ],
      })
      .mockResolvedValue({});

    await publishVersion('us-east-1', 'my-function');

    // Should delete version 2 (keeping 3 most recent: 5, 4, 3)
    expect(DeleteFunctionCommand).toHaveBeenCalledTimes(1);
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '2',
    });
  });

  it('should handle deletion errors gracefully', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();

    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Versions: [
          { Version: '$LATEST' },
          { Version: '4' },
          { Version: '3' },
          { Version: '2' },
          { Version: '1' },
        ],
      })
      .mockRejectedValue(new Error('Deletion failed'));

    await publishVersion('us-east-1', 'my-function', 3);

    expect(consoleWarn).toHaveBeenCalledWith('Error pruning versions: ', expect.any(Error));
    consoleWarn.mockRestore();
  });

  it('should use specified region', async () => {
    mockSend.mockResolvedValueOnce({}).mockResolvedValueOnce({
      Versions: [],
    });

    await publishVersion('eu-west-1', 'my-function', 3);

    expect(LambdaClient).toHaveBeenCalledWith({
      region: 'eu-west-1',
      maxAttempts: 10,
    });
  });

  it('should sort versions in descending order before pruning', async () => {
    mockSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Versions: [
          { Version: '$LATEST' },
          { Version: '1' }, // Unsorted
          { Version: '3' },
          { Version: '2' },
          { Version: '5' },
          { Version: '4' },
        ],
      })
      .mockResolvedValue({});

    await publishVersion('us-east-1', 'my-function', 3);

    // Should keep 5, 4, 3 and delete 2, 1
    expect(DeleteFunctionCommand).toHaveBeenCalledTimes(2);
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '2',
    });
    expect(DeleteFunctionCommand).toHaveBeenCalledWith({
      FunctionName: 'my-function',
      Qualifier: '1',
    });
  });
});
