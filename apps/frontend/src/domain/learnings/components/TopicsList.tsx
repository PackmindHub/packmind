import React from 'react';
import { Link, useParams } from 'react-router';
import {
  PMBox,
  PMEmptyState,
  PMLink,
  PMTable,
  PMTableColumn,
  PMTableRow,
} from '@packmind/ui';
import { useTopicsQuery } from '../api/queries/LearningsQueries';
import { routes } from '../../../shared/utils/routes';

export const TopicsList = () => {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
  const { data, isLoading, isError } = useTopicsQuery();
  const [tableData, setTableData] = React.useState<PMTableRow[]>([]);

  React.useEffect(() => {
    if (!data || !orgSlug || !spaceSlug) return;

    setTableData(
      data.topics.map((topic) => ({
        key: topic.id,
        title: (
          <PMLink asChild>
            <Link to={routes.space.toTopic(orgSlug, spaceSlug, topic.id)}>
              {topic.title}
            </Link>
          </PMLink>
        ),
        createdAt: (
          <PMBox>
            {topic.createdAt
              ? new Date(topic.createdAt).toLocaleDateString()
              : 'N/A'}
          </PMBox>
        ),
        createdBy: <PMBox>{topic.createdBy}</PMBox>,
      })),
    );
  }, [data, orgSlug, spaceSlug]);

  const columns: PMTableColumn[] = [
    { key: 'title', header: 'Title' },
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

  return <PMTable columns={columns} data={tableData} />;
};
