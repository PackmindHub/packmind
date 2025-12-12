import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListPackageDeploymentsQuery } from '../../api/queries/DeploymentsQueries';
import { PackageId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';
import { PMEmptyState, PMBox, PMSpinner, PMText } from '@packmind/ui';

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

  const isLoading = isLoadingDeployments || isLoadingUsers;
  const hasDistributions = deployments && deployments.length > 0;

  if (isLoading) {
    return (
      <PMBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="200px"
      >
        <PMSpinner size="lg" mr={2} />
        <PMText ml={2}>Loading distributions...</PMText>
      </PMBox>
    );
  }

  if (!hasDistributions) {
    return (
      <PMEmptyState
        backgroundColor={'background.primary'}
        borderRadius={'md'}
        width={'2xl'}
        mx={'auto'}
        title={'No distributions yet'}
        description="This package has not been distributed."
      />
    );
  }

  return (
    <DeploymentsHistory
      deployments={deployments || []}
      type="package"
      entityId={packageId}
      usersMap={buildUserMap(users)}
      loading={false}
      error={isError ? error?.message : undefined}
      title="Distributions"
      hidePackageColumn
      hideVersionColumn
    />
  );
};
