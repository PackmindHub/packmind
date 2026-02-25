import { PackmindCommand } from '../../UseCase';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ChangeProposalPayload } from '../ChangeProposalPayload';
import { ChangeProposalType } from '../ChangeProposalType';
import { ChangeProposalArtefactId } from '../ChangeProposalArtefactIdType';
import { SpaceId } from '../../spaces';

export type CreateChangeProposalCommand<T extends ChangeProposalType> =
  PackmindCommand & {
    spaceId: SpaceId;
    type: ChangeProposalType;
    artefactId: ChangeProposalArtefactId<T>;
    payload: ChangeProposalPayload<T>;
    captureMode: ChangeProposalCaptureMode;
    message?: string;
  };

export type CreateChangeProposalResponse<T extends ChangeProposalType> = {
  changeProposal: ChangeProposal<T>;
  wasCreated?: boolean;
};

export type ICreateChangeProposalUseCase<T extends ChangeProposalType> = {
  execute: (
    command: CreateChangeProposalCommand<T>,
  ) => Promise<CreateChangeProposalResponse<T>>;
};
