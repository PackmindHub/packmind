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
} from '@packmind/ui';
import { formatDate } from '../../../../shared/utils/dateUtils';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListRecipeDeploymentsQuery } from '../../api/queries/DeploymentsQueries';

import { GitCommit } from '@packmind/git/types';
import { GitRepo } from '@packmind/git/types';

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

  // Create a mapping of user IDs to usernames
  const userMap = useMemo(() => {
    if (!users) return {};
    const usersName = users.reduce(
      (map, user) => {
        map[user.id] = user.username;
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
    if (!deployment.gitCommits || deployment.gitCommits.length === 0) {
      return 'No commits';
    }

    return (
      <PMBox>
        {deployment.gitCommits.map((commit: GitCommit, index: number) => (
          <PMBox
            key={commit.id}
            mb={index < deployment.gitCommits.length - 1 ? 1 : 0}
          >
            <PMLink
              href={commit.url}
              textDecoration="underline"
              title={commit.message}
            >
              {commit.sha.substring(0, 7)}
            </PMLink>
            {commit.message && (
              <PMText as="span" variant="small">
                {commit.message.length > 50
                  ? `${commit.message.substring(0, 50)}...`
                  : commit.message}
              </PMText>
            )}
          </PMBox>
        ))}
      </PMBox>
    );
  };

  const createDeploymentRows = React.useCallback(
    (
      deployments: RecipesDeployment[],
      recipeId: string,
      userMap: Record<string, string>,
    ): PMTableRow[] => {
      return deployments.flatMap((deployment: RecipesDeployment) => {
        const recipeVersion = deployment.recipeVersions.find(
          (version) => version.recipeId === recipeId,
        );
        const versionNumber = recipeVersion?.version || 'N/A';

        if (!deployment.gitRepos || deployment.gitRepos.length === 0) {
          return [
            {
              version: versionNumber,
              repo: 'N/A',
              commits: createCommitLinks(deployment),
              author: userMap[deployment.authorId || 'N/A'],
              deployedAt: formatDate(deployment.createdAt) || 'N/A',
            },
          ];
        }

        return deployment.gitRepos.map((repo: GitRepo) => ({
          version: versionNumber,
          repo: repo.repo || 'N/A',
          commits: createCommitLinks(deployment),
          author: userMap[deployment.authorId || 'N/A'],
          deployedAt: formatDate(deployment.createdAt) || 'N/A',
        }));
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
    { key: 'version', header: 'Version', width: '15%', align: 'center' },
    { key: 'repo', header: 'Repository', width: '25%', grow: true },
    { key: 'commits', header: 'Git Commits', width: '25%' },
    { key: 'author', header: 'Author', width: '20%' },
    { key: 'deployedAt', header: 'Deployment Date', width: '15%' },
  ];

  return (
    <PMBox
      className="recipe-deployments"
      p={4}
      borderRadius="md"
      shadow="md"
      mt={6}
    >
      <PMHeading level="h2">Recipe Deployments</PMHeading>
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
