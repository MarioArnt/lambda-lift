import {
  DeleteLayerVersionCommand,
  LambdaClient,
  ListLayerVersionsCommand,
} from '@aws-sdk/client-lambda';

export const pruneLayers = async (options: {
  region: string;
  functionName: string;
  prune: number;
}): Promise<void> => {
  const { region, functionName, prune } = options;
  const client = new LambdaClient({ region, maxAttempts: 10 });

  const listLayerVersionsCommand = new ListLayerVersionsCommand({
    LayerName: functionName,
  });
  const listLayerVersionsResult = await client.send(listLayerVersionsCommand);
  const layerVersions = listLayerVersionsResult.LayerVersions;
  const toDelete = layerVersions
    .sort((l1, l2) => l2.Version - l1.Version)
    .map((l) => l.Version)
    .slice(prune);
  const deletion$ = toDelete.map((v) =>
    client.send(
      new DeleteLayerVersionCommand({
        LayerName: functionName,
        VersionNumber: v,
      })
    )
  );
  try {
    await Promise.all(deletion$);
  } catch (e) {
    console.warn('Error pruning layers');
    console.error(e);
  }
};
