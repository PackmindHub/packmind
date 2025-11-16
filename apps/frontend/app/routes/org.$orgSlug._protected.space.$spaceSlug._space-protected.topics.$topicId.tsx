import { Topic, TopicId } from '@packmind/types';
import { NavLink, Outlet } from 'react-router';
import { getTopicByIdOptions } from '../../src/domain/learnings/api/queries/LearningsQueries';
import { queryClient } from '../../src/shared/data/queryClient';
import { routes } from '../../src/shared/utils/routes';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { OrganizationId } from '@packmind/types';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; topicId: string };
}) {
  const me = await queryClient.fetchQuery(getMeQueryOptions());
  const space = await queryClient.fetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization?.id || ''),
  );

  const topicData = queryClient.ensureQueryData(
    getTopicByIdOptions(
      params.topicId as TopicId,
      space.id,
      me.organization?.id as OrganizationId,
    ),
  );
  return topicData;
}

export const handle = {
  crumb: ({
    params,
    data,
  }: {
    params: { orgSlug: string; spaceSlug: string; topicId: string };
    data: { topic: Topic | null };
  }) => {
    const topicId = params.topicId;
    return (
      <NavLink
        to={routes.space.toTopic(params.orgSlug, params.spaceSlug, topicId)}
      >
        {data.topic?.title || 'Topic'}
      </NavLink>
    );
  },
};

export default function TopicDetailsRouteModule() {
  return <Outlet />;
}
