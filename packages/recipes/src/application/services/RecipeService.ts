import { v4 as uuidv4 } from 'uuid';

import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { RecipeRepository } from '../../infra/repositories/RecipeRepository';
import { PackmindLogger } from '@packmind/logger';
import {
  createRecipeId,
  createRecipeVersionId,
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
    private readonly recipeVersionRepository: IRecipeVersionRepository,
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
        movedTo: null,
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

  async listRecipesBySpace(
    spaceId: SpaceId,
    opts?: Pick<QueryOption, 'includeDeleted'>,
  ): Promise<Recipe[]> {
    this.logger.info('Listing recipes by space', {
      spaceId,
      includeDeleted: opts?.includeDeleted ?? false,
    });

    try {
      const recipes = await this.recipeRepository.findBySpaceId(spaceId, opts);
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
        movedTo: existingRecipe.movedTo,
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

  async duplicateRecipeToSpace(
    recipeId: RecipeId,
    destinationSpaceId: SpaceId,
    newUserId: UserId,
  ): Promise<Recipe> {
    this.logger.info('Duplicating recipe to space', {
      recipeId,
      destinationSpaceId,
    });

    try {
      // 1. Read the original recipe
      const original = await this.recipeRepository.findById(recipeId);
      if (!original) {
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      // 2. Create new recipe with fresh ID
      const newRecipeId = createRecipeId(uuidv4());
      const newRecipe: Recipe = {
        id: newRecipeId,
        name: original.name,
        slug: original.slug,
        content: original.content,
        version: original.version,
        gitCommit: original.gitCommit,
        userId: newUserId,
        spaceId: destinationSpaceId,
        movedTo: null,
      };
      const savedRecipe = await this.recipeRepository.add(newRecipe);

      // 3. Read all versions for this recipe
      const versions =
        await this.recipeVersionRepository.findByRecipeId(recipeId);

      for (const version of versions) {
        // 4. Create new version with fresh ID, linked to new recipe
        await this.recipeVersionRepository.add({
          id: createRecipeVersionId(uuidv4()),
          recipeId: newRecipeId,
          name: version.name,
          slug: version.slug,
          content: version.content,
          version: version.version,
          summary: version.summary,
          gitCommit: version.gitCommit,
          userId: version.userId,
        });
      }

      this.logger.info('Recipe duplicated to space successfully', {
        originalRecipeId: recipeId,
        newRecipeId,
        destinationSpaceId,
        versionsCount: versions.length,
      });

      return savedRecipe;
    } catch (error) {
      this.logger.error('Failed to duplicate recipe to space', {
        recipeId,
        destinationSpaceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async markRecipeAsMoved(
    recipeId: RecipeId,
    destinationSpaceId: SpaceId,
  ): Promise<void> {
    this.logger.info('Marking recipe as moved', {
      recipeId,
      destinationSpaceId,
    });

    try {
      const recipe = await this.recipeRepository.findById(recipeId);
      if (!recipe) {
        throw new Error(`Recipe with id ${recipeId} not found`);
      }

      await this.recipeRepository.markAsMoved(recipeId, destinationSpaceId);

      this.logger.info('Recipe marked as moved successfully', {
        recipeId,
        destinationSpaceId,
      });
    } catch (error) {
      this.logger.error('Failed to mark recipe as moved', {
        recipeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
