import { redirect } from 'react-router';
import { queryClient } from './queryClient';
import { getMeQueryOptions } from '../../domain/accounts/api/queries/UserQueries';
import { AuthService } from '../../services/auth/AuthService';
import { OrganizationId, UserOrganizationRole } from '@packmind/types';
import { MeResponse } from '../../domain/accounts/api/gateways/IAuthGateway';

export type AuthenticatedMeWithOrganization = Extract<
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

/**
 * Ensures the authenticated user's org context matches the URL org slug.
 * If mismatched, performs the org switch via AuthService before returning.
 *
 * Called by the _protected layout's clientMiddleware — runs once before all loaders.
 */
export async function ensureOrgContext(
  orgSlug: string,
): Promise<AuthenticatedMeWithOrganization> {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());

  if (!me?.organization) {
    throw redirect('/sign-in');
  }

  // Fast path: org matches URL
  if (me.organization.slug === orgSlug) {
    return me as AuthenticatedMeWithOrganization;
  }

  // Org mismatch: perform the actual switch
  const result =
    await AuthService.getInstance().validateAndSwitchIfNeeded(orgSlug);

  if (!result.success || !result.hasAccess || !result.updatedMe?.organization) {
    throw redirect(`/org/${me.organization.slug}`);
  }

  return result.updatedMe as AuthenticatedMeWithOrganization;
}
