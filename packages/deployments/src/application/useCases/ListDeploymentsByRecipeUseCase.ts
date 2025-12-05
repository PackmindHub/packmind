import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  Distribution,
  IListDeploymentsByRecipe,
  ListDeploymentsByRecipeCommand,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';

const origin = 'ListDeploymentsByRecipeUseCase';

export class ListDeploymentsByRecipeUseCase
  implements IListDeploymentsByRecipe
{
  constructor(
    private readonly distributionRepository: IDistributionRepository,
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {}

  /**
   * Lists all distributions for a specific recipe in an organization
   * @param command Command containing recipeId and organizationId
   * @returns An array of distributions that include versions of the specified recipe
   */
  public async execute(
    command: ListDeploymentsByRecipeCommand,
  ): Promise<Distribution[]> {
    this.logger.info('Listing distributions for recipe', {
      recipeId: command.recipeId,
      organizationId: command.organizationId,
    });

    try {
      const distributions = await this.distributionRepository.listByRecipeId(
        command.recipeId,
        command.organizationId as OrganizationId,
      );

      this.logger.info('Distributions for recipe listed successfully', {
        recipeId: command.recipeId,
        organizationId: command.organizationId,
        count: distributions.length,
      });

      return distributions;
    } catch (error) {
      this.logger.error('Failed to list distributions for recipe', {
        recipeId: command.recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
