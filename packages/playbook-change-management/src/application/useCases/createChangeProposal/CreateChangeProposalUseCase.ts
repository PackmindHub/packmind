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

    const spaces = await this.spacesPort.listSpacesByOrganization(
      command.organization.id,
    );
    if (spaces.length === 0) {
      throw new Error(
        `No spaces found for organization ${command.organizationId}`,
      );
    }

    const recipe = await this.recipesPort.getRecipeById({
      userId: command.userId,
      organizationId: command.organization.id,
      spaceId: spaces[0].id,
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
