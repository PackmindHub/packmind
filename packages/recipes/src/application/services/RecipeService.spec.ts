import {
  RecipeService,
  CreateRecipeData,
  UpdateRecipeData,
} from './RecipeService';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { Recipe, RecipeId, createRecipeId } from '../../domain/entities/Recipe';
import { v4 as uuidv4 } from 'uuid';
import { recipeFactory } from '../../../test/recipeFactory';
import { PackmindLogger } from '@packmind/shared';
import {
  createOrganizationId,
  createUserId,
  UserId,
  OrganizationId,
} from '@packmind/accounts';
import { stubLogger } from '@packmind/shared/test';

describe('RecipeService', () => {
  let recipeService: RecipeService;
  let recipeRepository: IRecipeRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    recipeRepository = {
      add: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByUserId: jest.fn(),
      findByOrganizationAndUser: jest.fn(),
    };

    stubbedLogger = stubLogger();

    recipeService = new RecipeService(recipeRepository, stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addRecipe', () => {
    let recipeData: CreateRecipeData;
    let savedRecipe: Recipe;
    let result: Recipe;

    beforeEach(async () => {
      recipeData = {
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: 'Test content',
        version: 1,
        organizationId: createOrganizationId(uuidv4()),
        userId: createUserId(uuidv4()),
      };

      savedRecipe = {
        id: createRecipeId(uuidv4()),
        ...recipeData,
      };

      recipeRepository.add = jest.fn().mockResolvedValue(savedRecipe);

      result = await recipeService.addRecipe(recipeData);
    });

    it('creates a new recipe with generated ID', () => {
      expect(recipeRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: recipeData.name,
          slug: recipeData.slug,
          content: recipeData.content,
          version: recipeData.version,
        }),
      );
    });

    it('returns the created recipe', () => {
      expect(result).toEqual(savedRecipe);
    });
  });

  describe('getRecipeById', () => {
    describe('when the recipe exists', () => {
      let recipeId: RecipeId;
      let recipe: Recipe;
      let result: Recipe | null;

      beforeEach(async () => {
        recipeId = createRecipeId(uuidv4());
        recipe = recipeFactory({ id: recipeId });

        recipeRepository.findById = jest.fn().mockResolvedValue(recipe);

        result = await recipeService.getRecipeById(recipeId);
      });

      it('calls repository with correct ID', () => {
        expect(recipeRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('returns the found recipe', () => {
        expect(result).toEqual(recipe);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentRecipeId: RecipeId;
      let result: Recipe | null;

      beforeEach(async () => {
        nonExistentRecipeId = createRecipeId(uuidv4());
        recipeRepository.findById = jest.fn().mockResolvedValue(null);

        result = await recipeService.getRecipeById(nonExistentRecipeId);
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('findRecipeBySlug', () => {
    describe('when the recipe exists', () => {
      let slug: string;
      let organizationId: OrganizationId;
      let recipe: Recipe;
      let result: Recipe | null;

      beforeEach(async () => {
        slug = 'test-recipe';
        organizationId = createOrganizationId('org-123');
        recipe = recipeFactory({ slug, organizationId });

        recipeRepository.findBySlug = jest.fn().mockResolvedValue(recipe);

        result = await recipeService.findRecipeBySlug(slug, organizationId);
      });

      it('calls repository with correct slug and organizationId', () => {
        expect(recipeRepository.findBySlug).toHaveBeenCalledWith(
          slug,
          organizationId,
          undefined,
        );
      });

      it('returns the found recipe', () => {
        expect(result).toEqual(recipe);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentSlug: string;
      let organizationId: OrganizationId;
      let result: Recipe | null;

      beforeEach(async () => {
        nonExistentSlug = 'non-existent-recipe';
        organizationId = createOrganizationId('org-123');
        recipeRepository.findBySlug = jest.fn().mockResolvedValue(null);

        result = await recipeService.findRecipeBySlug(
          nonExistentSlug,
          organizationId,
        );
      });

      it('returns null', () => {
        expect(result).toBeNull();
      });
    });
  });

  describe('updateRecipe', () => {
    describe('when the recipe exists', () => {
      let recipeId: RecipeId;
      let existingRecipe: Recipe;
      let updateData: UpdateRecipeData;
      let updatedRecipe: Recipe;
      let result: Recipe;

      beforeEach(async () => {
        recipeId = createRecipeId(uuidv4());
        existingRecipe = recipeFactory({ id: recipeId, version: 1 });

        updateData = {
          name: 'Updated Recipe',
          slug: 'updated-recipe',
          content: 'Updated content',
          version: 2,
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        updatedRecipe = {
          id: recipeId,
          ...updateData,
        };

        recipeRepository.findById = jest.fn().mockResolvedValue(existingRecipe);
        recipeRepository.add = jest.fn().mockResolvedValue(updatedRecipe);

        result = await recipeService.updateRecipe(recipeId, updateData);
      });

      it('checks if the recipe exists', () => {
        expect(recipeRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('updates the recipe with correct data', () => {
        expect(recipeRepository.add).toHaveBeenCalledWith({
          id: recipeId,
          ...updateData,
        });
      });

      it('returns the updated recipe', () => {
        expect(result).toEqual(updatedRecipe);
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentRecipeId: RecipeId;
      let updateData: UpdateRecipeData;

      beforeEach(() => {
        nonExistentRecipeId = createRecipeId(uuidv4());
        updateData = {
          name: 'Non-existent Recipe',
          slug: 'non-existent-recipe',
          content: 'This recipe does not exist',
          version: 1,
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        recipeRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          recipeService.updateRecipe(nonExistentRecipeId, updateData),
        ).rejects.toThrow(`Recipe with id ${nonExistentRecipeId} not found`);
      });
    });
  });

  describe('deleteRecipe', () => {
    let userId: UserId;

    beforeEach(() => {
      userId = createUserId(uuidv4());
    });

    describe('when the recipe exists', () => {
      let recipeId: RecipeId;
      let recipe: Recipe;

      beforeEach(async () => {
        recipeId = createRecipeId(uuidv4());
        recipe = recipeFactory({ id: recipeId });

        recipeRepository.findById = jest.fn().mockResolvedValue(recipe);
        recipeRepository.deleteById = jest.fn().mockResolvedValue(undefined);

        await recipeService.deleteRecipe(recipeId, userId);
      });

      it('checks if the recipe exists', () => {
        expect(recipeRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('deletes the recipe', () => {
        expect(recipeRepository.deleteById).toHaveBeenCalledWith(
          recipeId,
          userId,
        );
      });
    });

    describe('when the recipe does not exist', () => {
      let nonExistentRecipeId: RecipeId;

      beforeEach(() => {
        nonExistentRecipeId = createRecipeId(uuidv4());
        recipeRepository.findById = jest.fn().mockResolvedValue(null);
      });

      it('throws an error with the correct message', async () => {
        await expect(
          recipeService.deleteRecipe(nonExistentRecipeId, userId),
        ).rejects.toThrow(`Recipe with id ${nonExistentRecipeId} not found`);
      });

      it('does not call deleteById', async () => {
        try {
          await recipeService.deleteRecipe(nonExistentRecipeId, userId);
        } catch {
          // Ignore error
        }
        expect(recipeRepository.deleteById).not.toHaveBeenCalled();
      });
    });
  });
});
