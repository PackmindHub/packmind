import {
  ChangeProposalCaptureMode,
  ChangeProposalType,
  ScalarUpdatePayload,
} from '@packmind/types';

export type CreateChangeProposalGatewayCommand = {
  spaceId: string;
  type: ChangeProposalType;
  artefactId: string;
  payload: ScalarUpdatePayload;
  captureMode: ChangeProposalCaptureMode;
};

export interface IChangeProposalGateway {
  createChangeProposal(
    command: CreateChangeProposalGatewayCommand,
  ): Promise<void>;
}
