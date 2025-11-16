import { useParams } from 'react-router';
import { PMPage, PMBox, PMButton } from '@packmind/ui';
import { TopicDetails } from '../../src/domain/learnings/components/TopicDetails';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { TopicId } from '@packmind/types';

export default function TopicDetailsIndexRouteModule() {
  const { topicId } = useParams<{
    orgSlug: string;
    spaceSlug: string;
    topicId: string;
  }>();

  const handleDistillTopic = () => {
    // TODO: Implement distill single topic mutation
    console.log('Distilling topic:', topicId);
    alert(
      'Distill single topic feature coming soon. Use "Distill All" for now.',
    );
  };

  if (!topicId) {
    return (
      <PMPage
        title="Topic Not Found"
        subtitle="No topic ID provided"
        breadcrumbComponent={<AutobreadCrumb />}
      >
        <PMBox>
          <p>
            The topic you're looking for doesn't exist or the ID is invalid.
          </p>
        </PMBox>
      </PMPage>
    );
  }

  return (
    <PMPage
      title="Topic Details"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMButton colorScheme="blue" onClick={handleDistillTopic}>
          Distill Topic
        </PMButton>
      }
    >
      <TopicDetails topicId={topicId as TopicId} />
    </PMPage>
  );
}
