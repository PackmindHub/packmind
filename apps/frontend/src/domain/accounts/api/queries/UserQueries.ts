import { useQuery } from '@tanstack/react-query';
import { userGateway, authGateway } from '../gateways';
import {
  GET_ME_KEY,
  GET_USERS_IN_MY_ORGANIZATION_KEY,
  GET_USER_STATUSES_KEY,
} from '../queryKeys';
import { useAuthContext } from '../../hooks/useAuthContext';

export const getMeQueryOptions = () => ({
  queryKey: GET_ME_KEY,
  queryFn: () => {
    return authGateway.getMe();
  },
  retry: false,
  staleTime: 1000 * 60 * 15, // 15 minutes - user data is very stable
});

export const useGetMeQuery = () => {
  return useQuery(getMeQueryOptions());
};

export const useGetUsersInMyOrganizationQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_USERS_IN_MY_ORGANIZATION_KEY, organization?.id],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch users');
      }
      return userGateway.getUsersInMyOrganization({
        organizationId: organization.id,
      });
    },
    retry: false,
    enabled: !!organization?.id,
  });
};

export const useGetUserStatusesQuery = () => {
  const { organization } = useAuthContext();

  return useQuery({
    queryKey: [...GET_USER_STATUSES_KEY, organization?.id],
    queryFn: () => {
      if (!organization?.id) {
        throw new Error('Organization ID is required to fetch user statuses');
      }
      return userGateway.getUserStatuses({ organizationId: organization.id });
    },
    retry: false,
    enabled: !!organization?.id,
  });
};
