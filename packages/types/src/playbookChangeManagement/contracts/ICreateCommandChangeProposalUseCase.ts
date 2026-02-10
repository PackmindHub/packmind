import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';
import { ChangeProposalType } from '../ChangeProposalType';

export type CreateCommandChangeProposalCommand = PackmindCommand & {
  type: ChangeProposalType;
  artefactId: RecipeId;
  artefactVersion: number;
  payload: ScalarUpdatePayload;
  captureMode: ChangeProposalCaptureMode;
};

export type CreateCommandChangeProposalResponse = {
  changeProposal: ChangeProposal;
};

export type ICreateCommandChangeProposalUseCase = IUseCase<
  CreateCommandChangeProposalCommand,
  CreateCommandChangeProposalResponse
>;
