import { useMutation } from '@tanstack/react-query';
import {
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
  ChangeProposalArtefactId,
  OrganizationId,
} from '@packmind/types';
import { changeProposalsGateway } from '../gateways';
import { CREATE_CHANGE_PROPOSAL_MUTATION_KEY } from '../queryKeys';

export const useCreateChangeProposalMutation = () => {
  return useMutation({
    mutationKey: [...CREATE_CHANGE_PROPOSAL_MUTATION_KEY],
    mutationFn: async <T extends ChangeProposalType>(params: {
      organizationId: OrganizationId;
      type: T;
      artefactId: ChangeProposalArtefactId<T>;
      payload: ChangeProposalPayload<T>;
      captureMode: ChangeProposalCaptureMode;
    }) => {
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
