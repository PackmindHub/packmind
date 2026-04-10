import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { SpaceSettingsPage } from '../../src/domain/spaces';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getSpaceBySlugQueryOptions,
  getSpaceMembersQueryOptions,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import type { AuthenticatedMeWithOrganization } from '../../src/shared/data/ensureOrgContext';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = (await queryClient.ensureQueryData(
    getMeQueryOptions(),
  )) as AuthenticatedMeWithOrganization;

  const orgId = me.organization.id;

  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug || '', orgId),
  );

  if (!space) {
    throw redirect(`/org/${params.orgSlug}/space/${params.spaceSlug}`);
  }

  const membersData = await queryClient.ensureQueryData(
    getSpaceMembersQueryOptions(orgId, space.id),
  );

  const currentUserMember = membersData?.members?.find(
    (m) => m.userId === me.user.id,
  );

  const isOrgAdmin = me.organization.role === 'admin';
  const isSpaceAdmin = currentUserMember?.role === 'admin';

  if (!isOrgAdmin && !isSpaceAdmin) {
    throw redirect(`/org/${params.orgSlug}/space/${params.spaceSlug}`);
  }

  return null;
}

export default function SpaceSettingsRouteModule() {
  return <SpaceSettingsPage />;
}
