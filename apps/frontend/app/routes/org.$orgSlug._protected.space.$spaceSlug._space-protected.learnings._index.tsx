import { PMPage, PMVStack, PMButton, PMHStack, PMText } from '@packmind/ui';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { KnowledgePatchesList } from '../../src/domain/learnings/components/KnowledgePatchesList';
import {
  useGetTopicsStatsQuery,
  useDistillAllPendingTopicsMutation,
} from '../../src/domain/learnings/api/queries/LearningsQueries';

export default function LearningsIndexRouteModule() {
  const { data: stats, isLoading: statsLoading } = useGetTopicsStatsQuery();
  const distillMutation = useDistillAllPendingTopicsMutation();

  const handleDistillTopics = () => {
    distillMutation.mutate();
  };

  return (
    <PMPage
      title="Learnings"
      subtitle="Review and manage knowledge patches from your team's learnings"
      breadcrumbComponent={<AutobreadCrumb />}
      actions={
        <PMHStack gap={4}>
          {!statsLoading && stats && stats.pendingTopics > 0 && (
            <PMText>
              {stats.pendingTopics} topic{stats.pendingTopics !== 1 ? 's' : ''}{' '}
              pending
            </PMText>
          )}
          <PMButton
            onClick={handleDistillTopics}
            disabled={
              distillMutation.isPending ||
              statsLoading ||
              !stats ||
              stats.pendingTopics === 0
            }
            loading={distillMutation.isPending}
          >
            Distill topics
          </PMButton>
        </PMHStack>
      }
    >
      <PMVStack align="stretch" gap={6}>
        <KnowledgePatchesList />
      </PMVStack>
    </PMPage>
  );
}
