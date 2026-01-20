// Mock cosmiconfig module properly
const mockSearch = jest.fn();
const mockExplorer = {
  search: mockSearch,
};

jest.mock('cosmiconfig', () => ({
  cosmiconfig: jest.fn(() => mockExplorer),
}));

// Import after mocking
import * as configModule from './config';

describe('loadConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load valid configuration', async () => {
    const validConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config: validConfig,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();

    expect(result).toEqual({
      ...validConfig,
      prune: 3, // Default value
    });
  });

  it('should throw error when no configuration found', async () => {
    mockSearch.mockResolvedValue(null);

    await expect(configModule.loadConfig()).rejects.toThrow(
      'No configuration found for lambda-lift'
    );
  });

  it('should throw error when config is empty', async () => {
    mockSearch.mockResolvedValue({
      config: null,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow(
      'No configuration found for lambda-lift'
    );
  });

  it('should validate required name field', async () => {
    const invalidConfig = {
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config: invalidConfig,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow(
      'Property "name" is required and must be a string'
    );
  });

  it('should validate required s3 field', async () => {
    const invalidConfig = {
      name: 'my-function',
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config: invalidConfig,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow(
      'Property "s3" is required and must be an object'
    );
  });

  it('should validate s3.bucket field', async () => {
    const invalidConfig = {
      name: 'my-function',
      s3: {
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config: invalidConfig,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow(
      'Property "s3.bucket" is required and must be a string'
    );
  });

  it('should validate s3.key field', async () => {
    const invalidConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
      },
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config: invalidConfig,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow(
      'Property "s3.key" is required and must be a string'
    );
  });

  it('should validate required artifacts field', async () => {
    const invalidConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
    };

    mockSearch.mockResolvedValue({
      config: invalidConfig,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow('Property "artifacts" is required');
  });

  it('should accept artifacts as string', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: 'dist/function.zip',
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.artifacts).toBe('dist/function.zip');
  });

  it('should accept artifacts as array', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**', '!dist/**/*.map'],
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.artifacts).toEqual(['dist/**', '!dist/**/*.map']);
  });

  it('should accept artifacts as object', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: {
        '.': ['dist/**'],
        lib: ['node_modules/**'],
      },
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.artifacts).toEqual({
      '.': ['dist/**'],
      lib: ['node_modules/**'],
    });
  });

  it('should validate prune as integer', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
      prune: 3.5,
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    await expect(configModule.loadConfig()).rejects.toThrow('Property "prune" must be an integer');
  });

  it('should accept valid prune value', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
      prune: 5,
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.prune).toBe(5);
  });

  it('should accept layer as string', async () => {
    const config = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
      layer: 'layer.zip',
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.layer).toBe('layer.zip');
  });

  it('should accept region as string', async () => {
    const config = {
      name: 'my-function',
      region: 'eu-west-1',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    mockSearch.mockResolvedValue({
      config,
      filepath: '.lambdarc',
    });

    const result = await configModule.loadConfig();
    expect(result.region).toBe('eu-west-1');
  });
});
