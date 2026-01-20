import { setupCLI } from './cli';

describe('setupCLI', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;
  const originalConsoleError = console.error;

  beforeEach(() => {
    // Reset global state
    delete (global as any).__cliOptions;
    // Mock console.error to avoid output in tests
    console.error = jest.fn();
    // Mock process.exit to prevent tests from exiting
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  it('should parse deploy command without variables', () => {
    process.argv = ['node', 'lambda-lift', 'deploy'];

    const result = setupCLI();

    expect(result.variables).toEqual({});
    expect(result.config).toBeUndefined();
  });

  it('should parse single variable', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'ENV=prod'];

    const result = setupCLI();

    expect(result.variables).toEqual({ ENV: 'prod' });
  });

  it('should parse multiple variables', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'ENV=prod', 'REGION=us-east-1'];

    const result = setupCLI();

    expect(result.variables).toEqual({
      ENV: 'prod',
      REGION: 'us-east-1',
    });
  });

  it('should parse config option', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', '-f', 'custom-config.json'];

    const result = setupCLI();

    expect(result.config).toBe('custom-config.json');
  });

  it('should parse config option with long form', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', '--config', 'custom-config.json'];

    const result = setupCLI();

    expect(result.config).toBe('custom-config.json');
  });

  it('should parse config and variables together', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', '-f', 'custom.json', 'ENV=prod', 'STAGE=v1'];

    const result = setupCLI();

    expect(result.config).toBe('custom.json');
    expect(result.variables).toEqual({
      ENV: 'prod',
      STAGE: 'v1',
    });
  });

  it('should handle invalid variable format', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'invalid-format'];

    setupCLI();

    expect(process.exit).toHaveBeenCalledWith(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid variable format: invalid-format')
    );
  });

  it('should accept variables with lowercase names', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'env=prod'];

    const result = setupCLI();

    expect(result.variables).toEqual({ env: 'prod' });
  });

  it('should accept variables with underscores', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'MY_VAR=value'];

    const result = setupCLI();

    expect(result.variables).toEqual({ MY_VAR: 'value' });
  });

  it('should accept variable values with special characters', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'URL=https://example.com/path'];

    const result = setupCLI();

    expect(result.variables).toEqual({ URL: 'https://example.com/path' });
  });

  it('should accept variable values with spaces if quoted', () => {
    process.argv = ['node', 'lambda-lift', 'deploy', 'MESSAGE=hello world'];

    const result = setupCLI();

    expect(result.variables).toEqual({ MESSAGE: 'hello world' });
  });
});
