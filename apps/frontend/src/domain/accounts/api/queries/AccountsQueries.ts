import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationGateway } from '../gateways';
import { GET_USER_STATUSES_QUERY_KEY } from './UserQueries';
import { UserOrganizationRole } from '@packmind/shared';

const INVITE_USERS_MUTATION_KEY = 'inviteUsers';

export const useInviteUsersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [INVITE_USERS_MUTATION_KEY],
    mutationFn: async (params: {
      orgId: string;
      emails: string[];
      role: UserOrganizationRole;
    }) => {
      const { orgId, emails, role } = params;
      return organizationGateway.inviteUsers(orgId, emails, role);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: [GET_USER_STATUSES_QUERY_KEY],
      });
    },
  });
};

// Re-export user queries
export { useGetMeQuery } from './UserQueries';
