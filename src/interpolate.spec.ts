import { interpolateConfig } from './interpolate';
import { LambdaLiftConfig } from './config';

describe('interpolateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.LAMBDA_LIFT_ENV;
    delete process.env.AWS_REGION;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should interpolate CLI variables', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function-${ENV}',
      s3: {
        bucket: 'my-bucket-${ENV}',
        key: 'functions/${ENV}/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, { ENV: 'prod' });

    expect(result.name).toBe('my-function-prod');
    expect(result.s3.bucket).toBe('my-bucket-prod');
    expect(result.s3.key).toBe('functions/prod/');
  });

  it('should interpolate environment variables with LAMBDA_LIFT_ prefix', () => {
    process.env.LAMBDA_LIFT_ENV = 'staging';

    const config: LambdaLiftConfig = {
      name: 'my-function-${ENV}',
      s3: {
        bucket: 'my-bucket-${ENV}',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, {});

    expect(result.name).toBe('my-function-staging');
    expect(result.s3.bucket).toBe('my-bucket-staging');
  });

  it('should prioritize CLI variables over environment variables', () => {
    process.env.LAMBDA_LIFT_ENV = 'staging';

    const config: LambdaLiftConfig = {
      name: 'my-function-${ENV}',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, { ENV: 'prod' });

    expect(result.name).toBe('my-function-prod');
  });

  it('should add AWS_REGION from environment', () => {
    process.env.AWS_REGION = 'eu-west-1';

    const config: LambdaLiftConfig = {
      name: 'my-function',
      region: '${AWS_REGION}',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, {});

    expect(result.region).toBe('eu-west-1');
  });

  it('should throw error when variable is missing', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function-${ENV}',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    expect(() => {
      interpolateConfig(config, {});
    }).toThrow('Missing required variables: ENV');
  });

  it('should handle multiple missing variables', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function-${ENV}-${REGION}',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    expect(() => {
      interpolateConfig(config, {});
    }).toThrow('Missing required variables');
  });

  it('should not modify config without variables', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, {});

    expect(result).toEqual(config);
  });

  it('should interpolate in nested objects', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket-${ENV}',
        key: 'functions/${STAGE}/',
      },
      artifacts: ['dist/**'],
    };

    const result = interpolateConfig(config, { ENV: 'prod', STAGE: 'v1' });

    expect(result.s3.bucket).toBe('my-bucket-prod');
    expect(result.s3.key).toBe('functions/v1/');
  });

  it('should interpolate in layer configuration', () => {
    const config: LambdaLiftConfig = {
      name: 'my-function',
      s3: {
        bucket: 'my-bucket',
        key: 'functions/',
      },
      artifacts: ['dist/**'],
      layer: 'layers/${ENV}.zip',
    };

    const result = interpolateConfig(config, { ENV: 'prod' });

    expect(result.layer).toBe('layers/prod.zip');
  });
});
