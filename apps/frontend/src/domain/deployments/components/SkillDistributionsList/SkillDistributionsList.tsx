import React from 'react';
import { useGetUsersInMyOrganizationQuery } from '../../../accounts/api/queries/UserQueries';
import { useListSkillDistributionsQuery } from '../../api/queries/DeploymentsQueries';
import { SkillId } from '@packmind/types';
import { DeploymentsHistory } from '../DeploymentsHistory/DeploymentsHistory';

interface SkillDistributionsListProps {
  skillId: SkillId;
  orgSlug: string;
  spaceSlug: string;
}

export const SkillDistributionsList: React.FC<SkillDistributionsListProps> = ({
  skillId,
  orgSlug,
  spaceSlug,
}) => {
  const {
    data: distributions,
    isLoading: isLoadingDistributions,
    isError,
    error,
  } = useListSkillDistributionsQuery(skillId);

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
      type="skill"
      entityId={skillId}
      usersMap={buildUserMap(users)}
      loading={isLoadingDistributions || isLoadingUsers}
      error={isError ? error?.message : undefined}
      title="Distributions history"
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
    />
  );
};
