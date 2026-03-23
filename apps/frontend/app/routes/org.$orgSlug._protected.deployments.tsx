import { redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getSpacesQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);

  const spaces = await queryClient.ensureQueryData(
    getSpacesQueryOptions(me.organization.id),
  );
  const defaultSpace = spaces?.find((s) => s.isDefaultSpace) || spaces?.[0];

  if (defaultSpace) {
    throw redirect(
      `/org/${params.orgSlug}/space/${defaultSpace.slug}/deployments`,
    );
  }

  throw redirect(`/org/${params.orgSlug}/settings`);
}

export default function OrgDeploymentsRedirect() {
  return null;
}
