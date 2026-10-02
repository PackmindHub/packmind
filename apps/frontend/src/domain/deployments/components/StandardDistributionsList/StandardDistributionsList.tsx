import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListStandardDistributionsQuery } from '../../api/queries/DeploymentsQueries';
import { StandardId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';
import { useLivePackageIds } from '../../hooks/useLivePackageIds';
import { useLiveTargetIds } from '../../hooks/useLiveTargetIds';

interface StandardDistributionsListProps {
  standardId: StandardId;
  orgSlug: string;
  spaceSlug: string;
}

export const StandardDistributionsList: React.FC<
  StandardDistributionsListProps
> = ({ standardId, orgSlug, spaceSlug }) => {
  const {
    data: distributions,
    isLoading: isLoadingDistributions,
    isError,
    error,
  } = useListStandardDistributionsQuery(standardId);

  const { data: users, isLoading: isLoadingUsers } =
    useGetUsersInMyOrganizationQuery();
  const livePackageIds = useLivePackageIds();
  const liveTargetIds = useLiveTargetIds();

  const buildUserMap = (
    data: { users: Array<{ userId: string; displayName: string }> } | undefined,
  ): Record<string, string> => {
    if (!data) return { 'N/A': 'Unknown User' };
    return {
      'N/A': 'Unknown User',
      ...Object.fromEntries(
        data.users.map((user) => [user.userId, user.displayName]),
      ),
    };
  };

  return (
    <DeploymentsHistory
      deployments={distributions || []}
      type="standard"
      entityId={standardId}
      usersMap={buildUserMap(users)}
      loading={isLoadingDistributions || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Distributions history"
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
      livePackageIds={livePackageIds}
      liveTargetIds={liveTargetIds}
    />
  );
};
