import { PackmindLogger, LogLevel } from '@packmind/logger';
import { OrganizationId } from '@packmind/types';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { RecipesDeployment } from '../../domain/entities/RecipesDeployment';
import {
  IListDeploymentsByRecipe,
  ListDeploymentsByRecipeCommand,
} from '@packmind/types';

export class ListDeploymentsByRecipeUseCase
  implements IListDeploymentsByRecipe
{
  constructor(
    private readonly deploymentsRepository: IRecipesDeploymentRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(
      'ListDeploymentsByRecipeUseCase',
      LogLevel.INFO,
    ),
  ) {
    this.logger.info('ListDeploymentsByRecipeUseCase initialized');
  }

  /**
   * Lists all deployments for a specific recipe in an organization
   * @param command Command containing recipeId and organizationId
   * @returns An array of deployments that include versions of the specified recipe
   */
  public async execute(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<RecipesDeployment[]> {
    this.logger.info('Listing deployments for recipe', {
      recipeId: command.recipeId,
      organizationId: command.organizationId,
    });

    try {
      const deployments = await this.deploymentsRepository.listByRecipeId(
        command.recipeId,
        command.organizationId as OrganizationId,
      );

      this.logger.info('Deployments for recipe listed successfully', {
        recipeId: command.recipeId,
        organizationId: command.organizationId,
        count: deployments.length,
      });

      return deployments;
    } catch (error) {
      this.logger.error('Failed to list deployments for recipe', {
        recipeId: command.recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
