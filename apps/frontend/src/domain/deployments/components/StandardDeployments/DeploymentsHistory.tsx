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

  const tableData: PMTableRow[] = deployments.map((deployment) => ({
    key: deployment.id,
    repositories: deployment.gitRepos?.length || 0,
    versions:
      deployment.standardVersions.find(
        (standardVersion) => standardVersion.standardId === standardId,
      )?.version || '-',
    author: deployment.authorId,
    createdAt: new Date(deployment.createdAt).toLocaleDateString(),
    status: <PMBadge colorScheme="green">Deployed</PMBadge>,
  }));

  const columns: PMTableColumn[] = [
    {
      key: 'repositories',
      header: 'Repositories',
      width: '120px',
      align: 'center',
    },
    { key: 'versions', header: 'Version', width: '100px', align: 'center' },
    { key: 'author', header: 'Author', grow: true },
    {
      key: 'createdAt',
      header: 'Deployed At',
      width: '120px',
      align: 'center',
    },
    { key: 'status', header: 'Status', width: '100px', align: 'center' },
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
