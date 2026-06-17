import { PMHStack, PMPage, PMVStack } from '@packmind/ui';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useListDriftedPackagesByOrgQuery } from '../../api/queries/DeploymentsQueries';
import { GovernanceDriftSection } from './GovernanceDriftSection';
import { GovernancePlaceholderSection } from './GovernancePlaceholderSection';
import { GovernanceActivitySection } from './activity/GovernanceActivitySection';
import { useGovernanceActivityFeed } from './activity/useGovernanceActivityFeed';

const PRIMARY_COLUMN_MIN_WIDTH = '540px';
const SIDE_COLUMN_MIN_WIDTH = '320px';

export function GovernancePage() {
  const { organization } = useAuthContext();
  const {
    data,
    isLoading: isDriftLoading,
    isError: isDriftError,
    refetch,
  } = useListDriftedPackagesByOrgQuery();
  const activity = useGovernanceActivityFeed();

  return (
    <PMPage title="Governance" isFullWidth>
      <PMHStack align="stretch" gap={8} wrap="wrap" rowGap={8}>
        <PMVStack
          flex="2 1 0"
          minW={PRIMARY_COLUMN_MIN_WIDTH}
          gap={8}
          align="stretch"
        >
          <GovernanceDriftSection
            entries={data ?? []}
            isLoading={isDriftLoading}
            isError={isDriftError}
            onRetry={() => {
              refetch();
            }}
            orgSlug={organization?.slug ?? ''}
          />
          <GovernancePlaceholderSection
            label="Approvals"
            tagline="Review proposed changes before they ship."
          />
          <GovernancePlaceholderSection
            label="Adoption"
            tagline="Track which repos are on the latest version."
          />
        </PMVStack>
        <PMVStack
          flex="1 1 0"
          minW={SIDE_COLUMN_MIN_WIDTH}
          gap={8}
          align="stretch"
        >
          <GovernanceActivitySection
            entries={activity.entries}
            isLoading={activity.isLoading}
            isError={activity.isError}
          />
        </PMVStack>
      </PMHStack>
    </PMPage>
  );
}
