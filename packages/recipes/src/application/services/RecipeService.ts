import { v4 as uuidv4 } from 'uuid';

import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { RecipeRepository } from '../../infra/repositories/RecipeRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createRecipeId,
  GitCommit,
  OrganizationId,
  QueryOption,
  Recipe,
  RecipeId,
  SpaceId,
  UserId,
} from '@packmind/types';

const origin = 'RecipeService';

export type CreateRecipeData = {
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
  spaceId: SpaceId;
};

export type UpdateRecipeData = {
  name: string;
  slug: string;
  content: string;
  version: number;
  gitCommit?: GitCommit;
  userId: UserId;
};

export class RecipeService {
  constructor(
    private readonly recipeRepository: IRecipeRepository = new RecipeRepository(),
    private readonly logger: PackmindLogger = new PackmindLogger(origin),
  ) {
    this.logger.info('RecipeService initialized');
  }

  async addRecipe(recipeData: CreateRecipeData): Promise<Recipe> {
    this.logger.info('Adding new recipe', {
      name: recipeData.name,
      slug: recipeData.slug,
      spaceId: recipeData.spaceId,
      userId: recipeData.userId,
    });

    try {
      const recipeId = createRecipeId(uuidv4());

      const recipe: Recipe = {
        id: recipeId,
        ...recipeData,
      };

      const savedRecipe = await this.recipeRepository.add(recipe);
      this.logger.info('Recipe added to repository successfully', {
        recipeId,
        name: recipeData.name,
      });

      return savedRecipe;
    } catch (error) {
      this.logger.error('Failed to add recipe', {
        name: recipeData.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRecipesByOrganization(
    organizationId: OrganizationId,
  ): Promise<Recipe[]> {
    this.logger.info('Listing recipes by organization', { organizationId });

    try {
      const recipes =
        await this.recipeRepository.findByOrganizationId(organizationId);
      this.logger.info('Recipes retrieved by organization successfully', {
        organizationId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to list recipes by organization', {
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRecipesBySpace(spaceId: SpaceId): Promise<Recipe[]> {
    this.logger.info('Listing recipes by space', {
      spaceId,
    });

    try {
      const recipes = await this.recipeRepository.findBySpaceId(spaceId);
      this.logger.info('Recipes retrieved by space successfully', {
        spaceId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to list recipes by space', {
        spaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRecipesByUser(userId: UserId): Promise<Recipe[]> {
    this.logger.info('Listing recipes by user', { userId });

    try {
      const recipes = await this.recipeRepository.findByUserId(userId);
      this.logger.info('Recipes retrieved by user successfully', {
        userId,
        count: recipes.length,
      });
      return recipes;
    } catch (error) {
      this.logger.error('Failed to list recipes by user', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRecipesByOrganizationAndUser(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<Recipe[]> {
    this.logger.info('Listing recipes by organization and user', {
      organizationId,
      userId,
    });

    try {
      const recipes = await this.recipeRepository.findByOrganizationAndUser(
        organizationId,
        userId,
      );
      this.logger.info(
        'Recipes retrieved by organization and user successfully',
        {
          organizationId,
          userId,
          count: recipes.length,
        },
      );
      return recipes;
    } catch (error) {
      this.logger.error('Failed to list recipes by organization and user', {
        organizationId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRecipeById(id: RecipeId): Promise<Recipe | null> {
    this.logger.info('Getting recipe by ID', { id });

    try {
      const recipe = await this.recipeRepository.findById(id);
      if (recipe) {
        this.logger.info('Recipe found successfully', {
          id,
          name: recipe.name,
        });
      } else {
        this.logger.warn('Recipe not found', { id });
      }
      return recipe;
    } catch (error) {
      this.logger.error('Failed to get recipe by ID', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findRecipeBySlug(
    slug: string,
    organizationId: OrganizationId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe | null> {
    this.logger.info('Finding recipe by slug and organization', {
      slug,
      organizationId,
    });

    try {
      const recipe = await this.recipeRepository.findBySlug(
        slug,
        organizationId,
        opts,
      );
      if (recipe) {
        this.logger.info('Recipe found by slug and organization successfully', {
          slug,
          organizationId,
          recipeId: recipe.id,
        });
      } else {
        this.logger.warn('Recipe not found by slug and organization', {
          slug,
          organizationId,
        });
      }
      return recipe;
    } catch (error) {
      this.logger.error('Failed to find recipe by slug and organization', {
        slug,
        organizationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateRecipe(
    recipeId: RecipeId,
    recipeData: UpdateRecipeData,
  ): Promise<Recipe> {
    this.logger.info('Updating recipe', {
      recipeId,
      name: recipeData.name,
      userId: recipeData.userId,
    });

    try {
      const existingRecipe = await this.recipeRepository.findById(recipeId);
      if (!existingRecipe) {
        this.logger.error('Recipe not found for update', { recipeId });
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      const updatedRecipe: Recipe = {
        id: recipeId,
        ...recipeData,
        spaceId: existingRecipe.spaceId,
      };

      const savedRecipe = await this.recipeRepository.add(updatedRecipe);
      this.logger.info('Recipe updated in repository successfully', {
        recipeId,
        version: recipeData.version,
      });

      return savedRecipe;
    } catch (error) {
      this.logger.error('Failed to update recipe', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteRecipe(recipeId: RecipeId, userId: UserId): Promise<void> {
    this.logger.info('Deleting recipe and all its versions', { recipeId });

    try {
      const recipe = await this.recipeRepository.findById(recipeId);
      if (!recipe) {
        this.logger.error('Recipe not found for deletion', { recipeId });
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      await this.recipeRepository.deleteById(recipeId, userId);

      this.logger.info('Recipe deleted successfully', {
        recipeId,
      });
    } catch (error) {
      this.logger.error('Failed to delete recipe', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
