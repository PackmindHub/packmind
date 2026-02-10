import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  ChangeProposalType,
  CreateChangeProposalCommand,
  CreateChangeProposalResponse,
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  Recipe,
  RecipeId,
  ScalarUpdatePayload,
  SpaceId,
} from '@packmind/types';
import { ChangeProposalService } from '../../services/ChangeProposalService';
import { ChangeProposalPayloadMismatchError } from '../../errors/ChangeProposalPayloadMismatchError';
import { UnsupportedChangeProposalTypeError } from '../../errors/UnsupportedChangeProposalTypeError';

const origin = 'CreateChangeProposalUseCase';

const SUPPORTED_TYPES: ReadonlySet<ChangeProposalType> = new Set([
  ChangeProposalType.updateCommandName,
  ChangeProposalType.updateCommandDescription,
]);

type SupportedType =
  | ChangeProposalType.updateCommandName
  | ChangeProposalType.updateCommandDescription;

const RECIPE_FIELD_BY_TYPE: Record<SupportedType, (recipe: Recipe) => string> =
  {
    [ChangeProposalType.updateCommandName]: (recipe) => recipe.name,
    [ChangeProposalType.updateCommandDescription]: (recipe) => recipe.content,
  };

export class CreateChangeProposalUseCase extends AbstractMemberUseCase<
  CreateChangeProposalCommand<ChangeProposalType>,
  CreateChangeProposalResponse<ChangeProposalType>
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly spacesPort: ISpacesPort,
    private readonly service: ChangeProposalService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreateChangeProposalCommand<ChangeProposalType> & MemberContext,
  ): Promise<CreateChangeProposalResponse<ChangeProposalType>> {
    if (!SUPPORTED_TYPES.has(command.type)) {
      throw new UnsupportedChangeProposalTypeError(command.type);
    }

    const recipeId = command.artefactId as RecipeId;
    const spaceId = command.spaceId as SpaceId;

    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }
    if (space.organizationId !== command.organization.id) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${command.organization.id}`,
      );
    }

    const recipe = await this.recipesPort.getRecipeById({
      userId: command.userId,
      organizationId: command.organization.id,
      spaceId,
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

    return this.service.createChangeProposal(command, recipe.version);
  }
}
