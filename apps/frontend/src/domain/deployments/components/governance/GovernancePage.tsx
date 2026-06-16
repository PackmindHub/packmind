import { PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useListDriftedPackagesByOrgQuery } from '../../api/queries/DeploymentsQueries';
import { GovernanceDriftSection } from './GovernanceDriftSection';

export function GovernancePage() {
  const { organization } = useAuthContext();
  const { data, isLoading, isError, refetch } =
    useListDriftedPackagesByOrgQuery();

  return (
    <PMPage
      title="Governance"
      subtitle="Across the spaces of your organization."
    >
      <PMVStack align="stretch" gap={8}>
        <GovernanceDriftSection
          entries={data ?? []}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => {
            refetch();
          }}
          orgSlug={organization?.slug ?? ''}
        />
      </PMVStack>
    </PMPage>
  );
}
