import {
  DeleteFunctionCommand,
  LambdaClient,
  ListVersionsByFunctionCommand,
  PublishVersionCommand,
} from '@aws-sdk/client-lambda';

export const publishVersion = async (
  region: string,
  functionName: string,
  prune = 3
): Promise<void> => {
  const client = new LambdaClient({ region, maxAttempts: 10 });
  await client.send(
    new PublishVersionCommand({
      FunctionName: functionName,
    })
  );
  const allVersions = await client.send(
    new ListVersionsByFunctionCommand({
      FunctionName: functionName,
    })
  );
  const previousVersions = allVersions.Versions.filter((l) => Number.isInteger(Number(l.Version)))
    .sort((l1, l2) => Number(l2.Version) - Number(l1.Version))
    .slice(prune);
  const deletions$ = previousVersions.map(async (l) => {
    if (l.Version) {
      await client.send(
        new DeleteFunctionCommand({
          FunctionName: functionName,
          Qualifier: l.Version,
        })
      );
    }
  });
  try {
    await Promise.all(deletions$);
  } catch (e) {
    console.warn('Error pruning versions: ', e);
  }
};
