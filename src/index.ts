#!/usr/bin/env node
import { join } from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { publishLayer } from './publish-layer';
import { uploadCode } from './upload-code';
import { updateCode } from './update-function';
import { updateLayer } from './update-layer';
import { pruneLayers } from './prune-layer';
import { publishVersion } from './create-version';
import { createZipFile } from './create-zip';
import { LambdaLiftConfig, loadConfig } from './config';
import { describeFunction } from './describe-function';
import { setupCLI } from './cli';
import { interpolateConfig } from './interpolate';

const DEFAULT_PRUNE = 3;

async function deploy() {
  const beganAt = Date.now();
  const cwd = process.cwd();

  // Parse CLI arguments
  const cliOptions = setupCLI();

  // Display banner
  console.log(chalk.cyan.bold('\n┌─────────────────────────────────────┐'));
  console.log(chalk.cyan.bold('│     🚀  LambdaLift Deployment       │'));
  console.log(chalk.cyan.bold('└─────────────────────────────────────┘\n'));

  // Load and interpolate configuration
  const loadingConfig = ora('Loading configuration').start();
  let config: LambdaLiftConfig;
  try {
    config = await loadConfig();
    config = interpolateConfig(config, cliOptions.variables);

    // Use region from config or AWS environment
    if (!config.region) {
      config.region = process.env.AWS_REGION || 'us-east-1';
    }

    loadingConfig.succeed(
      `Configuration loaded ${chalk.dim(`(${config.name} in ${config.region})`)}`
    );
  } catch (e: any) {
    loadingConfig.fail('Failed to load configuration');
    console.error(chalk.red('\n' + e.message + '\n'));
    process.exit(1);
  }

  // Create deployment package
  const bundling = ora('Creating deployment package').start();
  let now = Date.now();
  let zipPath: string;

  try {
    // If a zip file is provided, use it directly
    if (typeof config.artifacts === 'string' && config.artifacts.endsWith('.zip')) {
      zipPath = config.artifacts;
      bundling.succeed(`Using pre-built package ${chalk.magenta(zipPath)}`);
    } else {
      // Otherwise create the zip file from artifacts
      const bundleZipPath = join(cwd, '.package', 'bundle.zip');
      zipPath = await createZipFile(config.artifacts, bundleZipPath, cwd);
      bundling.succeed(`Deployment package created ${chalk.dim(`(${Date.now() - now}ms)`)}`);
    }
  } catch (e: any) {
    bundling.fail('Failed to create deployment package');
    console.error(chalk.red('\n' + e.message + '\n'));
    process.exit(1);
  }

  // Publish layer if configured
  let emptyLayer = false;
  let layerArn: string | undefined;

  if (config.layer) {
    const layerSpinner = ora('Publishing Lambda layer').start();
    now = Date.now();

    try {
      const lambda = await describeFunction(config.name, config.region);
      const layerZipPath = join(cwd, '.package', 'layer.zip');

      // Create layer zip if not a pre-built zip
      if (typeof config.layer === 'string' && config.layer.endsWith('.zip')) {
        // Use pre-built layer zip
      } else {
        await createZipFile(config.layer, layerZipPath, cwd);
      }

      layerArn = await publishLayer(
        config.region,
        layerZipPath,
        config.name + '-layer',
        lambda.Configuration?.Architectures?.[0] as 'arm64' | 'x86_64',
        lambda.Configuration?.Runtime
      );

      layerSpinner.succeed(`Lambda layer published ${chalk.dim(`(${Date.now() - now}ms)`)}`);
    } catch (e: any) {
      if (e.message?.includes('Uploaded file must be a non-empty zip')) {
        emptyLayer = true;
        layerSpinner.info('No layer content to publish');
      } else {
        layerSpinner.fail('Failed to publish layer');
        console.error(chalk.red('\n' + e.message + '\n'));
        process.exit(1);
      }
    }

    // Update function with new layer
    if (!emptyLayer && layerArn) {
      const updatingLayer = ora('Updating function layer').start();
      now = Date.now();

      try {
        await updateLayer({
          functionName: config.name,
          region: config.region,
          layerArn,
        });
        updatingLayer.succeed(`Function layer updated ${chalk.dim(`(${Date.now() - now}ms)`)}`);
      } catch (e: any) {
        updatingLayer.fail('Failed to update layer');
        console.error(chalk.red('\n' + e.message + '\n'));
        process.exit(1);
      }
    }
  }

  // Upload code to S3
  const upload = ora('Uploading code to S3').start();
  now = Date.now();

  try {
    const s3Key = config.s3.key + (config.s3.key.endsWith('/') ? '' : '/') + 'bundle.zip';
    await uploadCode({
      region: config.region,
      s3Bucket: config.s3.bucket,
      s3key: s3Key,
      zipLocation: zipPath,
    });
    upload.succeed(
      `Code uploaded to S3 ${chalk.dim(`(s3://${config.s3.bucket}/${s3Key}, ${Date.now() - now}ms)`)}`
    );
  } catch (e: any) {
    upload.fail('Failed to upload code');
    console.error(chalk.red('\n' + e.message + '\n'));
    process.exit(1);
  }

  // Update Lambda function code
  const updating = ora('Updating Lambda function').start();
  now = Date.now();

  try {
    const s3Key = config.s3.key + (config.s3.key.endsWith('/') ? '' : '/') + 'bundle.zip';
    await updateCode({
      functionName: config.name,
      region: config.region,
      s3Bucket: config.s3.bucket,
      s3key: s3Key,
    });
    updating.succeed(`Lambda function updated ${chalk.dim(`(${Date.now() - now}ms)`)}`);
  } catch (e: any) {
    updating.fail('Failed to update function');
    console.error(chalk.red('\n' + e.message + '\n'));
    process.exit(1);
  }

  // Cleanup: prune old layers and versions
  const cleanup = ora('Pruning old versions and layers').start();

  try {
    const prunePromises: Promise<void>[] = [
      publishVersion(config.region, config.name, config.prune ?? DEFAULT_PRUNE),
    ];

    if (!emptyLayer && config.layer) {
      prunePromises.push(
        pruneLayers({
          functionName: config.name,
          region: config.region,
          prune: config.prune ?? DEFAULT_PRUNE,
        })
      );
    }

    await Promise.all(prunePromises);
    cleanup.succeed('Old versions pruned');
  } catch (e: any) {
    cleanup.warn('Failed to prune some versions');
  }

  // Success message
  console.log(chalk.green.bold('\n✨ Deployment completed successfully!'));
  console.log(chalk.dim(`   Total time: ${Date.now() - beganAt}ms\n`));
}

export { deploy };

// Run deployment if this file is the entry point
if (require.main === module) {
  deploy().catch((error) => {
    console.error(chalk.red('\n❌ Deployment failed:'), error.message);
    process.exit(1);
  });
}
