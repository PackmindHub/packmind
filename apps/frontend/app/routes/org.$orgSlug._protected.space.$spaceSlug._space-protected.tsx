import { Outlet, redirect } from 'react-router';
import { ChangeProposalUpdateSubscription } from '../../src/domain/change-proposals/components/ChangeProposalUpdateSubscription';
import type { LoaderFunctionArgs, Params } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getSpaceBySlugQueryOptions,
  getSpacesQueryOptions,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getStandardsBySpaceQueryOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { pmToaster } from '@packmind/ui';
import { AuthService } from '../../src/services/auth/AuthService';
import { MeResponse } from '../../src/domain/accounts/api/gateways/IAuthGateway';
import { OrganizationId, UserOrganizationRole } from '@packmind/types';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';

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

  // Ensure auth data is loaded and org context matches URL
  // If mismatched, performs the org switch before returning
  const me = await ensureOrgContext(params.orgSlug!);

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
