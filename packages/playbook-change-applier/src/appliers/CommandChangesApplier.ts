import {
  CommandChangeProposalApplier,
  ICommandsPort,
  OrganizationId,
  CommandId,
  CommandVersion,
  SpaceId,
  UserId,
} from '@packmind/types';
import { IChangesProposalApplier } from './IChangesProposalApplier';

export class CommandChangesApplier
  extends CommandChangeProposalApplier
  implements IChangesProposalApplier<CommandVersion>
{
  constructor(
    diffService: ConstructorParameters<typeof CommandChangeProposalApplier>[0],
    private readonly commandsPort: ICommandsPort,
  ) {
    super(diffService);
  }

  async getVersion(artefactId: string): Promise<CommandVersion> {
    const recipeId = artefactId as CommandId;
    const recipe = await this.commandsPort.getCommandByIdInternal(recipeId);
    if (!recipe) {
      throw new Error(`Recipe not found for ${artefactId}`);
    }
    const version = await this.commandsPort.getCommandVersion(
      recipe.id,
      recipe.version,
      [recipe.spaceId],
    );
    if (!version) {
      throw new Error(`Recipe version not found for ${artefactId}`);
    }
    return version;
  }

  async saveNewVersion(
    version: CommandVersion,
    userId: UserId,
    spaceId: SpaceId,
    organizationId: OrganizationId,
  ): Promise<CommandVersion> {
    const result = await this.commandsPort.updateCommandFromUI({
      recipeId: version.recipeId,
      name: version.name,
      content: version.content,
      userId,
      spaceId,
      organizationId,
    });
    const newVersion = await this.commandsPort.getCommandVersion(
      result.recipe.id,
      result.recipe.version,
      [result.recipe.spaceId],
    );
    if (!newVersion) {
      throw new Error(
        `Failed to retrieve new version after updating recipe ${version.recipeId}`,
      );
    }
    return newVersion;
  }
}
