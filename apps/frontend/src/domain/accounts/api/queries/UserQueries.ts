import { useQuery, useMutation } from '@tanstack/react-query';
import { userGateway, authGateway } from '../gateways';

const GET_ME_QUERY_KEY = 'getMe';
const GET_USERS_IN_MY_ORGANIZATION_QUERY_KEY = 'getUsersInMyOrganization';
const CHECK_USERNAME_MUTATION_KEY = 'checkUsername';

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

export const useCheckUsernameMutation = () => {
  return useMutation({
    mutationKey: [CHECK_USERNAME_MUTATION_KEY],
    mutationFn: async (username: string) => {
      return userGateway.doesUsernameExist(username);
    },
  });
};
