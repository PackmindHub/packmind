import { PackmindLogger } from '@packmind/logger';
import { AbstractMemberUseCase, MemberContext } from '@packmind/node-utils';
import {
  CreatePackageCommand,
  CreatePackageResponse,
  IAccountsPort,
  IRecipesPort,
  ISpacesPort,
  IStandardsPort,
  Package,
  createPackageId,
  createUserId,
} from '@packmind/types';
import { IDeploymentsRepositories } from '../../../domain/repositories/IDeploymentsRepositories';
import { v4 as uuidv4 } from 'uuid';

export class CreatePackageUsecase extends AbstractMemberUseCase<
  CreatePackageCommand,
  CreatePackageResponse
> {
  constructor(
    accountsPort: IAccountsPort,
    private readonly repositories: IDeploymentsRepositories,
    private readonly spacesPort: ISpacesPort,
    private readonly recipesPort: IRecipesPort,
    private readonly standardsPort: IStandardsPort,
    logger?: PackmindLogger,
  ) {
    super(accountsPort, logger);
  }

  async executeForMembers(
    command: CreatePackageCommand & MemberContext,
  ): Promise<CreatePackageResponse> {
    const { spaceId, name, slug, description, recipeIds, standardIds, userId } =
      command;

    this.logger.info('Creating package', {
      spaceId,
      name,
      slug,
      recipeCount: recipeIds.length,
      standardCount: standardIds.length,
    });

    // Validate space exists and belongs to organization
    const space = await this.spacesPort.getSpaceById(spaceId);
    if (!space) {
      throw new Error(`Space with id ${spaceId} not found`);
    }

    if (space.organizationId !== command.organizationId) {
      throw new Error(
        `Space ${spaceId} does not belong to organization ${command.organizationId}`,
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
        if (recipe.spaceId !== spaceId) {
          throw new Error(
            `Recipe ${recipeIds[i]} does not belong to space ${spaceId}`,
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
        if (standard.spaceId !== spaceId) {
          throw new Error(
            `Standard ${standardIds[i]} does not belong to space ${spaceId}`,
          );
        }
      }
    }

    // Create package
    const newPackage: Package = {
      id: createPackageId(uuidv4()),
      name,
      slug,
      description,
      spaceId,
      createdBy: createUserId(userId),
      recipes: recipeIds,
      standards: standardIds,
    };

    const savedPackage = await this.repositories
      .getPackageRepository()
      .add(newPackage);

    this.logger.info('Package created successfully', {
      packageId: savedPackage.id,
      name: savedPackage.name,
    });

    return { package: savedPackage };
  }
}
