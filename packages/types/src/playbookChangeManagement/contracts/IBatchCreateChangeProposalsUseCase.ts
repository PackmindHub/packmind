import { IUseCase, PackmindCommand } from '../../UseCase';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ChangeProposalType } from '../ChangeProposalType';
import { SpaceId } from '../../spaces';

export type BatchCreateChangeProposalItem = {
  type: ChangeProposalType;
  artefactId: string;
  payload: unknown;
  captureMode: ChangeProposalCaptureMode;
};

export type BatchCreateChangeProposalsCommand = PackmindCommand & {
  spaceId: SpaceId;
  proposals: BatchCreateChangeProposalItem[];
};

export type BatchCreateChangeProposalsResponse = {
  created: number;
  errors: Array<{ index: number; message: string }>;
};

export type IBatchCreateChangeProposalsUseCase = IUseCase<
  BatchCreateChangeProposalsCommand,
  BatchCreateChangeProposalsResponse
>;
