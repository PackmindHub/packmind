import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  IRecipesPort,
  Recipe,
  RecipeId,
  ScalarUpdatePayload,
} from '@packmind/types';
import { MemberContext } from '@packmind/node-utils';
import { IChangeProposalValidator } from './IChangeProposalValidator';
import { ChangeProposalPayloadMismatchError } from '../errors/ChangeProposalPayloadMismatchError';

type SupportedType =
  | ChangeProposalType.updateCommandName
  | ChangeProposalType.updateCommandDescription;

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set<SupportedType>(
  [
    ChangeProposalType.updateCommandName,
    ChangeProposalType.updateCommandDescription,
  ],
);

const RECIPE_FIELD_BY_TYPE: Record<SupportedType, (recipe: Recipe) => string> =
  {
    [ChangeProposalType.updateCommandName]: (recipe) => recipe.name,
    [ChangeProposalType.updateCommandDescription]: (recipe) => recipe.content,
  };

export class CommandChangeProposalValidator implements IChangeProposalValidator {
  constructor(private readonly recipesPort: IRecipesPort) {}

  supports(type: ChangeProposalType): boolean {
    return SUPPORTED_TYPES.has(type);
  }

  async validate(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<{ artefactVersion: number }> {
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

    const payload = command.payload as ScalarUpdatePayload;
    const currentValue =
      RECIPE_FIELD_BY_TYPE[command.type as SupportedType](recipe);
    if (payload.oldValue !== currentValue) {
      throw new ChangeProposalPayloadMismatchError(
        command.type,
        payload.oldValue,
        currentValue,
      );
    }

    return { artefactVersion: recipe.version };
  }
}
