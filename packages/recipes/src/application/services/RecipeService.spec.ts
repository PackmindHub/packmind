import { PackmindLogger } from '@packmind/logger';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  createSpaceId,
  createUserId,
  OrganizationId,
  Recipe,
  RecipeId,
  UserId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { recipeFactory } from '../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../test/recipeVersionFactory';
import { IRecipeRepository } from '../../domain/repositories/IRecipeRepository';
import { IRecipeVersionRepository } from '../../domain/repositories/IRecipeVersionRepository';
import {
  CreateRecipeData,
  RecipeService,
  UpdateRecipeData,
} from './RecipeService';

describe('RecipeService', () => {
  let recipeService: RecipeService;
  let recipeRepository: IRecipeRepository;
  let recipeVersionRepository: IRecipeVersionRepository;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    recipeRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByUserId: jest.fn(),
      findBySpaceId: jest.fn(),
      markAsMoved: jest.fn(),
    };

    recipeVersionRepository = {
      add: jest.fn(),
      addMany: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      findByRecipeId: jest.fn(),
      findLatestByRecipeId: jest.fn(),
      findByRecipeIdAndVersion: jest.fn(),
    };

    stubbedLogger = stubLogger();

    recipeService = new RecipeService(
      recipeRepository,
      recipeVersionRepository,
      stubbedLogger,
    );
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
        userId: createUserId(uuidv4()),
        spaceId: createSpaceId(uuidv4()),
      };

      savedRecipe = {
        id: createRecipeId(uuidv4()),
        ...recipeData,
        movedTo: null,
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
        recipe = recipeFactory({ slug });

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
          userId: createUserId(uuidv4()),
        };

        updatedRecipe = {
          id: recipeId,
          ...updateData,
          spaceId: existingRecipe.spaceId,
          movedTo: null,
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
          spaceId: existingRecipe.spaceId,
          movedTo: existingRecipe.movedTo,
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

  describe('markRecipeAsMoved', () => {
    const destinationSpaceId = createSpaceId(uuidv4());

    describe('when the recipe exists', () => {
      let recipeId: RecipeId;
      let recipe: Recipe;

      beforeEach(async () => {
        recipeId = createRecipeId(uuidv4());
        recipe = recipeFactory({ id: recipeId });

        recipeRepository.findById = jest.fn().mockResolvedValue(recipe);
        recipeRepository.markAsMoved = jest.fn().mockResolvedValue(undefined);

        await recipeService.markRecipeAsMoved(recipeId, destinationSpaceId);
      });

      it('checks if the recipe exists', () => {
        expect(recipeRepository.findById).toHaveBeenCalledWith(recipeId);
      });

      it('calls markAsMoved on repository with correct args', () => {
        expect(recipeRepository.markAsMoved).toHaveBeenCalledWith(
          recipeId,
          destinationSpaceId,
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
          recipeService.markRecipeAsMoved(
            nonExistentRecipeId,
            destinationSpaceId,
          ),
        ).rejects.toThrow(`Recipe with id ${nonExistentRecipeId} not found`);
      });
    });
  });

  describe('duplicateRecipeToSpace', () => {
    const destinationSpaceId = createSpaceId(uuidv4());
    const newUserId = createUserId(uuidv4());

    describe('when the recipe exists', () => {
      let recipeId: RecipeId;
      let original: Recipe;
      let savedRecipe: Recipe;
      let version: ReturnType<typeof recipeVersionFactory>;

      beforeEach(() => {
        recipeId = createRecipeId(uuidv4());
        original = recipeFactory({ id: recipeId });

        version = recipeVersionFactory({ recipeId });

        savedRecipe = recipeFactory({
          name: original.name,
          slug: original.slug,
          content: original.content,
          userId: newUserId,
          spaceId: destinationSpaceId,
          movedTo: null,
        });

        recipeRepository.findById = jest.fn().mockResolvedValue(original);
        recipeRepository.add = jest.fn().mockResolvedValue(savedRecipe);
        recipeVersionRepository.findByRecipeId = jest
          .fn()
          .mockResolvedValue([version]);
        recipeVersionRepository.addMany = jest
          .fn()
          .mockResolvedValue([version]);
      });

      it('creates a new recipe in the destination space', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            name: original.name,
            slug: original.slug,
            content: original.content,
            spaceId: destinationSpaceId,
            userId: newUserId,
            movedTo: null,
          }),
        );
      });

      it('copies all versions linked to the new recipe', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeVersionRepository.addMany).toHaveBeenCalledWith([
          expect.objectContaining({
            name: version.name,
            slug: version.slug,
            content: version.content,
            version: version.version,
          }),
        ]);
      });

      it('returns the duplicated recipe', async () => {
        const result = await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedRecipe);
      });

      it('uses the provided newUserId for the duplicated recipe', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: newUserId,
          }),
        );
      });

      it('sets movedTo to null on the duplicated recipe', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({
            movedTo: null,
          }),
        );
      });
    });

    describe('when the recipe has multiple versions', () => {
      let recipeId: RecipeId;
      let original: Recipe;
      let version1: ReturnType<typeof recipeVersionFactory>;
      let version2: ReturnType<typeof recipeVersionFactory>;

      beforeEach(() => {
        recipeId = createRecipeId(uuidv4());
        original = recipeFactory({ id: recipeId });

        version1 = recipeVersionFactory({ recipeId, version: 1 });
        version2 = recipeVersionFactory({ recipeId, version: 2 });

        recipeRepository.findById = jest.fn().mockResolvedValue(original);
        recipeRepository.add = jest.fn().mockResolvedValue(original);
        recipeVersionRepository.findByRecipeId = jest
          .fn()
          .mockResolvedValue([version1, version2]);
        recipeVersionRepository.addMany = jest
          .fn()
          .mockResolvedValue([version1, version2]);
      });

      it('copies all versions in a single bulk call', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeVersionRepository.addMany).toHaveBeenCalledTimes(1);
        expect(recipeVersionRepository.addMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: version1.name }),
            expect.objectContaining({ name: version2.name }),
          ]),
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
          recipeService.duplicateRecipeToSpace(
            nonExistentRecipeId,
            destinationSpaceId,
            newUserId,
          ),
        ).rejects.toThrow(`Recipe with id ${nonExistentRecipeId} not found`);
      });
    });

    describe('when the recipe has no versions', () => {
      let recipeId: RecipeId;
      let original: Recipe;
      let savedRecipe: Recipe;

      beforeEach(() => {
        recipeId = createRecipeId(uuidv4());
        original = recipeFactory({ id: recipeId });
        savedRecipe = recipeFactory({
          name: original.name,
          spaceId: destinationSpaceId,
          userId: newUserId,
          movedTo: null,
        });

        recipeRepository.findById = jest.fn().mockResolvedValue(original);
        recipeRepository.add = jest.fn().mockResolvedValue(savedRecipe);
        recipeVersionRepository.findByRecipeId = jest
          .fn()
          .mockResolvedValue([]);
      });

      it('creates the recipe', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeRepository.add).toHaveBeenCalledTimes(1);
      });

      it('does not create any versions', async () => {
        await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(recipeVersionRepository.addMany).not.toHaveBeenCalled();
      });

      it('returns the duplicated recipe', async () => {
        const result = await recipeService.duplicateRecipeToSpace(
          recipeId,
          destinationSpaceId,
          newUserId,
        );

        expect(result).toEqual(savedRecipe);
      });
    });
  });
});
