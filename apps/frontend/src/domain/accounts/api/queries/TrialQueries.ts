import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StartTrialCommand } from '@packmind/types';
import { trialGateway } from '../gateways';
import { GET_ME_KEY, GET_USER_ORGANIZATIONS_KEY } from '../queryKeys';

const START_TRIAL_MUTATION_KEY = 'startTrial';

export const useStartTrialMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [START_TRIAL_MUTATION_KEY],
    mutationFn: async (request: StartTrialCommand) => {
      return trialGateway.startTrial(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GET_ME_KEY });
      queryClient.invalidateQueries({ queryKey: GET_USER_ORGANIZATIONS_KEY });
    },
    onError: (error) => {
      console.error('Error starting trial:', error);
    },
  });
};
