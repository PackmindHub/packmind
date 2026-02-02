import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authGateway } from '../gateways';
import { GET_ONBOARDING_STATUS_KEY } from '../queryKeys';

const COMPLETE_ONBOARDING_MUTATION_KEY = 'completeOnboarding';

export const getOnboardingStatusQueryOptions = () => ({
  queryKey: GET_ONBOARDING_STATUS_KEY,
  queryFn: () => authGateway.getOnboardingStatus(),
  staleTime: 1000 * 60 * 5, // 5 minutes
});

export const useGetOnboardingStatusQuery = () => {
  return useQuery(getOnboardingStatusQueryOptions());
};

export const useCompleteOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [COMPLETE_ONBOARDING_MUTATION_KEY],
    mutationFn: () => authGateway.completeOnboarding(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_ONBOARDING_STATUS_KEY });
    },
    onError: (error) => {
      console.error('Error completing onboarding:', error);
    },
  });
};
