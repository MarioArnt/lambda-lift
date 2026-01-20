import {
  LambdaClient,
  UpdateFunctionCodeCommand,
  waitUntilFunctionUpdated,
} from '@aws-sdk/client-lambda';

export const updateCode = async (options: {
  region: string;
  s3Bucket: string;
  functionName: string;
  s3key: string;
}): Promise<void> => {
  const lambdaClient = new LambdaClient({ region: options.region, maxAttempts: 10 });

  const updateCodeParams = {
    FunctionName: options.functionName,
    S3Bucket: options.s3Bucket,
    S3Key: options.s3key,
  };

  const updateCodeCommand = new UpdateFunctionCodeCommand(updateCodeParams);
  await lambdaClient.send(updateCodeCommand);
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
