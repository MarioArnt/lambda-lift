import { deploy } from './index';
import ora from 'ora';
import { setupCLI } from './cli';
import { loadConfig } from './config';
import { interpolateConfig } from './interpolate';
import { createZipFile } from './create-zip';
import { describeFunction } from './describe-function';
import { publishLayer } from './publish-layer';
import { uploadCode } from './upload-code';
import { updateCode } from './update-function';
import { updateLayer } from './update-layer';
import { publishVersion } from './create-version';
import { pruneLayers } from './prune-layer';

// Mock dependencies
jest.mock('ora', () => {
  const spinner = {
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
  };
  return jest.fn(() => spinner);
});

jest.mock('./cli');
jest.mock('./config');
jest.mock('./interpolate');
jest.mock('./create-zip');
jest.mock('./describe-function');
jest.mock('./publish-layer');
jest.mock('./upload-code');
jest.mock('./update-function');
jest.mock('./update-layer');
jest.mock('./create-version');
jest.mock('./prune-layer');

describe('deploy', () => {
  // Mock process.exit to throw an error so we can stop execution flow in tests
  const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation(((code) => {
    throw new Error(`Process exited with code ${code}`);
  }) as any);
  const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  const mockConfig = {
    name: 'test-function',
    region: 'us-east-1',
    artifacts: 'dist',
    prune: 3,
    s3: {
      bucket: 'test-bucket',
      key: 'functions',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (setupCLI as jest.Mock).mockReturnValue({ variables: {} });
    (loadConfig as jest.Mock).mockResolvedValue(mockConfig);
    (interpolateConfig as jest.Mock).mockReturnValue(mockConfig);
    (createZipFile as jest.Mock).mockResolvedValue('/path/to/zip');
    (describeFunction as jest.Mock).mockResolvedValue({
      Configuration: {
        Architectures: ['x86_64'],
        Runtime: 'nodejs20.x',
      },
    });
    (publishLayer as jest.Mock).mockResolvedValue('arn:aws:lambda:us-east-1:123:layer:test:1');
  });

  afterAll(() => {
    mockProcessExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should run full deployment successfully', async () => {
    await deploy();

    expect(loadConfig).toHaveBeenCalled();
    expect(createZipFile).toHaveBeenCalled();
    expect(uploadCode).toHaveBeenCalled();
    expect(updateCode).toHaveBeenCalled();
    expect(publishVersion).toHaveBeenCalled();
  });

  it('should handle configuration loading failure', async () => {
    const error = new Error('Config error');
    (loadConfig as jest.Mock).mockRejectedValue(error);

    await expect(deploy()).rejects.toThrow('Process exited with code 1');

    expect(ora).toHaveBeenCalledWith('Loading configuration');
    // Verify fail was called on the spinner
    const spinner = (ora as unknown as jest.Mock)();
    expect(spinner.fail).toHaveBeenCalledWith('Failed to load configuration');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle zip creation failure', async () => {
    const error = new Error('Zip error');
    (createZipFile as jest.Mock).mockRejectedValue(error);

    await expect(deploy()).rejects.toThrow('Process exited with code 1');

    const spinner = (ora as unknown as jest.Mock)();
    expect(spinner.fail).toHaveBeenCalledWith('Failed to create deployment package');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should support layer deployment', async () => {
    const configWithLayer = {
      ...mockConfig,
      layer: 'layer-dist',
    };
    (loadConfig as jest.Mock).mockResolvedValue(configWithLayer);
    (interpolateConfig as jest.Mock).mockReturnValue(configWithLayer);

    await deploy();

    expect(createZipFile).toHaveBeenCalledTimes(2); // One for code, one for layer
    expect(describeFunction).toHaveBeenCalled();
    expect(publishLayer).toHaveBeenCalled();
    expect(updateLayer).toHaveBeenCalled();
  });

  it('should prune layers if configured', async () => {
    const configWithLayer = {
      ...mockConfig,
      layer: 'layer-dist',
    };
    (loadConfig as jest.Mock).mockResolvedValue(configWithLayer);
    (interpolateConfig as jest.Mock).mockReturnValue(configWithLayer);

    await deploy();

    expect(pruneLayers).toHaveBeenCalled();
  });

  it('should use pre-built zip if provided in config', async () => {
    const configWithZip = {
      ...mockConfig,
      artifacts: 'package.zip',
    };
    (loadConfig as jest.Mock).mockResolvedValue(configWithZip);
    (interpolateConfig as jest.Mock).mockReturnValue(configWithZip);

    await deploy();

    expect(createZipFile).not.toHaveBeenCalled();
    expect(uploadCode).toHaveBeenCalledWith(
      expect.objectContaining({
        zipLocation: 'package.zip',
      })
    );
  });
});
