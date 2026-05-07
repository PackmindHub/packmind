import { useCallback } from 'react';
import { PackageId, PackagesDeployment } from '@packmind/types';
import { TargetId } from '@packmind/types';
import { useDeployPackagesMutation } from '../api/queries/DeploymentsQueries';

interface DeployParams {
  id: PackageId;
  name?: string;
}

interface BatchDeployParams {
  packages: DeployParams[];
}

export interface DeployByTargetGroup {
  targetId: TargetId;
  packageIds: PackageId[];
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

  const deployOutdatedByTargets = useCallback(
    async (groups: DeployByTargetGroup[]) => {
      const nonEmpty = groups.filter((g) => g.packageIds.length > 0);
      if (nonEmpty.length === 0) {
        return [] as PackagesDeployment[];
      }

      const settled = await Promise.allSettled(
        nonEmpty.map((g) =>
          publishMutation.mutateAsync({
            packageIds: g.packageIds,
            targetIds: [g.targetId],
          }),
        ),
      );

      const aggregated: PackagesDeployment[] = [];
      const failures: unknown[] = [];
      settled.forEach((result) => {
        if (result.status === 'fulfilled') {
          aggregated.push(...result.value);
        } else {
          failures.push(result.reason);
        }
      });

      if (aggregated.length === 0 && failures.length > 0) {
        throw failures[0] instanceof Error
          ? failures[0]
          : new Error('Batch distribution failed');
      }

      return aggregated;
    },
    [publishMutation],
  );

  return {
    deployPackage: deploySingle,
    deployPackages: deployBatch,
    deployOutdatedByTargets,
    isDeploying: publishMutation.isPending,
    publishMutation,
    publishMultipleMutation: publishMutation,
  };
};
