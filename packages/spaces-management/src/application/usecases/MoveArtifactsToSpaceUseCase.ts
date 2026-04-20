import { PackmindLogger } from '@packmind/logger';
import {
  AbstractMemberUseCase,
  MemberContext,
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import {
  ArtifactReference,
  ArtifactType,
  CommandDeletedEvent,
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
  SkillDeletedEvent,
  SpaceId,
  StandardDeletedEvent,
  UserId,
} from '@packmind/types';
import { SpaceNotFoundError } from '@packmind/spaces';
import { ArtifactNameConflictError } from '../../domain/errors/ArtifactNameConflictError';
import { ArtifactNotInSourceSpaceError } from '../../domain/errors/ArtifactNotInSourceSpaceError';
import { ArtifactSlugConflictError } from '../../domain/errors/ArtifactSlugConflictError';
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

    const sourceMembership = await this.spacesPort.findMembership(
      userId,
      command.sourceSpaceId,
    );
    if (!sourceMembership) {
      throw new SpaceMembershipRequiredError(userId, command.sourceSpaceId);
    }

    const destMembership = await this.spacesPort.findMembership(
      userId,
      command.destinationSpaceId,
    );
    if (!destMembership) {
      throw new SpaceMembershipRequiredError(
        userId,
        command.destinationSpaceId,
      );
    }

    await this.validateAndResolveArtifacts(
      command.artifacts,
      command.sourceSpaceId,
      command.destinationSpaceId,
      destinationSpace.name,
      organizationId,
      userId,
    );

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
    const { standard: newStandard, ruleMappings } =
      await this.standardsPort.duplicateStandardToSpace(
        artifact.id,
        ctx.destinationSpaceId,
        ctx.userId,
      );
    await this.standardsPort.markStandardAsMoved(
      artifact.id,
      ctx.destinationSpaceId,
    );
    this.emitMovedEvent(
      artifact.type,
      artifact.id,
      newStandard.id,
      ctx,
      ruleMappings,
    );
    this.eventEmitterService.emit(
      new StandardDeletedEvent({
        standardId: artifact.id,
        spaceId: ctx.sourceSpaceId,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        source: ctx.source,
      }),
    );
  }

  private async moveSkill(
    artifact: ArtifactReference<'skill'>,
    ctx: MoveContext,
  ): Promise<void> {
    const newSkill = await this.skillsPort.duplicateSkillToSpace(
      artifact.id,
      ctx.destinationSpaceId,
      ctx.userId,
    );
    await this.skillsPort.markSkillAsMoved(artifact.id, ctx.destinationSpaceId);
    this.emitMovedEvent(artifact.type, artifact.id, newSkill.id, ctx);
    this.eventEmitterService.emit(
      new SkillDeletedEvent({
        skillId: artifact.id,
        spaceId: ctx.sourceSpaceId,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        source: ctx.source,
      }),
    );
  }

  private async moveRecipe(
    artifact: ArtifactReference<'command'>,
    ctx: MoveContext,
  ): Promise<void> {
    const newRecipe = await this.recipesPort.duplicateRecipeToSpace(
      artifact.id,
      ctx.destinationSpaceId,
      ctx.userId,
    );
    await this.recipesPort.markRecipeAsMoved(
      artifact.id,
      ctx.destinationSpaceId,
    );
    this.emitMovedEvent(artifact.type, artifact.id, newRecipe.id, ctx);
    this.eventEmitterService.emit(
      new CommandDeletedEvent({
        id: artifact.id,
        spaceId: ctx.sourceSpaceId,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        source: ctx.source,
      }),
    );
  }

  private async validateAndResolveArtifacts(
    artifacts: ArtifactReference[],
    sourceSpaceId: SpaceId,
    destinationSpaceId: SpaceId,
    destinationSpaceName: string,
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<void> {
    const standardArtifacts = artifacts.filter((a) => a.type === 'standard');
    const skillArtifacts = artifacts.filter((a) => a.type === 'skill');
    const commandArtifacts = artifacts.filter((a) => a.type === 'command');

    // Phase 1: Fetch all artifacts and validate they belong to the source space
    const resolvedStandards = await Promise.all(
      standardArtifacts.map((a) =>
        this.standardsPort.getStandard((a as ArtifactReference<'standard'>).id),
      ),
    );
    for (let i = 0; i < resolvedStandards.length; i++) {
      const standard = resolvedStandards[i];
      if (!standard || standard.spaceId !== sourceSpaceId) {
        throw new ArtifactNotInSourceSpaceError(
          'standard',
          (standardArtifacts[i] as ArtifactReference<'standard'>).id,
          sourceSpaceId,
        );
      }
    }

    const resolvedSkills = await Promise.all(
      skillArtifacts.map((a) =>
        this.skillsPort.getSkill((a as ArtifactReference<'skill'>).id),
      ),
    );
    for (let i = 0; i < resolvedSkills.length; i++) {
      const skill = resolvedSkills[i];
      if (!skill || skill.spaceId !== sourceSpaceId) {
        throw new ArtifactNotInSourceSpaceError(
          'skill',
          (skillArtifacts[i] as ArtifactReference<'skill'>).id,
          sourceSpaceId,
        );
      }
    }

    const resolvedRecipes = await Promise.all(
      commandArtifacts.map((a) =>
        this.recipesPort.getRecipeByIdInternal(
          (a as ArtifactReference<'command'>).id,
        ),
      ),
    );
    for (let i = 0; i < resolvedRecipes.length; i++) {
      const recipe = resolvedRecipes[i];
      if (!recipe || recipe.spaceId !== sourceSpaceId) {
        throw new ArtifactNotInSourceSpaceError(
          'command',
          (commandArtifacts[i] as ArtifactReference<'command'>).id,
          sourceSpaceId,
        );
      }
    }

    // Phase 2: Check name/slug conflicts against destination
    if (standardArtifacts.length > 0) {
      const destStandards = await this.standardsPort.listStandardsBySpace(
        destinationSpaceId,
        organizationId,
        userId as unknown as string,
      );
      const destSlugs = new Set(destStandards.map((s) => s.slug));
      const destNames = new Set(destStandards.map((s) => s.name));

      for (const standard of resolvedStandards) {
        if (!standard) continue;
        if (destSlugs.has(standard.slug)) {
          throw new ArtifactSlugConflictError(
            'standard',
            standard.slug,
            destinationSpaceName,
          );
        }
        if (destNames.has(standard.name)) {
          throw new ArtifactNameConflictError(
            'standard',
            standard.name,
            destinationSpaceName,
          );
        }
      }
    }

    if (skillArtifacts.length > 0) {
      const destSkills = await this.skillsPort.listSkillsBySpace(
        destinationSpaceId,
        organizationId,
        userId as unknown as string,
      );
      const destSlugs = new Set(destSkills.map((s) => s.slug));
      const destNames = new Set(destSkills.map((s) => s.name));

      for (const skill of resolvedSkills) {
        if (!skill) continue;
        if (destSlugs.has(skill.slug)) {
          throw new ArtifactSlugConflictError(
            'skill',
            skill.slug,
            destinationSpaceName,
          );
        }
        if (destNames.has(skill.name)) {
          throw new ArtifactNameConflictError(
            'skill',
            skill.name,
            destinationSpaceName,
          );
        }
      }
    }

    if (commandArtifacts.length > 0) {
      const destRecipes = await this.recipesPort.listRecipesBySpace({
        spaceId: destinationSpaceId,
        organizationId,
        userId,
      });
      const destSlugs = new Set(destRecipes.map((r) => r.slug));
      const destNames = new Set(destRecipes.map((r) => r.name));

      for (const recipe of resolvedRecipes) {
        if (!recipe) continue;
        if (destSlugs.has(recipe.slug)) {
          throw new ArtifactSlugConflictError(
            'command',
            recipe.slug,
            destinationSpaceName,
          );
        }
        if (destNames.has(recipe.name)) {
          throw new ArtifactNameConflictError(
            'command',
            recipe.name,
            destinationSpaceName,
          );
        }
      }
    }
  }

  private emitMovedEvent(
    artifactType: ArtifactType,
    oldArtifactId: string,
    newArtifactId: string,
    ctx: MoveContext,
    ruleMappings?: Array<{ oldRuleId: string; newRuleId: string }>,
  ): void {
    this.eventEmitterService.emit(
      new PlaybookArtefactMovedEvent({
        artifactType,
        oldArtifactId,
        newArtifactId,
        sourceSpaceId: ctx.sourceSpaceId,
        destinationSpaceId: ctx.destinationSpaceId,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        source: ctx.source,
        ruleMappings,
      }),
    );
  }
}
