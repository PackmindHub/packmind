import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getMeQueryOptions } from '../../src/domain/accounts/api/queries/UserQueries';
import { getSpacesQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await queryClient.ensureQueryData(getMeQueryOptions());
  if (!me?.organization) throw redirect('/sign-in');

  const spaces = await queryClient.ensureQueryData(
    getSpacesQueryOptions(me.organization.id),
  );
  const defaultSpace = spaces?.find((s) => s.isDefaultSpace) || spaces?.[0];

  if (defaultSpace) {
    throw redirect(`/org/${params.orgSlug}/space/${defaultSpace.slug}`);
  }

  throw redirect(`/org/${params.orgSlug}/settings`);
}

export default function OrgDashboardRedirect() {
  return null;
}
