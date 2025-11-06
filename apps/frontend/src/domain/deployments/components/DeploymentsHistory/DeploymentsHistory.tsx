import React from 'react';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMBadge,
  PMEmptyState,
  PMPageSection,
  PMSpinner,
  PMText,
  PMBox,
  PMHeading,
  PMLink,
  PMTooltip,
} from '@packmind/ui';
import { RecipesDeployment } from '@packmind/shared/src/types/deployments/RecipesDeployment';
import { RenderMode, StandardsDeployment } from '@packmind/shared/types';
import { format } from 'date-fns';

export type DeploymentType = 'recipe' | 'standard';

interface DeploymentsHistoryProps {
  deployments: RecipesDeployment[] | StandardsDeployment[];
  type: DeploymentType;
  entityId: string;
  usersMap?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  title?: string;
}

export const DeploymentsHistory: React.FC<DeploymentsHistoryProps> = ({
  deployments,
  type,
  entityId,
  usersMap,
  loading,
  error,
  title = 'Deployment History',
}) => {
  if (loading) {
    return (
      <PMBox p={4} borderRadius="md" shadow="sm">
        <PMHeading level="h2">Loading Deployments...</PMHeading>
        <PMBox display="flex" justifyContent="center" mt={4}>
          <PMSpinner size="xl" color="blue.500" />
        </PMBox>
      </PMBox>
    );
  }

  if (error) {
    return (
      <PMBox
        p={4}
        borderRadius="md"
        shadow="sm"
        borderLeft="4px solid"
        borderLeftColor="red.500"
      >
        <PMHeading level="h2">Error Loading Deployments</PMHeading>
        <PMText as="p" variant="body">
          {error}
        </PMText>
      </PMBox>
    );
  }

  if (!deployments || deployments.length === 0) {
    return <PMEmptyState title={`No deployments found for this ${type}.`} />;
  }

  const getStatusBadge = (status: string, fallback?: string) => {
    if (status === 'success')
      return <PMBadge colorPalette="green">Success</PMBadge>;
    if (status === 'failure')
      return <PMBadge colorPalette="red">Failed</PMBadge>;
    if (status === 'no_changes')
      return <PMBadge colorPalette="blue">No Changes</PMBadge>;
    return <PMBadge colorPalette="green">{fallback || 'Deployed'}</PMBadge>;
  };

  const getVersion = (deployment: RecipesDeployment | StandardsDeployment) => {
    if (type === 'recipe') {
      const recipeVersion = (
        deployment as RecipesDeployment
      ).recipeVersions?.find((v) => v.recipeId === entityId);
      return recipeVersion?.version || '-';
    } else {
      const standardVersion = (
        deployment as StandardsDeployment
      ).standardVersions?.find((v) => v.standardId === entityId);
      return standardVersion?.version || '-';
    }
  };

  // Helper pour target/repo
  const getTargetInfo = (
    deployment: RecipesDeployment | StandardsDeployment,
  ) => {
    const target = deployment.target;
    if (!target) return 'No target specified';
    if (target.gitRepo) {
      return `${target.path} in ${target.gitRepo.owner}/${target.gitRepo.repo}:${target.gitRepo.branch}`;
    }
    return `${target.path} (Repository: ${target.gitRepoId})`;
  };

  const getCommitLinks = (
    deployment: RecipesDeployment | StandardsDeployment,
  ) => {
    const commit = deployment.gitCommit;
    if (!commit) return null;
    return (
      <PMBox>
        <PMLink
          variant="active"
          href={commit.url}
          target="_blank"
          rel="noopener noreferrer"
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

  const getAuthor = (deployment: RecipesDeployment | StandardsDeployment) => {
    if (usersMap) {
      return usersMap[deployment.authorId || 'N/A'] || 'Unknown User';
    }
    return deployment.authorId || '-';
  };

  const getDate = (date: string) => {
    return format(new Date(date), 'yyyy-MM-dd');
  };

  const getMessage = (deployment: RecipesDeployment | StandardsDeployment) => {
    if (deployment.status === 'failure' && deployment.error)
      return deployment.error;
    if (deployment.status === 'success')
      return 'Deployment completed successfully';
    if (deployment.status === 'no_changes')
      return 'No changes detected - already up to date';
    return '-';
  };

  const columns: PMTableColumn[] = [
    { key: 'version', header: 'Version', width: '100px', align: 'center' },
    { key: 'target', header: 'Target', width: '200px', align: 'left' },
    {
      key: 'renderModes',
      header: 'Rendered for',
      width: '200px',
      align: 'center',
    },
    { key: 'commits', header: 'Git Commits', width: '18%' },
    { key: 'author', header: 'Author', width: '120px' },
    {
      key: 'createdAt',
      header: 'Deployed At',
      width: '120px',
      align: 'center',
    },
    { key: 'status', header: 'Status', width: '100px', align: 'center' },
    { key: 'message', header: 'Message', grow: true, align: 'left' },
  ];

  const tableData: PMTableRow[] = deployments.map((deployment) => ({
    key: deployment.id,
    version: getVersion(deployment as RecipesDeployment | StandardsDeployment),
    target: getTargetInfo(
      deployment as RecipesDeployment | StandardsDeployment,
    ),
    renderModes: <RenderModes renderModes={deployment.renderModes} />,
    commits: getCommitLinks(
      deployment as RecipesDeployment | StandardsDeployment,
    ),
    author: getAuthor(deployment as RecipesDeployment | StandardsDeployment),
    createdAt: getDate(deployment.createdAt),
    status: getStatusBadge(deployment.status),
    message: getMessage(deployment as RecipesDeployment | StandardsDeployment),
  }));

  return (
    <PMPageSection title={title} headingLevel="h5">
      <PMTable
        columns={columns}
        data={tableData}
        striped={true}
        hoverable={true}
        size="md"
        variant="line"
      />
    </PMPageSection>
  );
};

const RenderModes: React.FunctionComponent<{ renderModes: RenderMode[] }> = ({
  renderModes,
}) => {
  const formatNames: Record<RenderMode, string> = {
    [RenderMode.AGENTS_MD]: 'AGENTS.md',
    [RenderMode.JUNIE]: 'Junie',
    [RenderMode.GH_COPILOT]: 'Github Copilot',
    [RenderMode.CLAUDE]: 'Claude',
    [RenderMode.CURSOR]: 'Cursor',
    [RenderMode.PACKMIND]: 'Packmind',
    [RenderMode.GITLAB_DUO]: 'Gitlab Duo',
  };
  const formattedNames = renderModes.map(
    (renderMode) => formatNames[renderMode],
  );
  const packmindLabel = formatNames[RenderMode.PACKMIND];
  const reorderedNames = formattedNames.includes(packmindLabel)
    ? [
        ...formattedNames.filter((name) => name !== packmindLabel),
        packmindLabel,
      ]
    : formattedNames;
  const allNames = reorderedNames.join(', ');

  if (reorderedNames.length > 2) {
    const visibleNames = reorderedNames.slice(0, 2).join(', ');
    const hiddenCount = reorderedNames.length - 2;
    const suffix =
      hiddenCount === 1 ? 'and 1 other' : `and ${hiddenCount} others`;

    return (
      <PMTooltip label={allNames} placement="top">
        <PMText>{`${visibleNames}, ${suffix}`}</PMText>
      </PMTooltip>
    );
  }

  return allNames;
};
