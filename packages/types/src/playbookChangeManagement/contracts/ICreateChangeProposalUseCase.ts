import { PackmindCommand } from '../../UseCase';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ChangeProposalPayload } from '../ChangeProposalPayload';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalArtefactId } from '../ChangeProposalArtefactIdType';

export type CreateChangeProposalCommand<T extends ChangeProposalType> =
  PackmindCommand & {
    type: ChangeProposalType;
    artefactId: ChangeProposalArtefactId<T>;
    payload: ChangeProposalPayload<T>;
    captureMode: ChangeProposalCaptureMode;
  };

export type CreateChangeProposalResponse<T extends ChangeProposalType> = {
  changeProposal: ChangeProposal<T>;
};

export type ICreateChangeProposalUseCase<T extends ChangeProposalType> = {
  execute: (
    command: CreateChangeProposalCommand<T>,
  ) => Promise<CreateChangeProposalResponse<T>>;
};
