import { Command } from 'commander';
import chalk from 'chalk';

export interface CLIOptions {
  config?: string;
  variables: Record<string, string>;
}

export function setupCLI(): CLIOptions {
  const program = new Command();

  program
    .name('lambda-lift')
    .description('A utility to streamline AWS Lambda function deployments')
    .version('0.1.0');

  program
    .command('deploy')
    .description('Deploy a Lambda function')
    .option('-f, --config <path>', 'Path to configuration file')
    .argument('[variables...]', 'Variables in KEY=VALUE format (e.g., ENV=prod REGION=us-east-1)')
    .action((variablesArray: string[], options: { config?: string }) => {
      // Parse variables from arguments
      const variables: Record<string, string> = {};
      for (const arg of variablesArray) {
        const match = arg.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/i);
        if (match) {
          variables[match[1]] = match[2];
        } else {
          console.error(chalk.red(`Invalid variable format: ${arg}`));
          console.error(chalk.yellow('Variables must be in KEY=VALUE format (e.g., ENV=prod)'));
          process.exit(1);
        }
      }

      // Store the parsed options globally for the main function to use
      (global as any).__cliOptions = {
        config: options.config,
        variables,
      };
    });

  program.parse();

  // Return the stored options or defaults
  return (global as any).__cliOptions || { variables: {} };
}
