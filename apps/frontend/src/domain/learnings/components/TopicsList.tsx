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
} from '@packmind/ui';
import { TopicStatus } from '@packmind/types';
import { useTopicsQuery } from '../api/queries/LearningsQueries';
import { useGetUsersInMyOrganizationQuery } from '../../accounts/api/queries/UserQueries';
import { routes } from '../../../shared/utils/routes';

export const TopicsList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useTopicsQuery();
  const { data: usersData } = useGetUsersInMyOrganizationQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    TopicStatus.PENDING,
  );

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
  }, [data, orgSlug, spaceSlug, usersData, selectedStatus]);

  const columns: PMTableColumn[] = [
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
    return <PMTable columns={columns} data={tableData} />;
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
