import { Outlet, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import {
  getSpaceBySlugQueryOptions,
  getSpacesQueryOptions,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import { pmToaster } from '@packmind/ui';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  // User is already authenticated (checked by parent _protected route)
  const me = await queryClient.fetchQuery(getMeQueryOptions());

  if (!me.organization) {
    throw redirect('/sign-in');
  }

  // Validate space exists and belongs to this org
  try {
    const space = await queryClient.fetchQuery(
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
  }
}

export default function SpaceProtectedLayout() {
  // Just pass through to child routes - space validation is done in loader
  return <Outlet />;
}
