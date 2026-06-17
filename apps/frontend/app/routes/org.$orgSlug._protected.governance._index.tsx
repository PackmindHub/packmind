import { redirect, type LoaderFunctionArgs } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  GOVERNANCE_FEATURE_KEY,
  isFeatureFlagEnabled,
} from '@packmind/ui';
import { queryClient } from '../../src/shared/data/queryClient';
import { getListDriftedPackagesByOrgOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { getSpacesQueryOptions } from '../../src/domain/spaces/api/queries/SpacesQueries';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { GovernancePage } from '../../src/domain/deployments/components/governance/GovernancePage';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);

  const hasGovernanceAccess = isFeatureFlagEnabled({
    featureKeys: [GOVERNANCE_FEATURE_KEY],
    featureDomainMap: DEFAULT_FEATURE_DOMAIN_MAP,
    userEmail: me.user.email,
  });

  if (!hasGovernanceAccess) {
    const spaces = await queryClient.ensureQueryData(
      getSpacesQueryOptions(me.organization.id),
    );
    const defaultSpace = spaces?.find((s) => s.isDefaultSpace) || spaces?.[0];

    if (defaultSpace) {
      throw redirect(`/org/${params.orgSlug}/space/${defaultSpace.slug}`);
    }
    throw redirect(`/org/${params.orgSlug}/settings`);
  }

  await queryClient.ensureQueryData(
    getListDriftedPackagesByOrgOptions(me.organization.id),
  );
  return null;
}

export default function GovernanceRouteModule() {
  return <GovernancePage />;
}
