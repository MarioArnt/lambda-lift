import {
  waitUntilFunctionUpdated,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda';

export const updateLayer = async (options: {
  region: string;
  functionName: string;
  layerArn: string;
}): Promise<void> => {
  const lambdaClient = new LambdaClient({ region: options.region, maxAttempts: 10 });
  const updateConfigParams = {
    FunctionName: options.functionName,
    Layers: [options.layerArn],
  };
  const updateConfigCommand = new UpdateFunctionConfigurationCommand(updateConfigParams);
  await lambdaClient.send(updateConfigCommand);
  await waitUntilFunctionUpdated(
    {
      client: lambdaClient,
      maxWaitTime: 120,
    },
    {
      FunctionName: options.functionName,
    }
  );
};
