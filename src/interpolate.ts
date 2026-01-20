import { LambdaLiftConfig } from './config';

/**
 * Interpolates variables in configuration strings
 * Variables can be provided via:
 * 1. CLI arguments (e.g., ENV=prod)
 * 2. Environment variables prefixed with LAMBDA_LIFT_ (e.g., LAMBDA_LIFT_ENV=prod)
 */
export function interpolateConfig(
  config: LambdaLiftConfig,
  cliVariables: Record<string, string>
): LambdaLiftConfig {
  // Merge CLI variables with environment variables
  const variables: Record<string, string> = { ...cliVariables };

  // Add environment variables with LAMBDA_LIFT_ prefix
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('LAMBDA_LIFT_')) {
      const varName = key.substring('LAMBDA_LIFT_'.length);
      if (!variables[varName]) {
        variables[varName] = value!;
      }
    }
  }

  // Add AWS_REGION if available and not overridden
  if (process.env.AWS_REGION && !variables.AWS_REGION) {
    variables.AWS_REGION = process.env.AWS_REGION;
  }

  const interpolated = JSON.parse(JSON.stringify(config), (key, value) => {
    if (typeof value === 'string') {
      return interpolateString(value, variables);
    }
    return value;
  });

  return interpolated;
}

/**
 * Interpolates a single string with variables using ${VAR} syntax
 */
function interpolateString(str: string, variables: Record<string, string>): string {
  // Find all ${VAR} patterns
  const regex = /\$\{([^}]+)\}/g;
  const missing: string[] = [];

  const result = str.replace(regex, (match, varName) => {
    const value = variables[varName];
    if (value === undefined) {
      missing.push(varName);
      return match; // Keep the original if not found
    }
    return value;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required variables: ${missing.join(', ')}\n\n` +
        `You can provide them via:\n` +
        `  1. CLI arguments: lambda-lift deploy ${missing[0]}=value\n` +
        `  2. Environment variables: LAMBDA_LIFT_${missing[0]}=value lambda-lift deploy`
    );
  }

  return result;
}
