import { useQuery } from '@tanstack/react-query';
import { userGateway, authGateway } from '../gateways';

const GET_ME_QUERY_KEY = 'getMe';
const GET_USERS_IN_MY_ORGANIZATION_QUERY_KEY = 'getUsersInMyOrganization';

export const getMeQueryOptions = () => ({
  queryKey: [GET_ME_QUERY_KEY],
  queryFn: () => {
    return authGateway.getMe();
  },
  retry: false,
});

export const useGetMeQuery = () => {
  return useQuery(getMeQueryOptions());
};

export const useGetUsersInMyOrganizationQuery = () => {
  return useQuery({
    queryKey: [GET_USERS_IN_MY_ORGANIZATION_QUERY_KEY],
    queryFn: () => {
      return userGateway.getUsersInMyOrganization();
    },
    retry: false,
  });
};
