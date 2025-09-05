import { useCallback } from 'react';
import { standardsGateway } from '../../standards/api/gateways';
import { GitRepoId } from '@packmind/git/types';
import { StandardId, StandardVersionId } from '@packmind/standards/types';
import { useDeployStandardsMutation } from '../api/queries/DeploymentsQueries';

interface DeployParams {
  id: StandardId;
  version: number;
  name?: string;
}

interface BatchDeployParams {
  standards: DeployParams[];
}

// Helper function to get StandardVersionId from standardId and version
const getStandardVersionId = async (
  standardId: StandardId,
  version: number,
): Promise<StandardVersionId | null> => {
  try {
    // Get all versions for the standard
    const versions = await standardsGateway.getVersionsById(standardId);

    // Find the version with the matching version number
    const standardVersion = versions.find((v) => v.version === version);

    // Return the StandardVersionId if found, null otherwise
    return standardVersion ? standardVersion.id : null;
  } catch (error) {
    console.error(
      `Failed to get StandardVersionId for standard ${standardId} version ${version}:`,
      error,
    );
    return null;
  }
};

export const useDeployStandard = () => {
  const deployMutation = useDeployStandardsMutation();

  const deployToRepository = useCallback(
    async (params: DeployParams, gitRepoIds: GitRepoId[]) => {
      // Get the StandardVersionId for this standard and version
      const standardVersionId = await getStandardVersionId(
        params.id,
        params.version,
      );

      if (!standardVersionId) {
        throw new Error(
          `Could not find version ${params.version} for standard ${params.id}`,
        );
      }

      // Deploy the standard using the StandardVersionId
      await deployMutation.mutateAsync({
        standardVersionIds: [standardVersionId],
        gitRepoIds,
      });

      const standardName = params.name || params.id;
      console.log(
        `Standard ${standardName} v${params.version} deployed to ${gitRepoIds.length} repositories successfully`,
      );
    },
    [deployMutation],
  );

  const deploySingle = useCallback(
    async (params: DeployParams, gitRepoIds: GitRepoId[]) => {
      try {
        if (!gitRepoIds.length) {
          throw new Error('Repository IDs array cannot be empty');
        } else {
          await deployToRepository(params, gitRepoIds);
        }
      } catch (error) {
        const standardName = params.name || params.id;
        console.error(
          `Failed to deploy standard ${standardName} v${params.version}:`,
          error,
        );
        throw error;
      }
    },
    [deployToRepository],
  );

  const deployBatch = useCallback(
    async (batchParams: BatchDeployParams, gitRepoIds: GitRepoId[]) => {
      try {
        if (!gitRepoIds.length) {
          throw new Error('Repository IDs array cannot be empty');
        } else {
          console.log(
            'Deploying batch of standards to repositories:',
            gitRepoIds,
          );

          // Get StandardVersionIds for all standards in the batch
          const standardVersionIdsPromises = batchParams.standards.map(
            async (standard) => {
              const standardVersionId = await getStandardVersionId(
                standard.id,
                standard.version,
              );
              if (!standardVersionId) {
                console.warn(
                  `Could not find version ${standard.version} for standard ${standard.id}, skipping`,
                );
              }
              return { standardVersionId, standard };
            },
          );

          const results = await Promise.all(standardVersionIdsPromises);

          const validResults = results.filter(
            (result) => result.standardVersionId !== null,
          );

          if (validResults.length === 0) {
            throw new Error('No valid standard versions found for deployment');
          }

          const standardVersionIds = validResults.map(
            (result) => result.standardVersionId as StandardVersionId,
          );

          await deployMutation.mutateAsync({
            standardVersionIds,
            gitRepoIds,
          });

          console.log(
            `${validResults.length} standards deployed to ${gitRepoIds.length} repositories successfully`,
          );

          // Log any skipped standards
          const skippedCount =
            batchParams.standards.length - validResults.length;
          if (skippedCount > 0) {
            console.warn(
              `${skippedCount} standards were skipped due to missing version information`,
            );
          }
        }
      } catch (error) {
        console.error(`Failed to deploy selected standards:`, error);
        throw error;
      }
    },
    [deployMutation],
  );

  return {
    deployStandard: deploySingle,
    deployStandards: deployBatch,
    isDeploying: deployMutation.isPending,
    deployMutation, // Expose for components that need direct access to single standard deployment
    deployMultipleMutation: deployMutation, // Expose for components that need direct access to multiple standard deployment
  };
};
