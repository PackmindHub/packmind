import React, { useMemo } from 'react';
import { RecipeId } from '@packmind/recipes/types';
import { RecipesDeployment } from '@packmind/deployments/types';
import {
  PMHeading,
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMLink,
  PMBox,
  PMSpinner,
  PMBadge,
} from '@packmind/ui';
import { formatDate } from '../../../../shared/utils/dateUtils';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListRecipeDeploymentsQuery } from '../../api/queries/DeploymentsQueries';

interface RecipeDeploymentsListProps {
  recipeId: RecipeId;
}

export const RecipeDeploymentsList: React.FC<RecipeDeploymentsListProps> = ({
  recipeId,
}) => {
  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    isError,
    error,
  } = useListRecipeDeploymentsQuery(recipeId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();

  const isLoading = isLoadingDeployments || isLoadingUsers;

  // Create a mapping of user IDs to emails
  const userMap = useMemo(() => {
    if (!users) return {};
    const usersName = users.reduce(
      (map, user) => {
        map[user.id] = user.email;
        return map;
      },
      {} as Record<string, string>,
    );
    usersName['N/A'] = 'Unknown User';
    return usersName;
  }, [users]);

  const [deploymentRows, setDeploymentRows] = React.useState<PMTableRow[]>([]);

  const createCommitLinks = (
    deployment: RecipesDeployment,
  ): React.ReactNode => {
    // Use new single gitCommit field
    if (!deployment.gitCommit) {
      return 'No commits';
    }

    const commit = deployment.gitCommit;
    return (
      <PMBox>
        <PMLink
          href={commit.url}
          textDecoration="underline"
          title={commit.message}
        >
          {commit.sha.substring(0, 7)}
        </PMLink>
        {commit.message && (
          <PMText as="span" variant="small" ml={2}>
            {commit.message.length > 50
              ? `${commit.message.substring(0, 50)}...`
              : commit.message}
          </PMText>
        )}
      </PMBox>
    );
  };

  const createDeploymentRows = React.useCallback(
    (
      deployments: RecipesDeployment[],
      recipeId: string,
      userMap: Record<string, string>,
    ): PMTableRow[] => {
      return deployments.map((deployment: RecipesDeployment) => {
        const recipeVersion = deployment.recipeVersions.find(
          (version) => version.recipeId === recipeId,
        );
        const versionNumber = recipeVersion?.version || 'N/A';

        // Use new target-based model
        const repoInfo = deployment.target
          ? `${deployment.target.path} in ${deployment.target.gitRepo?.owner}/${deployment.target.gitRepo?.repo}:${deployment.target.gitRepo?.branch}`
          : 'N/A';

        // Create status badge
        const statusBadge = deployment.status ? (
          <PMBadge
            colorScheme={deployment.status === 'success' ? 'green' : 'red'}
          >
            {deployment.status === 'success' ? 'Success' : 'Failed'}
          </PMBadge>
        ) : (
          <PMBadge colorScheme="green">Deployed</PMBadge> // Fallback for old deployments
        );

        // Message column - show error for failed deployments, success message or empty for successful ones
        const message =
          deployment.status === 'failure' && deployment.error
            ? deployment.error
            : deployment.status === 'success'
              ? 'Deployment completed successfully'
              : '-';

        return {
          version: versionNumber,
          repo: repoInfo,
          commits: createCommitLinks(deployment),
          author: userMap[deployment.authorId || 'N/A'],
          deployedAt: formatDate(deployment.createdAt) || 'N/A',
          status: statusBadge,
          message: message,
        };
      });
    },
    [],
  );

  React.useEffect(() => {
    if (!deployments) return;
    setDeploymentRows(createDeploymentRows(deployments, recipeId, userMap));
  }, [deployments, recipeId, userMap, createDeploymentRows]);

  if (isLoading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h2">Loading Recipe Deployments...</PMHeading>
        <PMText as="p" variant="body">
          Please wait while we fetch the recipe deployments.
        </PMText>
        <PMBox display="flex" justifyContent="center" mt={4}>
          <PMSpinner size="xl" color="blue.500" />
        </PMBox>
      </PMBox>
    );
  }

  if (isError) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMHeading level="h2">Error Loading Recipe Deployments</PMHeading>
        <PMText as="p" variant="body">
          Sorry, we couldn't load the recipe deployments.
        </PMText>
        {error && (
          <PMText as="p" variant="small" color="error">
            Error: {error.message}
          </PMText>
        )}
      </PMBox>
    );
  }

  if (!deployments || deploymentRows.length === 0) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="yellow.500"
      >
        <PMHeading level="h2">No Deployments Found</PMHeading>
        <PMText as="p" variant="body">
          There are no deployments available for this recipe.
        </PMText>
      </PMBox>
    );
  }

  // Define columns for the table
  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '10%', align: 'center' },
    { key: 'repo', header: 'Target', width: '20%' },
    { key: 'commits', header: 'Git Commits', width: '18%' },
    { key: 'author', header: 'Author', width: '15%' },
    { key: 'deployedAt', header: 'Deployment Date', width: '12%' },
    { key: 'status', header: 'Status', width: '10%', align: 'center' },
    { key: 'message', header: 'Message', grow: true, align: 'left' },
  ];

  return (
    <PMBox>
      <PMHeading level="h5">Deployments history</PMHeading>
      <PMTable
        columns={columns}
        data={deploymentRows}
        striped={true}
        hoverable={true}
        size="md"
        variant="line"
        showColumnBorder={false}
      />
    </PMBox>
  );
};
