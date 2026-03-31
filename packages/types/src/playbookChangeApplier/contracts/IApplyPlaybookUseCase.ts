import { IUseCase, PackmindCommand } from '../../UseCase';
import { SpaceId } from '../../spaces';
import { StandardId } from '../../standards';
import { RecipeId } from '../../recipes/RecipeId';
import { SkillId } from '../../skills/SkillId';
import { ChangeProposalType } from '../../playbookChangeManagement/ChangeProposalType';
import { ChangeProposalPayload } from '../../playbookChangeManagement/ChangeProposalPayload';
import { TargetId } from '../../deployments';

export type ApplyPlaybookProposalItem = {
  spaceId: SpaceId;
  type: ChangeProposalType;
  artefactId: StandardId | RecipeId | SkillId | null;
  payload: ChangeProposalPayload<ChangeProposalType>;
  targetId?: TargetId;
};

export type ApplyPlaybookCommand = PackmindCommand & {
  proposals: ApplyPlaybookProposalItem[];
  message: string;
};

export type ApplyPlaybookResponse =
  | {
      success: true;
      created: {
        standards: Array<{ id: StandardId; slug: string }>;
        commands: Array<{ id: RecipeId; slug: string }>;
        skills: Array<{ id: SkillId; slug: string }>;
      };
      updated: {
        standards: StandardId[];
        commands: RecipeId[];
        skills: SkillId[];
      };
    }
  | {
      success: false;
      error: {
        index: number;
        type: ChangeProposalType;
        message: string;
      };
    };

export type IApplyPlaybookUseCase = IUseCase<
  ApplyPlaybookCommand,
  ApplyPlaybookResponse
>;
