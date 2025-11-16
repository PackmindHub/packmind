import React from 'react';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMBox,
} from '@packmind/ui';
import { useGetKnowledgePatchesBySpaceQuery } from '../api/queries/LearningsQueries';

export const KnowledgePatchesList = () => {
  const { data, isLoading, isError } = useGetKnowledgePatchesBySpaceQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);

  React.useEffect(() => {
    if (!data) return;

    setTableData(
      data.patches.map((patch) => ({
        key: patch.id,
        type: <PMBox>{patch.patchType}</PMBox>,
        status: <PMBox>{patch.status}</PMBox>,
        createdAt: (
          <PMBox>{new Date(patch.createdAt).toLocaleDateString()}</PMBox>
        ),
      })),
    );
  }, [data]);

  const columns: PMTableColumn[] = [
    { key: 'type', header: 'Type', width: '200px' },
    { key: 'status', header: 'Status', width: '150px' },
    { key: 'createdAt', header: 'Created', width: '150px' },
  ];

  if (isLoading) {
    return <PMBox>Loading...</PMBox>;
  }

  if (isError) {
    return (
      <PMBox>
        <PMEmptyState
          title="Failed to load knowledge patches"
          description="An error occurred while fetching knowledge patches"
        />
      </PMBox>
    );
  }

  if (!data || data.patches.length === 0) {
    return (
      <PMEmptyState
        title="No knowledge patches yet"
        description="Knowledge patches will appear here when your team captures learnings"
      />
    );
  }

  return <PMTable columns={columns} data={tableData} />;
};
