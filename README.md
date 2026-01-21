# LambdaLift

[![npm version](https://badge.fury.io/js/lambda-lift.svg)](https://www.npmjs.com/package/lambda-lift)
[![Publish](https://github.com/MarioArnt/lambda-lift/actions/workflows/publish.yml/badge.svg)](https://github.com/MarioArnt/lambda-lift/actions/workflows/publish.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=MarioArnt_lambda-lift&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=MarioArnt_lambda-lift)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=MarioArnt_lambda-lift&metric=coverage)](https://sonarcloud.io/summary/new_code?id=MarioArnt_lambda-lift)

LambdaLift is a utility designed to streamline the process of updating code for AWS Lambda functions.

It automates the entire deployment workflow: creating the zip archive, uploading the new version to S3, publishing a new Lambda version, and updating the function configuration.

LambdaLift also supports Lambda Layers and version pruning to keep your environment clean.

## Motivation

When managing infrastructure as code (IaC) with tools like OpenTofu or Terraform, it is a best practice to separate infrastructure definitions from application code. This often means keeping them in separate repositories or lifecycles.

A common pattern is to:

1. Define the Lambda infrastructure (memory, IAM roles, networking) in the IaC repository, deploying a placeholder "Hello World" function.
2. Configure the IaC to ignore changes to the function code (`lifecycle { ignore_changes = [source_code_hash] }`).
3. Manage the actual application logic in a separate repository with its own CI/CD pipeline.

While this decouples infrastructure from business logic, manually publishing new function versions can be tedious.

**LambdaLift** bridges this gap. It handles the specific AWS operations required to effectively and safely deploy a new version of your Lambda function code without re-running your entire infrastructure pipeline.

## Installation

Install the package as a development dependency using your preferred package manager:

### Node.js / JavaScript / TypeScript

```bash
# Using npm
npm install --save-dev lambda-lift

# Using pnpm
pnpm add -D lambda-lift

# Using yarn
yarn add -D lambda-lift
```

### Python

```bash
pip install lambda-lift
```

The Python package will automatically use `npx` if Node.js is available, or download a standalone binary otherwise.

### Go

```bash
go install github.com/marnautoupages/lambda-lift@latest
```

The Go wrapper will automatically use `npx` if Node.js is available, or download a standalone binary otherwise.

### Standalone Binary

Download pre-built binaries for Linux, macOS, or Windows from the [GitHub Releases](https://github.com/marnautoupages/lambda-lift/releases) page.

## Usage

Run the `deploy` command to start the deployment process:

```bash
npx lambda-lift deploy [options] [variables]
```

### Options

| Option                | Description                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| `-f, --config <path>` | Path to the configuration file. If omitted, LambdaLift searches up file tree. |
| `-h, --help`          | Show help information.                                                        |

### Environment Variables / Interpolation

You can pass user-defined variables to the command line to interpolate values in your configuration. This is useful for deploying to different environments (e.g., `dev`, `staging`, `prod`).

```bash
# Pass variables directly as arguments
npx lambda-lift deploy ENV=dev REGION=us-east-1
```

Alternatively, you can use environment variables prefixed with `LAMBDA_LIFT_`:

```bash
LAMBDA_LIFT_ENV=dev npx lambda-lift deploy
```

## Configuration

LambdaLift supports configuration via JSON, YAML, or JavaScript files (using `cosmiconfig`). It looks for files like `package.json` (under a `lambdalift` key), `.lambdarc`, `lambdalift.config.js`, etc.

**Example `lambdalift.config.json`:**

```json
{
  "name": "my-app-${ENV}-function",
  "region": "us-east-1",
  "s3": {
    "bucket": "my-app-${ENV}-deployments",
    "key": "lambdas/my-function/"
  },
  "prune": 5,
  "artifacts": ["dist/**", "!dist/**/*.map"],
  "layer": {
    "nodejs": ["node_modules/**", "package.json"]
  }
}
```

### Configuration Reference

| Property        | Type                           | Required | Default      | Description                                                                                                                  |
| :-------------- | :----------------------------- | :------- | :----------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **`name`**      | `string`                       | Yes      | -            | The name of the Lambda function to update. Supports interpolation.                                                           |
| **`region`**    | `string`                       | No       | `AWS_REGION` | The AWS region where the function and S3 bucket are located. Defaults to your AWS environment configuration.                 |
| **`s3`**        | `object`                       | Yes      | -            | Configuration for the S3 bucket used for deployment artifacts.                                                               |
| **`s3.bucket`** | `string`                       | Yes      | -            | The name of the S3 bucket to upload code to.                                                                                 |
| **`s3.key`**    | `string`                       | Yes      | -            | The prefix/path within the bucket where the zip file will be stored.                                                         |
| **`prune`**     | `number`                       | No       | `3`          | The number of recent Lambda versions to keep. Older versions will be deleted after deployment.                               |
| **`artifacts`** | `string \| string[] \| object` | Yes      | -            | Defines which files to include in the function code. See [Artifacts & Layers](#artifacts--layers).                           |
| **`layers`**    | `string \| string[] \| object` | No       | -            | Defines files to upload as a Lambda Layer. If omitted, layers are not updated. See [Artifacts & Layers](#artifacts--layers). |

### Artifacts & Layers

The `artifacts` and `layers` properties invoke the zipper to package your code. They support flexible definitions:

1. **Pre-built Zip:** A string path ending in `.zip`. LambdaLift will upload this file directly.

   ```json
   "artifacts": "./dist/function.zip"
   ```

2. **Globs:** A glob string or an array of glob strings. Matching files are added to the root of the archive.

   ```json
   "artifacts": ["src/**/*.js", "package.json"]
   ```

3. **Mapped Globs:** An object where keys are the destination paths inside the zip, and values are globs.
   ```json
   "artifacts": {
     ".": ["index.js"],
     "lib/": ["src/lib/**"]
   }
   ```

## Interpolation Syntax

Use the syntax `${VAR_NAME}` in your configuration strings to inject values dynamically.

For example, if you configure `"name": "service-${STAGE}"`:

1. Run `npx lambda-lift deploy STAGE=prod`.
2. LambdaLift resolves the name to `service-prod`.

If a variable is missing, the deployment will fail with an error to prevent misconfiguration.
