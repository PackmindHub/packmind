import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  IAccountsPort,
  IAddArtefactsToPackageUseCase,
  IRecipesPort,
  ISkillsPort,
  ISpacesPort,
  IStandardsPort,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'AddArtefactsToPackageUsecase';

export class AddArtefactsToPackageUsecase
  extends AbstractMemberUseCase<
    AddArtefactsToPackageCommand,
    AddArtefactsToPackageResponse
  >
  implements IAddArtefactsToPackageUseCase
{
  constructor(
    accountsPort: IAccountsPort,
    private readonly services: DeploymentsServices,
    private readonly spacesPort: ISpacesPort,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    private readonly skillsPort: ISkillsPort,
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('AddArtefactsToPackageUsecase initialized');
  }

  async executeForMembers(
    command: AddArtefactsToPackageCommand & MemberContext,
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

    // Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== command.organizationId) {
      throw new Error(
        `Package ${packageId} does not belong to organization ${command.organizationId}`,
      );
    }

    // Validate package exists
    const existingPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!existingPackage) {
      throw new Error(`Package with id ${packageId} not found`);
    }

    if (existingPackage.spaceId !== spaceId) {
      throw new Error(
        `Package with id ${packageId} does not exist in space ${spaceId}`,
      );
    }

    // Get current artefacts to filter out duplicates
    const currentRecipeIds = existingPackage.recipes || [];
    const currentStandardIds = existingPackage.standards || [];
    const currentSkillIds = existingPackage.skills || [];

    // Filter out artefacts that are already in the package
    const newRecipeIds = recipeIds.filter(
      (recipeId) => !currentRecipeIds.includes(recipeId),
    );
    const skippedRecipeIds = recipeIds.filter((recipeId) =>
      currentRecipeIds.includes(recipeId),
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

    // Validate all new recipes belong to the space
    if (newRecipeIds.length > 0) {
      const recipes = await Promise.all(
        newRecipeIds.map((recipeId) =>
          this.recipesPort.getRecipeByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe) {
          throw new Error(`Recipe with id ${newRecipeIds[i]} not found`);
        }
        if (recipe.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Recipe ${newRecipeIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Validate all new standards belong to the space
    if (newStandardIds.length > 0) {
      const standards = await Promise.all(
        newStandardIds.map((standardId) =>
          this.standardsPort.getStandard(standardId),
        ),
      );

      for (let i = 0; i < standards.length; i++) {
        const standard = standards[i];
        if (!standard) {
          throw new Error(`Standard with id ${newStandardIds[i]} not found`);
        }
        if (standard.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Standard ${newStandardIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Validate all new skills belong to the space
    if (newSkillIds.length > 0) {
      const skills = await Promise.all(
        newSkillIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill) {
          throw new Error(`Skill with id ${newSkillIds[i]} not found`);
        }
        if (skill.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Skill ${newSkillIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Add new artefacts to package
    const packageRepository = this.services
      .getRepositories()
      .getPackageRepository();

    if (newRecipeIds.length > 0) {
      await packageRepository.addRecipes(packageId, newRecipeIds);
    }

    if (newStandardIds.length > 0) {
      await packageRepository.addStandards(packageId, newStandardIds);
    }

    if (newSkillIds.length > 0) {
      await packageRepository.addSkills(packageId, newSkillIds);
    }

    // Fetch updated package
    const updatedPackage = await this.services
      .getPackageService()
      .findById(packageId);

    if (!updatedPackage) {
      throw new Error(`Failed to retrieve updated package ${packageId}`);
    }

    this.logger.info('Artefacts added to package successfully', {
      packageId: updatedPackage.id,
      addedRecipes: newRecipeIds.length,
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
        commands: newRecipeIds,
        skills: newSkillIds,
      },
      skipped: {
        standards: skippedStandardIds,
        commands: skippedRecipeIds,
        skills: skippedSkillIds,
      },
    };
  }
}
