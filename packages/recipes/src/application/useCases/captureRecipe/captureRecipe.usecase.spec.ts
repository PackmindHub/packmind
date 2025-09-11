import { CaptureRecipeUsecase } from './captureRecipe.usecase';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { Recipe, createRecipeId } from '../../../domain/entities/Recipe';
import {
  RecipeVersion,
  createRecipeVersionId,
} from '../../../domain/entities/RecipeVersion';
import { recipeFactory } from '../../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../../test/recipeVersionFactory';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import { PackmindLogger, AiNotConfigured } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import {
  createOrganizationId,
  createUserId,
  OrganizationId,
  UserId,
} from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CaptureRecipeUsecase', () => {
  let captureRecipeUsecase: CaptureRecipeUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let recipeVersionService: jest.Mocked<RecipeVersionService>;
  let recipeSummaryService: jest.Mocked<RecipeSummaryService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    // Mock RecipeService
    recipeService = {
      addRecipe: jest.fn(),

      getRecipeById: jest.fn(),
      findRecipeBySlug: jest.fn(),
      updateRecipe: jest.fn(),
      deleteRecipe: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    // Mock RecipeVersionService
    recipeVersionService = {
      addRecipeVersion: jest.fn(),
      listRecipeVersions: jest.fn(),
      getRecipeVersion: jest.fn(),
      getLatestRecipeVersion: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<RecipeVersionService>;

    // Setup default mock implementations
    mockSlug.mockImplementation((input: string) =>
      input.toLowerCase().replace(/\s+/g, '-'),
    );

    stubbedLogger = stubLogger();

    recipeSummaryService = {
      createRecipeSummary: jest.fn().mockResolvedValue('AI-generated summary'),
    } as unknown as jest.Mocked<RecipeSummaryService>;

    captureRecipeUsecase = new CaptureRecipeUsecase(
      recipeService,
      recipeVersionService,
      recipeSummaryService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('captureRecipe', () => {
    describe('when recipe creation succeeds', () => {
      let inputData: {
        name: string;
        content: string;
        organizationId: OrganizationId;
        userId: UserId;
      };
      let createdRecipe: Recipe;
      let createdRecipeVersion: RecipeVersion;
      let result: Recipe;

      beforeEach(async () => {
        inputData = {
          name: 'Test Recipe',
          content: 'Test recipe content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.content,
          version: 1,
        });

        createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.content,
          version: 1,
          summary: 'AI-generated summary for test recipe',
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        result = await captureRecipeUsecase.execute(inputData);
      });

      it('generates the correct slug from the recipe name', () => {
        expect(mockSlug).toHaveBeenCalledWith(inputData.name);
      });

      it('calls RecipeService.addRecipe with correct parameters', () => {
        expect(recipeService.addRecipe).toHaveBeenCalledWith({
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.content,
          version: 1,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
        });
      });

      it('calls RecipeVersionService.addRecipeVersion with correct parameters', () => {
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.content,
          version: 1,
          summary: 'AI-generated summary',
          gitCommit: undefined,
          userId: inputData.userId, // UI creation has user ID
        });
      });

      it('calls both services exactly once', () => {
        expect(recipeService.addRecipe).toHaveBeenCalledTimes(1);
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledTimes(1);
      });

      it('creates recipe before recipe version', () => {
        const recipeCall = recipeService.addRecipe.mock.invocationCallOrder[0];
        const versionCall =
          recipeVersionService.addRecipeVersion.mock.invocationCallOrder[0];
        expect(recipeCall).toBeLessThan(versionCall);
      });

      it('returns the created recipe', () => {
        expect(result).toEqual(createdRecipe);
      });

      it('includes summary in recipe version', () => {
        expect(createdRecipeVersion.summary).toBeDefined();
        expect(typeof createdRecipeVersion.summary).toBe('string');
      });
    });

    describe('with different recipe names and slug generation', () => {
      it('generates correct slug for recipe with spaces', async () => {
        const inputData = {
          name: 'My Complex Recipe Name',
          content: 'Test content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        const createdRecipe = recipeFactory({
          name: inputData.name,
          slug: 'my-complex-recipe-name',
          content: inputData.content,
        });

        const createdRecipeVersion = recipeVersionFactory({
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(mockSlug).toHaveBeenCalledWith('My Complex Recipe Name');
        expect(recipeService.addRecipe).toHaveBeenCalledWith({
          name: inputData.name,
          content: inputData.content,
          slug: 'my-complex-recipe-name',
          version: 1,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
        });
      });

      it('generates correct slug for recipe with special characters', async () => {
        const inputData = {
          name: 'Recipe with "Special" Characters!',
          content: 'Test content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        mockSlug.mockReturnValue('recipe-with-special-characters');

        const createdRecipe = recipeFactory({
          name: inputData.name,
          slug: 'recipe-with-special-characters',
          content: inputData.content,
        });

        const createdRecipeVersion = recipeVersionFactory({
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(mockSlug).toHaveBeenCalledWith(
          'Recipe with "Special" Characters!',
        );
        expect(recipeService.addRecipe).toHaveBeenCalledWith({
          name: inputData.name,
          content: inputData.content,
          slug: 'recipe-with-special-characters',
          version: 1,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
        });
      });
    });

    describe('when summary generation fails due to missing API key', () => {
      it('logs warning instead of error and proceeds without summary', async () => {
        const inputData = {
          name: 'Test Recipe',
          content: 'Test content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        const createdRecipe: Recipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          content: inputData.content,
        });
        const createdRecipeVersion: RecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockRejectedValue(
          new AiNotConfigured(
            'AI service not configured for recipe summary generation',
          ),
        );
        mockSlug.mockReturnValue('test-recipe');

        const result = await captureRecipeUsecase.execute(inputData);

        expect(result).toEqual(createdRecipe);
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null, // Should be null when API key is missing
          }),
        );
      });
    });

    describe('when summary generation fails for other reasons', () => {
      it('proceeds without summary', async () => {
        const inputData = {
          name: 'Test Recipe',
          content: 'Test content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        const createdRecipe: Recipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          content: inputData.content,
        });
        const createdRecipeVersion: RecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockRejectedValue(
          new Error('Network connection failed'),
        );
        mockSlug.mockReturnValue('test-recipe');

        const result = await captureRecipeUsecase.execute(inputData);

        expect(result).toEqual(createdRecipe);
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: null, // Should be null when generation fails
          }),
        );
      });
    });

    describe('when recipe creation fails', () => {
      it('throws an error', async () => {
        const inputData = {
          name: 'Test Recipe',
          content: 'Test content',
          organizationId: createOrganizationId(uuidv4()),
          userId: createUserId(uuidv4()),
        };

        const error = new Error('Database connection failed');
        recipeService.addRecipe.mockRejectedValue(error);

        await expect(captureRecipeUsecase.execute(inputData)).rejects.toThrow(
          'Database connection failed',
        );
        expect(recipeService.addRecipe).toHaveBeenCalledWith({
          name: inputData.name,
          content: inputData.content,
          slug: 'test-recipe',
          version: 1,
          organizationId: inputData.organizationId,
          userId: inputData.userId,
        });
      });
    });
  });
});
