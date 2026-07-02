import { Outlet, redirect } from 'react-router';
import { useEffect } from 'react';
import { ChangeProposalUpdateSubscription } from '@packmind/proprietary/frontend/domain/change-proposals/components/ChangeProposalUpdateSubscription';
import type { LoaderFunctionArgs, Params } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import {
  getSpaceBySlugQueryOptions,
  getSpacesQueryOptions,
} from '../../src/domain/spaces/api/queries/SpacesQueries';
import { getStandardsBySpaceQueryOptions } from '../../src/domain/standards/api/queries/StandardsQueries';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { type AuthenticatedMeWithOrganization } from '../../src/shared/data/ensureOrgContext';
import {
  setFlashToast,
  consumeFlashToast,
} from '../../src/shared/utils/flashToast';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());

  return clientLoaderWithMe(params, me as AuthenticatedMeWithOrganization);
}

async function clientLoaderWithMe(
  params: Params<string>,
  me: AuthenticatedMeWithOrganization,
): Promise<{ space: unknown }> {
  // Fetch user's accessible spaces first — this never reveals private space info
  let userSpaces;
  try {
    userSpaces = await queryClient.ensureQueryData(
      getSpacesQueryOptions(me.organization.id),
    );
  } catch {
    setFlashToast({
      type: 'error',
      title: 'Error loading spaces',
      description: 'Please try again.',
    });
    throw redirect(`/org/${params.orgSlug}`);
  }

  // Check membership using only the user's own space list to avoid leaking
  // whether a space exists. This prevents space enumeration attacks:
  // "not found" and "no access" produce the same response.
  const space = userSpaces.find((s) => s.slug === params.spaceSlug);

  if (!space) {
    if (userSpaces.length > 0) {
      setFlashToast({
        type: 'error',
        title: 'Space not found',
        description: `The space '${params.spaceSlug}' could not be found. Redirecting to ${userSpaces[0].name}.`,
      });
      throw redirect(`/org/${params.orgSlug}/space/${userSpaces[0].slug}`);
    } else {
      setFlashToast({
        type: 'error',
        title: 'No spaces available',
        description:
          'You are not a member of any space. Please contact your administrator.',
      });
      throw redirect(`/org/${params.orgSlug}`);
    }
  }

  // Prefetch full space details and standards list for child routes
  queryClient.prefetchQuery(
    getSpaceBySlugQueryOptions(params.spaceSlug || '', me.organization.id),
  );
  queryClient.prefetchQuery(
    getStandardsBySpaceQueryOptions(space.id, me.organization.id),
  );

  return { space };
}

export default function SpaceProtectedLayout() {
  useEffect(() => {
    consumeFlashToast();
  }, []);

  return (
    <>
      <ChangeProposalUpdateSubscription />
      <Outlet />
    </>
  );
}
