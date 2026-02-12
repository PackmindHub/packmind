import { queryClient } from './queryClient';
import { getMeQueryOptions } from '../../domain/accounts/api/queries/UserQueries';
import { getSpaceBySlugQueryOptions } from '../../domain/spaces/api/queries/SpacesQueries';
import { OrganizationId, UserOrganizationRole } from '@packmind/types';
import { MeResponse } from '../../domain/accounts/api/gateways/IAuthGateway';

type AuthenticatedMeWithOrganization = Extract<
  MeResponse,
  { authenticated: true }
> & {
  organization: {
    id: OrganizationId;
    name: string;
    slug: string;
    role: UserOrganizationRole;
  };
};

export async function ensureSpaceContext(params: {
  orgSlug?: string;
  spaceSlug?: string;
}) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me.organization) {
    throw new Error('Organization not found');
  }

  const space = await queryClient.ensureQueryData(
    getSpaceBySlugQueryOptions(params.spaceSlug || '', me.organization.id),
  );
  if (!space) {
    throw new Error('Space not found');
  }

  return { me: me as AuthenticatedMeWithOrganization, space } as const;
}
