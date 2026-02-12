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

export type BatchCreateChangeProposalGatewayCommand = {
  spaceId: string;
  proposals: Array<{
    type: ChangeProposalType;
    artefactId: string;
    payload: ScalarUpdatePayload;
    captureMode: ChangeProposalCaptureMode;
  }>;
};

export type BatchCreateChangeProposalGatewayResponse = {
  created: number;
  skipped: number;
  errors: Array<{ index: number; message: string }>;
};

export interface IChangeProposalGateway {
  createChangeProposal(
    command: CreateChangeProposalGatewayCommand,
  ): Promise<void>;
  batchCreateChangeProposals(
    command: BatchCreateChangeProposalGatewayCommand,
  ): Promise<BatchCreateChangeProposalGatewayResponse>;
}
