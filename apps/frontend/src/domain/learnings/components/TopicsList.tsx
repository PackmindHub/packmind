import React from 'react';
import { Link, useParams } from 'react-router';
import {
  PMBox,
  PMEmptyState,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMTabs,
  PMBadge,
  PMButton,
  PMAlert,
  PMCheckbox,
} from '@packmind/ui';
import { TopicId, TopicStatus } from '@packmind/types';
import {
  useTopicsQuery,
  useDeleteTopicsMutation,
} from '../api/queries/LearningsQueries';
import { useGetUsersInMyOrganizationQuery } from '../../accounts/api/queries/UserQueries';
import { routes } from '../../../shared/utils/routes';

export const TopicsList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useTopicsQuery();
  const { data: usersData } = useGetUsersInMyOrganizationQuery();
  const deleteTopicsMutation = useDeleteTopicsMutation();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    TopicStatus.PENDING,
  );
  const [selectedTopicIds, setSelectedTopicIds] = React.useState<TopicId[]>([]);
  const [alert, setAlert] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSelectTopic = (topicId: TopicId, isChecked: boolean) => {
    if (isChecked) {
      setSelectedTopicIds((prev) =>
        prev.includes(topicId) ? prev : [...prev, topicId],
      );
    } else {
      setSelectedTopicIds((prev) => prev.filter((id) => id !== topicId));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedTopicIds.length === 0) return;

    try {
      const count = selectedTopicIds.length;
      await deleteTopicsMutation.mutateAsync({
        topicIds: selectedTopicIds,
      });
      setSelectedTopicIds([]);
      setAlert({
        type: 'success',
        message: `${count} ${count === 1 ? 'topic' : 'topics'} deleted successfully`,
      });

      setTimeout(() => {
        setAlert(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to delete topics:', error);
      setAlert({
        type: 'error',
        message: 'Failed to delete topics. Please try again.',
      });
    }
  };

  React.useEffect(() => {
    if (!data || !orgSlug || !spaceSlug) return;

    // Filter topics by status
    const filteredTopics =
      selectedStatus === 'all'
        ? data.topics
        : data.topics.filter((topic) => topic.status === selectedStatus);

    // Create a map of userId to user for quick lookup
    const userMap = new Map(
      usersData?.users?.map((user) => [user.userId, user]) || [],
    );

    setTableData(
      filteredTopics.map((topic) => {
        const user = userMap.get(topic.createdBy);
        const displayName = user ? user.email : topic.createdBy;

        return {
          key: topic.id,
          select: (
            <PMCheckbox
              checked={selectedTopicIds.includes(topic.id)}
              onCheckedChange={(e) => {
                handleSelectTopic(topic.id, e.checked === true);
              }}
            />
          ),
          title: (
            <PMLink asChild>
              <Link to={routes.space.toTopic(orgSlug, spaceSlug, topic.id)}>
                {topic.title}
              </Link>
            </PMLink>
          ),
          status: (
            <PMBadge
              colorScheme={
                topic.status === TopicStatus.DIGESTED ? 'green' : 'yellow'
              }
            >
              {topic.status}
            </PMBadge>
          ),
          createdAt: (
            <PMBox>
              {topic.createdAt
                ? new Date(topic.createdAt).toLocaleDateString()
                : 'N/A'}
            </PMBox>
          ),
          createdBy: <PMBox>{displayName}</PMBox>,
        };
      }),
    );
  }, [data, orgSlug, spaceSlug, usersData, selectedStatus, selectedTopicIds]);

  const isSomeSelected = selectedTopicIds.length > 0;
  const isAllSelected =
    tableData.length > 0 && selectedTopicIds.length === tableData.length;

  const columns: PMTableColumn[] = [
    {
      key: 'select',
      header: (
        <PMCheckbox
          checked={isAllSelected}
          onCheckedChange={(e) => {
            if (e.checked === true) {
              setSelectedTopicIds(tableData.map((row) => row.key as TopicId));
            } else {
              setSelectedTopicIds([]);
            }
          }}
        />
      ),
      width: '50px',
    },
    { key: 'title', header: 'Title' },
    { key: 'status', header: 'Status', width: '120px' },
    { key: 'createdAt', header: 'Created At', width: '150px' },
    { key: 'createdBy', header: 'Created By', width: '200px' },
  ];

  if (isLoading) {
    return <PMBox>Loading...</PMBox>;
  }

  if (isError) {
    return (
      <PMBox>
        <PMEmptyState
          title="Failed to load topics"
          description="An error occurred while fetching topics"
        />
      </PMBox>
    );
  }

  if (!data || data.topics.length === 0) {
    return (
      <PMEmptyState
        title="No topics yet"
        description="Topics will appear here when your team captures learnings"
      />
    );
  }

  const getTableContent = () => {
    if (tableData.length === 0) {
      const emptyMessages = {
        [TopicStatus.PENDING]: {
          title: 'No pending topics',
          description: 'No topics are waiting to be distilled',
        },
        [TopicStatus.DIGESTED]: {
          title: 'No distilled topics',
          description: 'No topics have been distilled yet',
        },
        all: {
          title: 'No topics yet',
          description:
            'Topics will appear here when your team captures learnings',
        },
      };

      const message =
        emptyMessages[selectedStatus as keyof typeof emptyMessages] ||
        emptyMessages.all;
      return (
        <PMEmptyState title={message.title} description={message.description} />
      );
    }
    return (
      <PMBox>
        {alert && (
          <PMBox mb={4}>
            <PMAlert.Root status={alert.type}>
              <PMAlert.Indicator />
              <PMAlert.Title>{alert.message}</PMAlert.Title>
            </PMAlert.Root>
          </PMBox>
        )}
        {isSomeSelected && (
          <PMBox marginBottom="4">
            <PMButton
              onClick={handleBatchDelete}
              colorScheme="red"
              loading={deleteTopicsMutation.isPending}
            >
              Delete Selected ({selectedTopicIds.length})
            </PMButton>
          </PMBox>
        )}
        <PMTable columns={columns} data={tableData} />
      </PMBox>
    );
  };

  const tabs = [
    {
      value: TopicStatus.PENDING,
      triggerLabel: 'Pending',
      content: getTableContent(),
    },
    {
      value: TopicStatus.DIGESTED,
      triggerLabel: 'Distilled',
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
