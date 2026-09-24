import { PackmindLogger } from '@packmind/logger';
import {
  AbstractSpaceMemberUseCase,
  SpaceMemberContext,
} from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  IAccountsPort,
  IAddArtefactsToPackageUseCase,
  ICommandsPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
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
      }
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
}
