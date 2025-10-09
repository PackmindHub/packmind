import { useQuery } from '@tanstack/react-query';
import { userGateway, authGateway } from '../gateways';
import {
  GET_ME_KEY,
  GET_USERS_IN_MY_ORGANIZATION_KEY,
  GET_USER_STATUSES_KEY,
} from '../queryKeys';

export const getMeQueryOptions = () => ({
  queryKey: GET_ME_KEY,
  queryFn: () => {
    return authGateway.getMe();
  },
  retry: false,
  staleTime: 1000 * 30,
});

export const useGetMeQuery = () => {
  return useQuery(getMeQueryOptions());
};

export const useGetUsersInMyOrganizationQuery = () => {
  return useQuery({
    queryKey: GET_USERS_IN_MY_ORGANIZATION_KEY,
    queryFn: () => {
      return userGateway.getUsersInMyOrganization({});
    },
    retry: false,
  });
};

export const useGetUserStatusesQuery = () => {
  return useQuery({
    queryKey: GET_USER_STATUSES_KEY,
    queryFn: () => {
      return userGateway.getUserStatuses();
    },
    retry: false,
  });
};
