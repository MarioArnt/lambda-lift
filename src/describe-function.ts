import { LambdaClient, GetFunctionCommand, GetFunctionCommandOutput } from '@aws-sdk/client-lambda';

export const describeFunction = async (
  functionName: string,
  region?: string
): Promise<GetFunctionCommandOutput> => {
  const client = new LambdaClient({ region, maxAttempts: 10 });

  const command = new GetFunctionCommand({
    FunctionName: functionName,
  });

  return await client.send(command);
};
