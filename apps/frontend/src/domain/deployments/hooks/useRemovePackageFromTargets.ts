import { useCallback } from 'react';
import { PackageId, TargetId } from '@packmind/types';
import { useRemovePackageFromTargetsMutation } from '../api/queries/DeploymentsQueries';

interface RemoveParams {
  id: PackageId;
  name?: string;
}

export const useRemovePackageFromTargets = () => {
  const removeMutation = useRemovePackageFromTargetsMutation();

  const removeFromTargets = useCallback(
    async (params: RemoveParams, targetIds: TargetId[]) => {
      try {
        if (!targetIds.length) {
          throw new Error('Target IDs array cannot be empty');
        }

        const results = await removeMutation.mutateAsync({
          packageId: params.id,
          targetIds,
        });

        const packageName = params.name || params.id;
        console.log(
          `Package ${packageName} removed from ${targetIds.length} targets`,
        );

        return results;
      } catch (error) {
        const packageName = params.name || params.id;
        console.error(
          `Failed to remove package ${packageName} from targets:`,
          error,
        );
        throw error;
      }
    },
    [removeMutation],
  );

  return {
    removePackageFromTargets: removeFromTargets,
    isRemoving: removeMutation.isPending,
    removeMutation,
  };
};
