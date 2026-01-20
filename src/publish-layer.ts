import { LambdaClient, PublishLayerVersionCommand, Runtime } from '@aws-sdk/client-lambda';
import { promises as fs } from 'fs';

const DEFAULT_ARCHITECTURE = 'arm64' as const;
const DEFAULT_RUNTIME = 'nodejs20.x' as const;

export const publishLayer = async (
  region: string,
  zipLocation: string,
  functionName: string,
  architecture: 'arm64' | 'x86_64' = DEFAULT_ARCHITECTURE,
  runtime: string = DEFAULT_RUNTIME
): Promise<string | undefined> => {
  const client = new LambdaClient({ region, maxAttempts: 10 });
  const buffer = await fs.readFile(zipLocation);
  const options = {
    LayerName: functionName,
    CompatibleArchitectures: [architecture],
    CompatibleRuntimes: [runtime as Runtime],
    Description: `Lambda layer for service ${functionName}`,
  };
  const result = await client.send(
    new PublishLayerVersionCommand({
      Content: { ZipFile: buffer },
      ...options,
    })
  );
  return result.LayerVersionArn;
};
