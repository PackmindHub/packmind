import { IUseCase, PackmindCommand } from '../../UseCase';
import { RecipeId } from '../../recipes/RecipeId';
import { ChangeProposal } from '../ChangeProposal';
import { ChangeProposalCaptureMode } from '../ChangeProposalCaptureMode';
import { ScalarUpdatePayload } from '../ChangeProposalPayload';
import { ChangeProposalType } from '../ChangeProposalType';
import { SpaceId } from '../../spaces';

export type CreateCommandChangeProposalCommand = PackmindCommand & {
  spaceId: SpaceId;
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
