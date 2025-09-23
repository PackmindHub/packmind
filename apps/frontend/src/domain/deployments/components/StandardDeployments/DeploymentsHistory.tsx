import React from 'react';
import {
  PMText,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMBadge,
  PMEmptyState,
  PMPageSection,
} from '@packmind/ui';
import { StandardId } from '@packmind/standards/types';
import { useListStandardDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { GitRepo, Target } from '@packmind/shared';

// Extended target type that includes the joined gitRepo from TypeORM queries
type TargetWithGitRepo = Target & {
  gitRepo?: GitRepo;
};

interface DeploymentsHistoryProps {
  standardId: StandardId;
  orgSlug?: string;
}

export const DeploymentsHistory: React.FC<DeploymentsHistoryProps> = ({
  standardId,
}) => {
  const {
    data: deployments,
    isLoading,
    isError,
  } = useListStandardDeploymentsQuery(standardId);

  if (isLoading) {
    return <PMText>Loading deployments...</PMText>;
  }

  if (isError) {
    return <PMText color="error">Failed to load deployments.</PMText>;
  }

  if (!deployments) {
    return;
  }

  const tableData: PMTableRow[] = deployments.map((deployment) => {
    // Use new target-based model (single target and gitCommit)
    const target = deployment.target as TargetWithGitRepo;
    const targetGitRepo = target?.gitRepo;

    const targetInfo = target
      ? targetGitRepo
        ? `${target.path} in ${targetGitRepo.owner}/${targetGitRepo.repo}:${targetGitRepo.branch}`
        : `${target.path} (Repository: ${target.gitRepoId})`
      : 'No target specified';

    const statusBadge = deployment.status ? (
      <PMBadge colorScheme={deployment.status === 'success' ? 'green' : 'red'}>
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
      key: deployment.id,
      target: targetInfo,
      versions:
        deployment.standardVersions.find(
          (standardVersion) => standardVersion.standardId === standardId,
        )?.version || '-',
      author: deployment.authorId,
      createdAt: new Date(deployment.createdAt).toLocaleDateString(),
      status: statusBadge,
      message: message,
    };
  });

  const columns: PMTableColumn[] = [
    {
      key: 'target',
      header: 'Target',
      width: '200px',
      align: 'left',
    },
    { key: 'versions', header: 'Version', width: '100px', align: 'center' },
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

  let historyContent = (
    <PMTable
      columns={columns}
      data={tableData}
      striped={true}
      hoverable={true}
      size="md"
      variant="line"
    />
  );

  if (!deployments || deployments.length === 0) {
    historyContent = (
      <PMEmptyState title={'No deployments found for this standard.'} />
    );
  }

  return (
    <PMPageSection title="Deployment History" headingLevel="h5">
      {historyContent}
    </PMPageSection>
  );
};
