import { useMutation } from '@tanstack/react-query';
import { ChangeProposalType } from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import { CreateChangeProposalParams } from '../gateways/IChangeProposalsGateway';
import { CREATE_CHANGE_PROPOSAL_MUTATION_KEY } from '../queryKeys';

export const useCreateChangeProposalMutation = () => {
  return useMutation({
    mutationKey: [...CREATE_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async (
      params: CreateChangeProposalParams<ChangeProposalType>,
    ) => {
      return changeProposalsGateway.createChangeProposal(params);
    },
    onError: (error, variables, context) => {
      console.error('Error creating change proposal');
      console.log('error: ', error);
      console.log('variables: ', variables);
      console.log('context: ', context);
    },
  });
};
