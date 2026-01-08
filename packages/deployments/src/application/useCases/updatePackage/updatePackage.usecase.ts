import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  UpdatePackageCommand,
  UpdatePackageResponse,
  IAccountsPort,
  IUpdatePackageUseCase,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
  ISkillsPort,
} from '@packmind/types';
import { DeploymentsServices } from '../../services/DeploymentsServices';

const origin = 'UpdatePackageUsecase';

export class UpdatePackageUsecase
  extends AbstractMemberUseCase<UpdatePackageCommand, UpdatePackageResponse>
  implements IUpdatePackageUseCase
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
    this.logger.info('UpdatePackageUsecase initialized');
  }

  async executeForMembers(
    command: UpdatePackageCommand & MemberContext,
  ): Promise<UpdatePackageResponse> {
    const { packageId, name, description, recipeIds, standardIds, skillsIds } =
      command;

    this.logger.info('Updating package', {
      packageId,
      name,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
      skillCount: skillsIds.length,
    });

    // Validate package exists
    const existingPackage = await this.services
      .getPackageService()
      .findById(packageId);
    if (!existingPackage) {
      throw new Error(`Package with id ${packageId} not found`);
    }

    // Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(existingPackage.spaceId);
    if (!space) {
      throw new Error(`Space with id ${existingPackage.spaceId} not found`);
    }

    if (space.organizationId !== command.organizationId) {
      throw new Error(
        `Package ${packageId} does not belong to organization ${command.organizationId}`,
      );
    }

    // Validate all recipes belong to the space
    if (recipeIds.length > 0) {
      const recipes = await Promise.all(
        recipeIds.map((recipeId) =>
          this.recipesPort.getRecipeByIdInternal(recipeId),
        ),
      );

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        if (!recipe) {
          throw new Error(`Recipe with id ${recipeIds[i]} not found`);
        }
        if (recipe.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Recipe ${recipeIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Validate all standards belong to the space
    if (standardIds.length > 0) {
      const standards = await Promise.all(
        standardIds.map((standardId) =>
          this.standardsPort.getStandard(standardId),
        ),
      );

      for (let i = 0; i < standards.length; i++) {
        const standard = standards[i];
        if (!standard) {
          throw new Error(`Standard with id ${standardIds[i]} not found`);
        }
        if (standard.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Standard ${standardIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Validate all skills belong to the space
    if (skillsIds.length > 0) {
      const skills = await Promise.all(
        skillsIds.map((skillId) => this.skillsPort.getSkill(skillId)),
      );

      for (let i = 0; i < skills.length; i++) {
        const skill = skills[i];
        if (!skill) {
          throw new Error(`Skill with id ${skillsIds[i]} not found`);
        }
        if (skill.spaceId !== existingPackage.spaceId) {
          throw new Error(
            `Skill ${skillsIds[i]} does not belong to space ${existingPackage.spaceId}`,
          );
        }
      }
    }

    // Update package using the service
    const updatedPackage = await this.services
      .getPackageService()
      .updatePackage(
        packageId,
        name,
        description,
        recipeIds,
        standardIds,
        skillsIds,
      );

    this.logger.info('Package updated successfully', {
      packageId: updatedPackage.id,
      name: updatedPackage.name,
      recipeCount: updatedPackage.recipes?.length ?? 0,
      standardCount: updatedPackage.standards?.length ?? 0,
      skillCount: updatedPackage.skills?.length ?? 0,
    });

    return { package: updatedPackage };
  }
}
