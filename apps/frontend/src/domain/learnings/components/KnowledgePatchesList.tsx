import React from 'react';
import { Link, useParams } from 'react-router';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMBox,
  PMLink,
} from '@packmind/ui';
import { useGetKnowledgePatchesBySpaceQuery } from '../api/queries/LearningsQueries';
import { routes } from '../../../shared/utils/routes';

export const KnowledgePatchesList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useGetKnowledgePatchesBySpaceQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);

  React.useEffect(() => {
    if (!data || !orgSlug || !spaceSlug) return;

    setTableData(
      data.patches.map((patch) => ({
        key: patch.id,
        type: <PMBox>{patch.patchType}</PMBox>,
        status: <PMBox>{patch.status}</PMBox>,
        createdAt: (
          <PMBox>{new Date(patch.createdAt).toLocaleDateString()}</PMBox>
        ),
        actions: (
          <PMLink asChild>
            <Link
              to={routes.space.toLearningsPatch(orgSlug, spaceSlug, patch.id)}
            >
              View
            </Link>
          </PMLink>
        ),
      })),
    );
  }, [data, orgSlug, spaceSlug]);

  const columns: PMTableColumn[] = [
    { key: 'type', header: 'Type', width: '200px' },
    { key: 'status', header: 'Status', width: '150px' },
    { key: 'createdAt', header: 'Created', width: '150px' },
    { key: 'actions', header: '', width: '80px', align: 'right' },
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
