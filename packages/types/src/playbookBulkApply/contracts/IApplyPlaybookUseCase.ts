import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { StandardId } from '../../standards';
import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { TargetId } from '../../deployments';
import { CreationChangeProposalTypes } from '../../playbookChangeManagement/ChangeProposalType';
import {
  NewSkillPayload,
  NewStandardPayload,
  NewCommandPayload,
} from '../../playbookChangeManagement/ChangeProposalPayload';

export type ApplyPlaybookProposalItem = {
  spaceId: SpaceId;
  type: CreationChangeProposalTypes;
  payload: NewSkillPayload | NewStandardPayload | NewCommandPayload;
  targetId: TargetId;
};

export type ApplyPlaybookCommand = PackmindCommand & {
  proposals: ApplyPlaybookProposalItem[];
  message: string;
};

export type ApplyPlaybookResponse =
  | {
      success: true;
      created: {
        standards: StandardId[];
        commands: RecipeId[];
        skills: SkillId[];
      };
    }
  | {
      success: false;
      error: {
        index: number;
        type: CreationChangeProposalTypes;
        message: string;
      };
    };

export type IApplyPlaybookUseCase = IUseCase<
  ApplyPlaybookCommand,
  ApplyPlaybookResponse
>;
