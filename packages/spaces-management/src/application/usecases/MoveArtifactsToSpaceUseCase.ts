import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
} from '@packmind/node-utils';
import {
  ArtifactReference,
  ArtifactType,
  createOrganizationId,
  createUserId,
  IAccountsPort,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse,
  OrganizationId,
  PackmindEventSource,
  PlaybookArtefactMovedEvent,
  SpaceId,
  UserId,
} from '@packmind/types';
import { SpaceNotFoundError } from '../../domain/errors/SpaceNotFoundError';
import { SpaceOwnershipMismatchError } from '../../domain/errors/SpaceOwnershipMismatchError';

const origin = 'MoveArtifactsToSpaceUseCase';

type MoveContext = {
  sourceSpaceId: SpaceId;
  destinationSpaceId: SpaceId;
  userId: UserId;
  organizationId: OrganizationId;
  source: PackmindEventSource;
};

export class MoveArtifactsToSpaceUseCase extends AbstractMemberUseCase<
  MoveArtifactsToSpaceCommand,
  MoveArtifactsToSpaceResponse
> {
  private readonly artifactMovers: Record<
    ArtifactType,
    (artifact: ArtifactReference, ctx: MoveContext) => Promise<void>
  > = {
    standard: (artifact, ctx) =>
      this.moveStandard(artifact as ArtifactReference<'standard'>, ctx),
    skill: (artifact, ctx) =>
      this.moveSkill(artifact as ArtifactReference<'skill'>, ctx),
    command: (artifact, ctx) =>
      this.moveRecipe(artifact as ArtifactReference<'command'>, ctx),
  };

  constructor(
    accountsPort: IAccountsPort,
    private readonly spacesPort: ISpacesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly recipesPort: IRecipesPort,
    private readonly eventEmitterService: PackmindEventEmitterService,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
  }

  protected async executeForMembers(
    command: MoveArtifactsToSpaceCommand & MemberContext,
  ): Promise<MoveArtifactsToSpaceResponse> {
    const organizationId = createOrganizationId(command.organizationId);
    const userId = createUserId(command.userId);

    const sourceSpace = await this.spacesPort.getSpaceById(
      command.sourceSpaceId,
    );
    if (!sourceSpace) {
      throw new SpaceNotFoundError(command.sourceSpaceId);
    }
    if (sourceSpace.organizationId !== organizationId) {
      throw new SpaceOwnershipMismatchError(
        command.sourceSpaceId,
        organizationId,
      );
    }

    const destinationSpace = await this.spacesPort.getSpaceById(
      command.destinationSpaceId,
    );
    if (!destinationSpace) {
      throw new SpaceNotFoundError(command.destinationSpaceId);
    }
    if (destinationSpace.organizationId !== organizationId) {
      throw new SpaceOwnershipMismatchError(
        command.destinationSpaceId,
        organizationId,
      );
    }

    const ctx: MoveContext = {
      sourceSpaceId: command.sourceSpaceId,
      destinationSpaceId: command.destinationSpaceId,
      userId,
      organizationId,
      source: command.source ?? 'ui',
    };

    let movedCount = 0;
    for (const artifact of command.artifacts) {
      await this.artifactMovers[artifact.type](artifact, ctx);
      movedCount++;
    }

    return { movedCount };
  }

  private async moveStandard(
    artifact: ArtifactReference<'standard'>,
    ctx: MoveContext,
  ): Promise<void> {
    await this.standardsPort.duplicateStandardToSpace(
      artifact.id,
      ctx.destinationSpaceId,
      ctx.userId,
    );
    await this.standardsPort.markStandardAsMoved(
      artifact.id,
      ctx.destinationSpaceId,
    );
    this.emitMovedEvent(artifact.type, ctx);
  }

  private async moveSkill(
    artifact: ArtifactReference<'skill'>,
    ctx: MoveContext,
  ): Promise<void> {
    await this.skillsPort.duplicateSkillToSpace(
      artifact.id,
      ctx.destinationSpaceId,
      ctx.userId,
    );
    await this.skillsPort.markSkillAsMoved(artifact.id, ctx.destinationSpaceId);
    this.emitMovedEvent(artifact.type, ctx);
  }

  private async moveRecipe(
    artifact: ArtifactReference<'command'>,
    ctx: MoveContext,
  ): Promise<void> {
    await this.recipesPort.duplicateRecipeToSpace(
      artifact.id,
      ctx.destinationSpaceId,
      ctx.userId,
    );
    await this.recipesPort.markRecipeAsMoved(
      artifact.id,
      ctx.destinationSpaceId,
    );
    this.emitMovedEvent(artifact.type, ctx);
  }

  private emitMovedEvent(artifactType: ArtifactType, ctx: MoveContext): void {
    this.eventEmitterService.emit(
      new PlaybookArtefactMovedEvent({
        artifactType,
        sourceSpaceId: ctx.sourceSpaceId,
        destinationSpaceId: ctx.destinationSpaceId,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        source: ctx.source,
      }),
    );
  }
}
