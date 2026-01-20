import { cosmiconfig } from 'cosmiconfig';

export interface LambdaLiftConfig {
  name: string;
  region?: string;
  s3: {
    bucket: string;
    key: string;
  };
  artifacts: string | string[] | Record<string, string | string[]>;
  prune?: number;
  layer?: string | string[] | Record<string, string | string[]>;
}

const MODULE_NAME = 'lambda-lift';
const SEARCH_PLACES = [
  'package.json',
  `.lambdarc`,
  `.lambdarc.json`,
  `.lambdarc.yaml`,
  `.lambdarc.yml`,
  `.lambdarc.js`,
  `.lambdarc.cjs`,
  `.lambdaliftrc`,
  `.lambdaliftrc.json`,
  `.lambdaliftrc.yaml`,
  `.lambdaliftrc.yml`,
  `.lambdaliftrc.js`,
  `.lambdaliftrc.cjs`,
  `lambdalift.config.js`,
  `lambdalift.config.cjs`,
];

const explorer = cosmiconfig(MODULE_NAME, {
  searchPlaces: SEARCH_PLACES,
});

export async function loadConfig(): Promise<LambdaLiftConfig> {
  const result = await explorer.search();

  if (!result || !result.config) {
    throw new Error(
      'No configuration found for lambda-lift (searched for .lambdarc, package.json, etc.)'
    );
  }

  const config = result.config;
  validateConfig(config);

  // Appliquer les valeurs par défaut
  return {
    prune: 3,
    ...config,
  } as LambdaLiftConfig;
}

function validateConfig(config: any): asserts config is LambdaLiftConfig {
  const errors: string[] = [];

  if (!config) {
    throw new Error('Config is empty');
  }

  // Name
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Property "name" is required and must be a string.');
  }

  // S3
  if (!config.s3 || typeof config.s3 !== 'object') {
    errors.push('Property "s3" is required and must be an object.');
  } else {
    if (!config.s3.bucket || typeof config.s3.bucket !== 'string') {
      errors.push('Property "s3.bucket" is required and must be a string.');
    }
    if (!config.s3.key || typeof config.s3.key !== 'string') {
      errors.push('Property "s3.key" is required and must be a string.');
    }
  }

  // Artifacts
  if (!config.artifacts) {
    errors.push('Property "artifacts" is required.');
  } else if (
    typeof config.artifacts !== 'string' &&
    !Array.isArray(config.artifacts) &&
    (typeof config.artifacts !== 'object' || config.artifacts === null)
  ) {
    errors.push(
      'Property "artifacts" must be a string, an array of strings, or an object with glob mappings.'
    );
  }

  // Region (Optional)
  if (config.region !== undefined && typeof config.region !== 'string') {
    errors.push('Property "region" must be a string.');
  }

  // Prune (Optional)
  if (config.prune !== undefined) {
    if (typeof config.prune !== 'number' || !Number.isInteger(config.prune)) {
      errors.push('Property "prune" must be an integer.');
    }
  }

  // Layer (Optional)
  if (config.layer !== undefined) {
    if (
      typeof config.layer !== 'string' &&
      !Array.isArray(config.layer) &&
      (typeof config.layer !== 'object' || config.layer === null)
    ) {
      errors.push(
        'Property "layer" must be a string, an array of strings, or an object with glob mappings.'
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid lambda-lift configuration:\n- ${errors.join('\n- ')}`);
  }
}
