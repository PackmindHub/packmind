import React from 'react';
import { Link, useParams } from 'react-router';
import {
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMEmptyState,
  PMBox,
  PMLink,
  PMTabs,
  PMBadge,
  PMText,
} from '@packmind/ui';
import { KnowledgePatchStatus } from '@packmind/types';
import { useGetKnowledgePatchesBySpaceQuery } from '../api/queries/LearningsQueries';
import { routes } from '../../../shared/utils/routes';

export const KnowledgePatchesList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useGetKnowledgePatchesBySpaceQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    KnowledgePatchStatus.PENDING_REVIEW,
  );

  React.useEffect(() => {
    if (!data || !orgSlug || !spaceSlug) return;

    const filteredPatches =
      selectedStatus === 'all'
        ? data.patches
        : data.patches.filter((patch) => patch.status === selectedStatus);

    setTableData(
      filteredPatches.map((patch) => ({
        key: patch.id,
        type: <PMBadge colorScheme="blue">{patch.patchType}</PMBadge>,
        status: (
          <PMBadge
            colorScheme={
              patch.status === KnowledgePatchStatus.ACCEPTED
                ? 'green'
                : patch.status === KnowledgePatchStatus.REJECTED
                  ? 'red'
                  : 'yellow'
            }
          >
            {patch.status}
          </PMBadge>
        ),
        createdAt: (
          <PMText>{new Date(patch.createdAt).toLocaleDateString()}</PMText>
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
  }, [data, orgSlug, spaceSlug, selectedStatus]);

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

  const getTableContent = () => {
    if (tableData.length === 0) {
      const emptyMessages = {
        [KnowledgePatchStatus.PENDING_REVIEW]: {
          title: 'No pending patches',
          description: 'No knowledge patches are waiting for review',
        },
        [KnowledgePatchStatus.ACCEPTED]: {
          title: 'No accepted patches',
          description: 'No knowledge patches have been accepted yet',
        },
        [KnowledgePatchStatus.REJECTED]: {
          title: 'No rejected patches',
          description: 'No knowledge patches have been rejected',
        },
        all: {
          title: 'No knowledge patches yet',
          description:
            'Knowledge patches will appear here when your team captures learnings',
        },
      };

      const message =
        emptyMessages[selectedStatus as keyof typeof emptyMessages] ||
        emptyMessages.all;
      return (
        <PMEmptyState title={message.title} description={message.description} />
      );
    }
    return <PMTable columns={columns} data={tableData} />;
  };

  const tabs = [
    {
      value: KnowledgePatchStatus.PENDING_REVIEW,
      triggerLabel: 'Pending Review',
      content: getTableContent(),
    },
    {
      value: KnowledgePatchStatus.ACCEPTED,
      triggerLabel: 'Accepted',
      content: getTableContent(),
    },
    {
      value: KnowledgePatchStatus.REJECTED,
      triggerLabel: 'Rejected',
      content: getTableContent(),
    },
    {
      value: 'all',
      triggerLabel: 'All',
      content: getTableContent(),
    },
  ];

  return (
    <PMBox>
      <PMTabs
        defaultValue={selectedStatus}
        value={selectedStatus}
        onValueChange={(details) => setSelectedStatus(details.value)}
        tabs={tabs}
      />
    </PMBox>
  );
};
