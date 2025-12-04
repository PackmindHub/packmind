import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListStandardDistributionsQuery } from '../../api/queries/DeploymentsQueries';
import { StandardId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

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

  const buildUserMap = (
    data: { users: Array<{ userId: string; email: string }> } | undefined,
  ): Record<string, string> => {
    if (!data) return { 'N/A': 'Unknown User' };
    return {
      'N/A': 'Unknown User',
      ...Object.fromEntries(
        data.users.map((user) => [user.userId, user.email]),
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
    />
  );
};
