import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  ArtifactType,
  AddArtefactsToPackageResponse,
  IAccountsPort,
  IAddArtefactsToPackageUseCase,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
  PackageId,
  SpaceId,
} from '@packmind/types';
import {
  ArtefactAlreadyInAnotherPackageError,
  ArtefactPlacementConflict,
} from '../../../domain/errors/ArtefactAlreadyInAnotherPackageError';
import { ArtefactNotInSpaceError } from '../../../domain/errors/ArtefactNotInSpaceError';
import { PackageNotFoundError } from '../../../domain/errors/PackageNotFoundError';
import { PackageReloadFailedError } from '../../../domain/errors/PackageReloadFailedError';
import { SpaceNotAccessibleError } from '../../../domain/errors/SpaceNotAccessibleError';
import { DeploymentsServices } from '../../services/DeploymentsServices';
import { SpaceContentNotifier } from '../../services/SpaceContentNotifier';

const origin = 'AddArtefactsToPackageUseCase';

export class AddArtefactsToPackageUseCase
  extends AbstractSpaceMemberUseCase<
    AddArtefactsToPackageCommand,
    AddArtefactsToPackageResponse
  >
  implements IAddArtefactsToPackageUseCase
{
  constructor(
    spacesPort: ISpacesPort,
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly commandsPort: ICommandsPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    private readonly spaceContentNotifier: SpaceContentNotifier,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(spacesPort, accountsPort, logger);
    this.logger.info('AddArtefactsToPackageUseCase initialized');
  }

  async executeForSpaceMembers(
    command: AddArtefactsToPackageCommand & SpaceMemberContext,
  ): Promise<AddArtefactsToPackageResponse> {
    const {
      packageId,
      spaceId,
      recipeIds = [],
      standardIds = [],
      skillIds = [],
    } = command;

    this.logger.info('Adding artefacts to package', {
      packageId,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillIds.length,
    });

    // Missing and belonging-to-another-tenant are one branch on purpose: they
    // have to be indistinguishable from outside, and a single throw is what
    // keeps them that way.
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space || space.organizationId !== command.organizationId) {
      throw new SpaceNotAccessibleError(spaceId, command.organizationId);
    }

    const existingPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!existingPackage || existingPackage.spaceId !== spaceId) {
      throw new PackageNotFoundError(packageId, spaceId);
    }

    const currentCommandIds = existingPackage.recipes || [];
    const currentStandardIds = existingPackage.standards || [];
    const currentSkillIds = existingPackage.skills || [];

    const newCommandIds = recipeIds.filter(
      (recipeId) => !currentCommandIds.includes(recipeId),
    );
    const skippedCommandIds = recipeIds.filter((recipeId) =>
      currentCommandIds.includes(recipeId),
    );

    const newStandardIds = standardIds.filter(
      (standardId) => !currentStandardIds.includes(standardId),
    );
    const skippedStandardIds = standardIds.filter((standardId) =>
      currentStandardIds.includes(standardId),
    );

    const newSkillIds = skillIds.filter(
      (skillId) => !currentSkillIds.includes(skillId),
    );
    const skippedSkillIds = skillIds.filter((skillId) =>
      currentSkillIds.includes(skillId),
    );

    const namesById = new Map<string, { type: ArtifactType; name: string }>();

    if (newCommandIds.length > 0) {
      const recipes = await Promise.all(
        newCommandIds.map((recipeId) =>
          this.commandsPort.getCommandByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe || recipe.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'command',
            newCommandIds[i],
            existingPackage.spaceId,
          );
        }
        namesById.set(recipe.id, { type: 'command', name: recipe.name });
      }
    }

    if (newStandardIds.length > 0) {
      const standards = await Promise.all(
        newStandardIds.map((standardId) =>
          this.standardsPort.getStandard(standardId),
        ),
      );

      for (let i = 0; i < standards.length; i++) {
        const standard = standards[i];
        if (!standard || standard.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'standard',
            newStandardIds[i],
            existingPackage.spaceId,
          );
        }
        namesById.set(standard.id, { type: 'standard', name: standard.name });
      }
    }

    if (newSkillIds.length > 0) {
      const skills = await Promise.all(
        newSkillIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill || skill.spaceId !== existingPackage.spaceId) {
          throw new ArtefactNotInSpaceError(
            'skill',
            newSkillIds[i],
            existingPackage.spaceId,
          );
        }
        namesById.set(skill.id, { type: 'skill', name: skill.name });
      }
    }

    /*
     * The rule the clients could only ever enforce against a snapshot.
     *
     * Every one of them decides what may be added by reading the packages once
     * — the picker offers what no package carries, the CLI checks the list it
     * fetched — and two callers who each read "this belongs to nobody", a second
     * or an afternoon apart, both got a yes. Live updates narrow that window;
     * they cannot close it, and they are not there at all when the connection
     * drops. Read here, between the validation and the write, it is the same
     * question asked of the state actually being written to.
     *
     * It reads the packages after the artefacts are known to be in the space, so
     * a caller naming something they cannot see still hears about that first:
     * which package holds what is not owed to them.
     */
    const conflicts = await this.findConflicts(spaceId, packageId, namesById);

    if (conflicts.length > 0) {
      throw new ArtefactAlreadyInAnotherPackageError(
        conflicts,
        existingPackage.name,
      );
    }

    const packageRepository = this.services
      .getRepositories()
      .getPackageRepository();

    if (newCommandIds.length > 0) {
      await packageRepository.addCommands(packageId, newCommandIds);
    }

    if (newStandardIds.length > 0) {
      await packageRepository.addStandards(packageId, newStandardIds);
    }

    if (newSkillIds.length > 0) {
      await packageRepository.addSkills(packageId, newSkillIds);
    }

    const updatedPackage = await this.services
      .getPackageService()
      .findById(packageId);

    if (!updatedPackage) {
      throw new PackageReloadFailedError(packageId);
    }

    await this.spaceContentNotifier.spaceContentChanged(
      command.organizationId,
      spaceId,
    );

    this.logger.info('Artefacts added to package successfully', {
      packageId: updatedPackage.id,
      addedRecipes: newCommandIds.length,
      addedStandards: newStandardIds.length,
      addedSkills: newSkillIds.length,
      totalRecipes: updatedPackage.recipes?.length ?? 0,
      totalStandards: updatedPackage.standards?.length ?? 0,
      totalSkills: updatedPackage.skills?.length ?? 0,
    });

    return {
      package: updatedPackage,
      added: {
        standards: newStandardIds,
        commands: newCommandIds,
        skills: newSkillIds,
      },
      skipped: {
        standards: skippedStandardIds,
        commands: skippedCommandIds,
        skills: skippedSkillIds,
      },
    };
  }

  /**
   * Which of the artefacts about to be added are held by some other package in
   * the space, named as the caller would recognise them.
   *
   * Scoped to the space because a package lives in one and an artefact has
   * already been shown to live in the same one, so no package outside it can
   * hold either.
   */
  private async findConflicts(
    spaceId: SpaceId,
    packageId: PackageId,
    namesById: Map<string, { type: ArtifactType; name: string }>,
  ): Promise<ArtefactPlacementConflict[]> {
    if (namesById.size === 0) return [];

    const packages = await this.services
      .getPackageService()
      .getPackagesBySpaceId(spaceId);

    const conflicts: ArtefactPlacementConflict[] = [];

    for (const pkg of packages) {
      if (pkg.id === packageId) continue;

      const held = [
        ...(pkg.standards ?? []),
        ...(pkg.recipes ?? []),
        ...(pkg.skills ?? []),
      ].map(String);

      for (const artefactId of held) {
        const artefact = namesById.get(artefactId);
        if (!artefact) continue;

        conflicts.push({
          artefactType: artefact.type,
          artefactId,
          artefactName: artefact.name,
          packageName: pkg.name,
        });
      }
    }

    return conflicts;
  }
}
