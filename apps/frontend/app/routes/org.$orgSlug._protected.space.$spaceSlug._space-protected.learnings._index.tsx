import { PMPage, PMVStack, PMButton, PMHStack, PMLink } from '@packmind/ui';
import { Link, useParams } from 'react-router';
import { AutobreadCrumb } from '../../src/shared/components/navigation/AutobreadCrumb';
import { KnowledgePatchesList } from '../../src/domain/learnings/components/KnowledgePatchesList';
import {
  useGetTopicsStatsQuery,
  useDistillAllPendingTopicsMutation,
} from '../../src/domain/learnings/api/queries/LearningsQueries';
import { routes } from '../../src/shared/utils/routes';

export default function LearningsIndexRouteModule() {
  const { orgSlug, spaceSlug } = useParams<{
    orgSlug: string;
    spaceSlug: string;
  }>();
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
          {!statsLoading && stats && orgSlug && spaceSlug && (
            <PMLink asChild>
              <Link to={routes.space.toTopics(orgSlug, spaceSlug)}>
                {stats.pendingTopics > 0
                  ? `${stats.pendingTopics} topic${stats.pendingTopics !== 1 ? 's' : ''} pending`
                  : 'View topics'}
              </Link>
            </PMLink>
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
