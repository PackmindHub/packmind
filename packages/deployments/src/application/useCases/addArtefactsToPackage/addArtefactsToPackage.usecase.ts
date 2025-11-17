import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  AddArtefactsToPackageCommand,
  AddArtefactsToPackageResponse,
  IAccountsPort,
  IAddArtefactsToPackageUseCase,
  IRecipesPort,
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
    logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    super(accountsPort, logger);
    this.logger.info('AddArtefactsToPackageUsecase initialized');
  }

  async executeForMembers(
    command: AddArtefactsToPackageCommand & MemberContext,
  ): Promise<AddArtefactsToPackageResponse> {
    const { packageId, recipeIds = [], standardIds = [] } = command;

    this.logger.info('Adding artefacts to package', {
      packageId,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
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

    // Get current recipes and standards to filter out duplicates
    const currentRecipeIds = existingPackage.recipes || [];
    const currentStandardIds = existingPackage.standards || [];

    // Filter out recipes that are already in the package
    const newRecipeIds = recipeIds.filter(
      (recipeId) => !currentRecipeIds.includes(recipeId),
    );

    // Filter out standards that are already in the package
    const newStandardIds = standardIds.filter(
      (standardId) => !currentStandardIds.includes(standardId),
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
      totalRecipes: updatedPackage.recipes?.length ?? 0,
      totalStandards: updatedPackage.standards?.length ?? 0,
    });

    return { package: updatedPackage };
  }
}
