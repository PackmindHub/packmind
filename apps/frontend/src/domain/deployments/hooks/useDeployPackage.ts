import { useCallback } from 'react';
import { PackageId } from '@packmind/types';
import { TargetId } from '@packmind/types';
import { useDeployPackagesMutation } from '../api/queries/DeploymentsQueries';

interface DeployParams {
  id: PackageId;
  name?: string;
}

interface BatchDeployParams {
  packages: DeployParams[];
}

export const useDeployPackage = () => {
  const publishMutation = useDeployPackagesMutation();

  const deployToTargets = useCallback(
    async (params: DeployParams, targetIds: TargetId[]) => {
      const deployments = await publishMutation.mutateAsync({
        packageIds: [params.id],
        targetIds: targetIds,
      });

      const packageName = params.name || params.id;
      console.log(
        `Package ${packageName} distributed to ${targetIds.length} targets successfully`,
      );

      return deployments;
    },
    [publishMutation],
  );

  const deploySingle = useCallback(
    async (params: DeployParams, targetIds: TargetId[]) => {
      try {
        if (!targetIds.length) {
          throw new Error('Target IDs array cannot be empty');
        } else {
          return await deployToTargets(params, targetIds);
        }
      } catch (error) {
        const packageName = params.name || params.id;
        console.error(`Failed to deploy package ${packageName}:`, error);
        throw error;
      }
    },
    [deployToTargets],
  );

  const deployBatch = useCallback(
    async (batchParams: BatchDeployParams, targetIds: TargetId[]) => {
      try {
        if (!targetIds.length) {
          throw new Error('Target IDs array cannot be empty');
        } else {
          console.log('Deploying batch of packages to targets:', targetIds);

          const packageIds = batchParams.packages.map(
            (deployParams) => deployParams.id,
          );

          const deployments = await publishMutation.mutateAsync({
            packageIds,
            targetIds,
          });

          console.log(
            `${packageIds.length} packages distributed to ${targetIds.length} targets successfully`,
          );

          return deployments;
        }
      } catch (error) {
        console.error(`Failed to deploy selected packages:`, error);
        throw error;
      }
    },
    [publishMutation],
  );

  return {
    deployPackage: deploySingle,
    deployPackages: deployBatch,
    isDeploying: publishMutation.isPending,
    publishMutation,
    publishMultipleMutation: publishMutation,
  };
};
