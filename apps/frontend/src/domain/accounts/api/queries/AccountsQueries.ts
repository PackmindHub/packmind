import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationGateway } from '../gateways';
import { GET_USER_STATUSES_QUERY_KEY } from './UserQueries';
import { UserOrganizationRole } from '@packmind/shared';

const CREATE_ORGANIZATION_MUTATION_KEY = 'createOrganization';
const INVITE_USERS_MUTATION_KEY = 'inviteUsers';

export const useCreateOrganizationMutation = () => {
  return useMutation({
    mutationKey: [CREATE_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (organization: { name: string }) => {
      return organizationGateway.createOrganization(organization);
    },
    onSuccess: (data) => {
      console.log('Organization created successfully:', data);
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
    },
  });
};

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
