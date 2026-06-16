import type { LoaderFunctionArgs } from 'react-router';
import { queryClient } from '../../src/shared/data/queryClient';
import { getListDriftedPackagesByOrgOptions } from '../../src/domain/deployments/api/queries/DeploymentsQueries';
import { ensureOrgContext } from '../../src/shared/data/ensureOrgContext';
import { GovernancePage } from '../../src/domain/deployments/components/governance/GovernancePage';

export async function clientLoader({ params }: LoaderFunctionArgs) {
  const me = await ensureOrgContext(params.orgSlug!);
  await queryClient.ensureQueryData(
    getListDriftedPackagesByOrgOptions(me.organization.id),
  );
  return null;
}

export default function GovernanceRouteModule() {
  return <GovernancePage />;
}
