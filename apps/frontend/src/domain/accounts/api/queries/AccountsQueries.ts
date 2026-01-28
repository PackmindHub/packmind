import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationGateway, userGateway } from '../gateways';
import {
  GET_USER_ORGANIZATIONS_KEY,
  GET_USER_STATUSES_KEY,
  GET_ONBOARDING_STATUS_KEY,
  GET_ME_KEY,
} from '../queryKeys';
import { OrganizationId, UserId, UserOrganizationRole } from '@packmind/types';
import { useAuthContext } from '../../hooks/useAuthContext';
import { spacesQueryKeys } from '../../../spaces/api/queryKeys';

const CREATE_ORGANIZATION_MUTATION_KEY = 'createOrganization';
const INVITE_USERS_MUTATION_KEY = 'inviteUsers';
const CHANGE_USER_ROLE_MUTATION_KEY = 'changeUserRole';
const EXCLUDE_USER_MUTATION_KEY = 'excludeUser';
const RENAME_ORGANIZATION_MUTATION_KEY = 'renameOrganization';

export const getUserOrganizationsQueryOptions = () => ({
  queryKey: GET_USER_ORGANIZATIONS_KEY,
  queryFn: () => organizationGateway.getUserOrganizations(),
});

export const useGetUserOrganizationsQuery = () => {
  return useQuery(getUserOrganizationsQueryOptions());
};

export const useCreateOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [CREATE_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (organization: { name: string }) => {
      return organizationGateway.createOrganization(organization);
    },
    onSuccess: async () => {
      // Invalidate user organizations list
      await queryClient.invalidateQueries({
        queryKey: GET_USER_ORGANIZATIONS_KEY,
      });
      // Invalidate spaces cache to fetch the default "Global" space created with the org
      await queryClient.invalidateQueries({
        queryKey: spacesQueryKeys.all,
      });
    },
    onError: (error) => {
      console.error('Error creating organization:', error);
    },
  });
};

export const useInviteUsersMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [INVITE_USERS_MUTATION_KEY],
    mutationFn: async (params: {
      emails: string[];
      role: UserOrganizationRole;
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to invite users');
      }
      const { emails, role } = params;
      return organizationGateway.inviteUsers({
        organizationId: organization.id,
        emails,
        role,
      });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: GET_USER_STATUSES_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: [GET_ONBOARDING_STATUS_KEY],
      });
    },
  });
};

export const useChangeUserRoleMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [CHANGE_USER_ROLE_MUTATION_KEY],
    mutationFn: async (params: {
      targetUserId: UserId;
      newRole: UserOrganizationRole;
    }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to change user role');
      }
      const { targetUserId, newRole } = params;
      return userGateway.changeUserRole({
        organizationId: organization.id,
        targetUserId,
        newRole,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_USER_STATUSES_KEY,
      });
    },
  });
};

export const useExcludeUserMutation = () => {
  const queryClient = useQueryClient();
  const { organization } = useAuthContext();

  return useMutation({
    mutationKey: [EXCLUDE_USER_MUTATION_KEY],
    mutationFn: async (params: { targetUserId: UserId }) => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to remove user');
      }
      const { targetUserId } = params;
      return organizationGateway.removeUser({
        organizationId: organization.id,
        targetUserId,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_USER_STATUSES_KEY,
      });
    },
  });
};

export const useRenameOrganizationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [RENAME_ORGANIZATION_MUTATION_KEY],
    mutationFn: async (params: {
      organizationId: OrganizationId;
      name: string;
    }) => {
      const { organizationId, name } = params;
      return organizationGateway.renameOrganization({
        organizationId,
        name,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: GET_USER_ORGANIZATIONS_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: GET_ME_KEY,
      });
    },
    onError: (error) => {
      console.error('Error renaming organization:', error);
    },
  });
};

export const getOnboardingStatusQueryOptions = (orgId: string) => ({
  queryKey: [GET_ONBOARDING_STATUS_KEY],
  queryFn: () => organizationGateway.getOnboardingStatus(orgId),
});

export const useGetOnboardingStatusQuery = (orgId: string) => {
  return useQuery(getOnboardingStatusQueryOptions(orgId));
};

// Re-export user queries
export { useGetMeQuery } from './UserQueries';
