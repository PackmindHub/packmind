import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  RecipeId,
  SkillId,
  StandardId,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { IChangeProposalValidator } from './IChangeProposalValidator';

type SupportedType =
  | ChangeProposalType.removeStandard
  | ChangeProposalType.removeCommand
  | ChangeProposalType.removeSkill;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set<SupportedType>(
  [
    ChangeProposalType.removeStandard,
    ChangeProposalType.removeCommand,
    ChangeProposalType.removeSkill,
  ],
);

export class RemovalChangeProposalValidator implements IChangeProposalValidator {
  constructor(
    private readonly standardsPort: IStandardsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly skillsPort: ISkillsPort,
  ) {}

  supports(type: ChangeProposalType): boolean {
    return SUPPORTED_TYPES.has(type);
  }

  async validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
    if (command.type === ChangeProposalType.removeStandard) {
      const standardId = command.artefactId as StandardId;
      const standard = await this.standardsPort.getStandard(standardId);
      if (!standard) {
        throw new Error(`Standard ${standardId} not found`);
      }
      return { artefactVersion: standard.version };
    }

    if (command.type === ChangeProposalType.removeCommand) {
      const recipeId = command.artefactId as RecipeId;
      const recipe = await this.recipesPort.getRecipeById({
        userId: command.userId,
        organizationId: command.organization.id,
        spaceId: command.spaceId,
        recipeId,
      });
      if (!recipe) {
        throw new Error(`Recipe ${recipeId} not found`);
      }
      return { artefactVersion: recipe.version };
    }

    if (command.type === ChangeProposalType.removeSkill) {
      const skillId = command.artefactId as SkillId;
      const skill = await this.skillsPort.getSkill(skillId);
      if (!skill) {
        throw new Error(`Skill ${skillId} not found`);
      }
      return { artefactVersion: skill.version };
    }

    throw new Error(`Unsupported removal type: ${command.type}`);
  }
}
