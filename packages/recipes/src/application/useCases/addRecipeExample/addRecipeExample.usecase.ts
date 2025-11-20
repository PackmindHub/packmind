import { PackmindLogger } from '@packmind/logger';
import {
  OrganizationId,
  RecipeId,
  RecipeVersion,
} from '@packmind/types';

const origin = 'AddRecipeExampleUsecase';

export class AddRecipeExampleUsecase {
  constructor(
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('AddRecipeExampleUsecase initialized');
  }

  async addRecipeExample(params: {
    recipeId: RecipeId;
    lang: string;
    code: string;
    description: string;
    organizationId: OrganizationId;
    userId: string;
  }): Promise<RecipeVersion> {
    this.logger.error('addRecipeExample not yet implemented', params);
    throw new Error(
      'Recipe code examples infrastructure not yet implemented. This feature will be added in a future update.',
    );
  }
}
