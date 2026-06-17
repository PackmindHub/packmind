import { redirect, type LoaderFunctionArgs } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  GOVERNANCE_FEATURE_KEY,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { getSpacesQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { routes } from '../../src/shared/utils/routes';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);

  const hasGovernanceAccess = isFeatureFlagEnabled({
    featureKeys: [GOVERNANCE_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: me.user.email,
  });

  if (hasGovernanceAccess) {
    throw redirect(routes.org.toGovernance(params.orgSlug!));
  }

  const spaces = await queryClient.ensureQueryData(
    getSpacesQueryOptions(me.organization.id),
  );
  const defaultSpace = spaces?.find((s) => s.isDefaultSpace) || spaces?.[0];

  if (defaultSpace) {
    throw redirect(`/org/${params.orgSlug}/space/${defaultSpace.slug}`);
  }
  throw redirect(`/org/${params.orgSlug}/settings`);
}

export default function OrgDeploymentsRedirect() {
  return null;
}
