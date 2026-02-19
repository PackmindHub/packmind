import { Outlet, redirect } from 'react-router';
import { ChangeProposalUpdateSubscription } from '../../src/domain/change-proposals/components/ChangeProposalUpdateSubscription';
import type { LoaderFunctionArgs, Params } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { GET_ME_KEY } from '../../src/domain/accounts/api/queryKeys';
import {
  getSpaceBySlugQueryOptions,
  getSpacesQueryOptions,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getStandardsBySpaceQueryOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { pmToaster } from '@packmind/ui';
import { AuthService } from '../../src/services/auth/AuthService';
import { MeResponse } from '../../src/domain/accounts/api/gateways/IAuthGateway';
import { OrganizationId, UserOrganizationRole } from '@packmind/types';

// Type for authenticated user with guaranteed organization
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

export async function clientLoader({ params }: LoaderFunctionArgs) {
  // If org switch is in progress, wait for it to complete by returning minimal data
  // The parent layout will handle the switch and re-render
  if (AuthService.getIsSwitching()) {
    return { space: null };
  }

  // Ensure auth data is loaded - uses cache if available, fetches otherwise
  // This is critical for page refreshes where cache is empty
  const me = await queryClient.ensureQueryData(getMeQueryOptions());

  if (!me?.organization) {
    throw redirect('/sign-in');
  }

  // Validate cached me matches URL org - if not, the cache is stale
  if (me.organization.slug !== params.orgSlug) {
    // Force refetch to get fresh data after org switch
    queryClient.removeQueries({ queryKey: GET_ME_KEY });
    const freshMe = await queryClient.fetchQuery(getMeQueryOptions());

    if (
      !freshMe?.organization ||
      freshMe.organization.slug !== params.orgSlug
    ) {
      // Still mismatched - redirect to parent to handle the switch
      throw redirect(`/org/${params.orgSlug}`);
    }

    // Use fresh data for subsequent queries
    return clientLoaderWithMe(
      params,
      freshMe as AuthenticatedMeWithOrganization,
    );
  }

  return clientLoaderWithMe(params, me as AuthenticatedMeWithOrganization);
}

async function clientLoaderWithMe(
  params: Params<string>,
  me: AuthenticatedMeWithOrganization,
): Promise<{ space: unknown }> {
  // Validate space exists and belongs to this org
  try {
    const space = await queryClient.ensureQueryData(
      getSpaceBySlugQueryOptions(params.spaceSlug || '', me.organization.id),
    );

    if (!space) {
      // Fetch all spaces to redirect to the first available one
      const spaces = await queryClient.fetchQuery(
        getSpacesQueryOptions(me.organization.id),
      );

      if (spaces && spaces.length > 0) {
        pmToaster.error({
          title: 'Space not found',
          description: `The space '${params.spaceSlug}' does not exist. Redirecting to ${spaces[0].name}.`,
        });
        throw redirect(`/org/${params.orgSlug}/space/${spaces[0].slug}`);
      } else {
        // No spaces at all - this shouldn't happen
        pmToaster.error({
          title: 'No spaces available',
          description: 'Please contact support.',
        });
        throw redirect(`/org/${params.orgSlug}`);
      }
    }

    // Prefetch standards list for this space to warm cache for child routes
    // This runs in parallel and doesn't block the loader
    queryClient.prefetchQuery(
      getStandardsBySpaceQueryOptions(space.id, me.organization.id),
    );

    return { space };
  } catch (error) {
    // If space not found, redirect to first available space
    if (error instanceof Response) {
      throw error; // Re-throw redirect responses
    }

    try {
      const spaces = await queryClient.fetchQuery(
        getSpacesQueryOptions(me.organization.id),
      );

      if (spaces && spaces.length > 0) {
        pmToaster.error({
          title: 'Error loading space',
          description: `Redirecting to ${spaces[0].name}.`,
        });
        throw redirect(`/org/${params.orgSlug}/space/${spaces[0].slug}`);
      }
    } catch {
      // Fallback to org page
      pmToaster.error({
        title: 'Error loading spaces',
        description: 'Please try again.',
      });
      throw redirect(`/org/${params.orgSlug}`);
    }

    // If we reach here, redirect to org page as final fallback
    throw redirect(`/org/${params.orgSlug}`);
  }
}

export default function SpaceProtectedLayout() {
  // Just pass through to child routes - space validation is done in loader
  return (
    <>
      <ChangeProposalUpdateSubscription />
      <Outlet />
    </>
  );
}
