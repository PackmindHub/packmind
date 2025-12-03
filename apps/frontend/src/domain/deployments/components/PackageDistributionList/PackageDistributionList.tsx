import React, { useMemo } from 'react';
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

  const userMap = useMemo(() => {
    if (!users) return {};
    const usersName = users.users.reduce(
      (map, user) => {
        map[user.userId] = user.email;
        return map;
      },
      {} as Record<string, string>,
    );
    usersName['N/A'] = 'Unknown User';
    return usersName;
  }, [users]);

  return (
    <DeploymentsHistory
      deployments={deployments || []}
      type="package"
      entityId={packageId}
      usersMap={userMap}
      loading={isLoadingDeployments || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Distributions"
    />
  );
};
