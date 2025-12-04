import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListPackageDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { PackageId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface PackageDistributionListProps {
  packageId: PackageId;
}

export const PackageDistributionList: React.FC<
  PackageDistributionListProps
> = ({ packageId }) => {
  const {
    data: deployments,
    isLoading: isLoadingDeployments,
    isError,
    error,
  } = useListPackageDeploymentsQuery(packageId);

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
      deployments={deployments || []}
      type="package"
      entityId={packageId}
      usersMap={buildUserMap(users)}
      loading={isLoadingDeployments || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Distributions"
      hidePackageColumn
    />
  );
};
