import {
  ChangeProposalCaptureMode,
  ChangeProposalPayload,
  ChangeProposalType,
} from '@packmind/types';

type CreateChangeProposalPayload = {
  type: ChangeProposalType;
  artefactId: string;
  payload: ChangeProposalPayload<ChangeProposalType>;
  captureMode: ChangeProposalCaptureMode;
};

export type CreateChangeProposalGatewayCommand = {
  spaceId: string;
} & CreateChangeProposalPayload;

export type BatchCreateChangeProposalGatewayCommand = {
  spaceId: string;
  proposals: CreateChangeProposalPayload[];
};

export type BatchCreateChangeProposalGatewayResponse = {
  created: number;
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
