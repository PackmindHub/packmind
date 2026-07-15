import { OrganizationId, CommandId } from '@packmind/types';
import { Outlet } from 'react-router';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getCommandByIdOptions } from '../../src/domain/commands/api/queries/CommandsQueries';
import { getSpaceBySlugQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { queryClient } from '../../src/shared/data/queryClient';

export async function clientLoader({
  params,
}: {
  params: { orgSlug: string; spaceSlug: string; commandId: string };
}) {
  // Fetch user data - ensureQueryData uses cache if available, fetches otherwise
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  // Fetch space data - ensureQueryData uses cache if available, fetches otherwise
  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug, me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  return queryClient.ensureQueryData(
    getCommandByIdOptions(
      me.organization.id as OrganizationId,
      space.id,
      params.commandId as CommandId,
    ),
  );
}

export default function CommandDetailsRouteModule() {
  return <Outlet />;
}
