import { CaptureRecipeUsecase } from './captureRecipe.usecase';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { createRecipeId } from '../../../domain/entities/Recipe';
import { createRecipeVersionId } from '../../../domain/entities/RecipeVersion';
import { recipeFactory } from '../../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../../test/recipeVersionFactory';
import { v4 as uuidv4 } from 'uuid';
import slug from 'slug';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { createOrganizationId, createUserId } from '@packmind/accounts';
import { createSpaceId } from '@packmind/spaces';
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
      listRecipesByOrganization: jest.fn(),
      listRecipesBySpace: jest.fn(),
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

    // Default: no existing recipes (can be overridden in individual tests)
    recipeService.listRecipesBySpace.mockResolvedValue([]);

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

  describe('assembleRecipeContent', () => {
    it('assembles content with all sections', () => {
      const summary = 'Create user authentication flow';
      const whenToUse = ['Adding login functionality', 'Implementing OAuth'];
      const contextValidationCheckpoints = [
        'User model exists',
        'Database is configured',
      ];
      const steps = [
        {
          name: 'Setup Dependencies',
          description: 'Install required packages',
          codeSnippet: 'npm install passport',
        },
        {
          name: 'Configure Routes',
          description: 'Add authentication routes',
        },
      ];

      const result = captureRecipeUsecase.assembleRecipeContent(
        summary,
        whenToUse,
        contextValidationCheckpoints,
        steps,
      );

      expect(result).toContain('Create user authentication flow');
      expect(result).toContain('## When to Use');
      expect(result).toContain('- Adding login functionality');
      expect(result).toContain('- Implementing OAuth');
      expect(result).toContain('## Context Validation Checkpoints');
      expect(result).toContain('* [ ] User model exists');
      expect(result).toContain('* [ ] Database is configured');
      expect(result).toContain('## Recipe Steps');
      expect(result).toContain('### Step 1: Setup Dependencies');
      expect(result).toContain('Install required packages');
      expect(result).toContain('npm install passport');
      expect(result).toContain('### Step 2: Configure Routes');
      expect(result).toContain('Add authentication routes');
    });

    describe('when other sections are empty', () => {
      it('assembles content with only summary', () => {
        const summary = 'Simple recipe';
        const whenToUse: string[] = [];
        const contextValidationCheckpoints: string[] = [];
        const steps: {
          name: string;
          description: string;
          codeSnippet?: string;
        }[] = [];

        const result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );

        expect(result).toBe('Simple recipe');
        expect(result).not.toContain('## When to Use');
        expect(result).not.toContain('## Context Validation Checkpoints');
        expect(result).not.toContain('## Recipe Steps');
      });
    });

    describe('when W-hen to Use section is empty', () => {
      it('omits W-hen to Use section', () => {
        const summary = 'Test recipe';
        const whenToUse: string[] = [];
        const contextValidationCheckpoints = ['Check prerequisites'];
        const steps = [{ name: 'Step One', description: 'Do something' }];

        const result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );

        expect(result).toContain('Test recipe');
        expect(result).not.toContain('## When to Use');
        expect(result).toContain('## Context Validation Checkpoints');
        expect(result).toContain('## Recipe Steps');
      });
    });

    describe('when Context Validation Checkpoints section is empty', () => {
      it('omits Context Validation Checkpoints section', () => {
        const summary = 'Test recipe';
        const whenToUse = ['Scenario one'];
        const contextValidationCheckpoints: string[] = [];
        const steps = [{ name: 'Step One', description: 'Do something' }];

        const result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );

        expect(result).toContain('Test recipe');
        expect(result).toContain('## When to Use');
        expect(result).not.toContain('## Context Validation Checkpoints');
        expect(result).toContain('## Recipe Steps');
      });
    });

    describe('when Recipe Steps section is empty', () => {
      it('omits Recipe Steps section', () => {
        const summary = 'Test recipe';
        const whenToUse = ['Scenario one'];
        const contextValidationCheckpoints = ['Check prerequisites'];
        const steps: {
          name: string;
          description: string;
          codeSnippet?: string;
        }[] = [];

        const result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );

        expect(result).toContain('Test recipe');
        expect(result).toContain('## When to Use');
        expect(result).toContain('## Context Validation Checkpoints');
        expect(result).not.toContain('## Recipe Steps');
      });
    });

    it('formats steps without code snippets correctly', () => {
      const summary = 'Test recipe';
      const steps = [
        {
          name: 'First Step',
          description: 'This is the description',
        },
        {
          name: 'Second Step',
          description: 'Another description',
        },
      ];

      const result = captureRecipeUsecase.assembleRecipeContent(
        summary,
        [],
        [],
        steps,
      );

      expect(result).toContain('### Step 1: First Step');
      expect(result).toContain('This is the description');
      expect(result).toContain('### Step 2: Second Step');
      expect(result).toContain('Another description');
    });

    it('formats steps with code snippets correctly', () => {
      const summary = 'Test recipe';
      const steps = [
        {
          name: 'Install Package',
          description: 'Install the required package',
          codeSnippet: '```bash\nnpm install express\n```',
        },
      ];

      const result = captureRecipeUsecase.assembleRecipeContent(
        summary,
        [],
        [],
        steps,
      );

      expect(result).toContain('### Step 1: Install Package');
      expect(result).toContain('Install the required package');
      expect(result).toContain('```bash\nnpm install express\n```');
    });
  });

  describe('execute', () => {
    describe('when summary is provided', () => {
      it('uses provided summary without calling recipeSummaryService', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Provided summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const expectedContent = captureRecipeUsecase.assembleRecipeContent(
          inputData.summary,
          inputData.whenToUse,
          inputData.contextValidationCheckpoints,
          inputData.steps,
        );

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
          summary: inputData.summary,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeSummaryService.createRecipeSummary).not.toHaveBeenCalled();
      });

      it('passes provided summary to RecipeVersionService', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Provided summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.summary,
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.summary,
          version: 1,
          summary: inputData.summary,
          gitCommit: undefined,
          userId: createUserId(inputData.userId),
        });
      });

      it('handles slug conflicts by appending counter', async () => {
        const organizationId = createOrganizationId(uuidv4());
        const userId = createUserId(uuidv4());
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        // Mock existing recipes with conflicting slugs
        const existingRecipes = [
          recipeFactory({ slug: 'test-recipe' }),
          recipeFactory({ slug: 'test-recipe-1' }),
        ];

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe-2', // Should be incremented
          content: inputData.summary,
          version: 1,
          userId,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe-2',
          version: 1,
        });

        recipeService.listRecipesBySpace.mockResolvedValue(existingRecipes);
        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        const result = await captureRecipeUsecase.execute(inputData);

        expect(result).toEqual(createdRecipe);
        expect(recipeService.addRecipe).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'test-recipe-2',
          }),
        );
      });
    });

    describe('when summary is empty', () => {
      it('calls recipeSummaryService to generate summary', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: '',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const generatedSummary = 'AI-generated summary';
        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: '',
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockResolvedValue(
          generatedSummary,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeSummaryService.createRecipeSummary).toHaveBeenCalledWith({
          recipeId: createdRecipe.id,
          name: createdRecipe.name,
          slug: createdRecipe.slug,
          content: createdRecipe.content,
          version: 1,
          userId: createdRecipe.userId,
        });
      });

      it('uses generated summary in RecipeVersionService', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: '',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const generatedSummary = 'AI-generated summary';
        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: '',
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockResolvedValue(
          generatedSummary,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
          recipeId: createdRecipe.id,
          name: inputData.name,
          slug: 'test-recipe',
          content: '',
          version: 1,
          summary: generatedSummary,
          gitCommit: undefined,
          userId: createUserId(inputData.userId),
        });
      });
    });

    describe('when summary is not provided', () => {
      it('calls recipeSummaryService to generate summary', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const generatedSummary = 'AI-generated summary';
        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: '',
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockResolvedValue(
          generatedSummary,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeSummaryService.createRecipeSummary).toHaveBeenCalledWith({
          recipeId: createdRecipe.id,
          name: createdRecipe.name,
          slug: createdRecipe.slug,
          content: createdRecipe.content,
          version: 1,
          userId: createdRecipe.userId,
        });
      });
    });

    describe('when summary generation fails with AiNotConfigured', () => {
      it('logs warning and proceeds with null summary', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: '',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: '',
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );
        recipeSummaryService.createRecipeSummary.mockRejectedValue(
          new Error('AI service not configured'),
        );

        const result = await captureRecipeUsecase.execute(inputData);

        expect(result).toEqual(createdRecipe);
      });

      describe('when AI service fails', () => {
        it('passes null summary to RecipeVersionService', async () => {
          const inputData = {
            name: 'Test Recipe',
            spaceId: createSpaceId(uuidv4()),
            summary: '',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId: uuidv4(),
            userId: uuidv4(),
          };

          const createdRecipe = recipeFactory({
            id: createRecipeId(uuidv4()),
            name: inputData.name,
            slug: 'test-recipe',
            content: '',
            version: 1,
          });

          const createdRecipeVersion = recipeVersionFactory({
            id: createRecipeVersionId(uuidv4()),
            recipeId: createdRecipe.id,
            version: 1,
          });

          recipeService.addRecipe.mockResolvedValue(createdRecipe);
          recipeVersionService.addRecipeVersion.mockResolvedValue(
            createdRecipeVersion,
          );
          recipeSummaryService.createRecipeSummary.mockRejectedValue(
            new Error('AI service not configured'),
          );

          await captureRecipeUsecase.execute(inputData);

          expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
            recipeId: createdRecipe.id,
            name: inputData.name,
            slug: 'test-recipe',
            content: '',
            version: 1,
            summary: null,
            gitCommit: undefined,
            userId: createUserId(inputData.userId),
          });
        });
      });
    });

    describe('when recipe creation succeeds', () => {
      it('generates correct slug from recipe name', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.summary,
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(mockSlug).toHaveBeenCalledWith(inputData.name);
      });

      it('calls RecipeService.addRecipe with correct parameters', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const expectedContent = captureRecipeUsecase.assembleRecipeContent(
          inputData.summary,
          inputData.whenToUse,
          inputData.contextValidationCheckpoints,
          inputData.steps,
        );

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
          userId: createUserId(inputData.userId),
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        expect(recipeService.addRecipe).toHaveBeenCalledWith({
          name: inputData.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
          userId: createUserId(inputData.userId),
          spaceId: inputData.spaceId,
          gitCommit: undefined,
        });
      });

      it('creates recipe before recipe version', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.summary,
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        await captureRecipeUsecase.execute(inputData);

        const recipeCall = recipeService.addRecipe.mock.invocationCallOrder[0];
        const versionCall =
          recipeVersionService.addRecipeVersion.mock.invocationCallOrder[0];
        expect(recipeCall).toBeLessThan(versionCall);
      });

      it('returns the created recipe', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe',
          content: inputData.summary,
          version: 1,
        });

        const createdRecipeVersion = recipeVersionFactory({
          id: createRecipeVersionId(uuidv4()),
          recipeId: createdRecipe.id,
          version: 1,
        });

        recipeService.addRecipe.mockResolvedValue(createdRecipe);
        recipeVersionService.addRecipeVersion.mockResolvedValue(
          createdRecipeVersion,
        );

        const result = await captureRecipeUsecase.execute(inputData);

        expect(result).toEqual(createdRecipe);
      });
    });

    describe('with different recipe names and slug generation', () => {
      it('generates correct slug for recipe with spaces', async () => {
        const inputData = {
          name: 'My Complex Recipe Name',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const expectedContent = captureRecipeUsecase.assembleRecipeContent(
          inputData.summary,
          inputData.whenToUse,
          inputData.contextValidationCheckpoints,
          inputData.steps,
        );

        const createdRecipe = recipeFactory({
          name: inputData.name,
          slug: 'my-complex-recipe-name',
          content: expectedContent,
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
      });

      it('generates correct slug for recipe with special characters', async () => {
        const inputData = {
          name: 'Recipe with "Special" Characters!',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        mockSlug.mockReturnValue('recipe-with-special-characters');

        const expectedContent = captureRecipeUsecase.assembleRecipeContent(
          inputData.summary,
          inputData.whenToUse,
          inputData.contextValidationCheckpoints,
          inputData.steps,
        );

        const createdRecipe = recipeFactory({
          name: inputData.name,
          slug: 'recipe-with-special-characters',
          content: expectedContent,
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
      });
    });

    describe('when recipe creation fails', () => {
      it('throws error', async () => {
        const inputData = {
          name: 'Test Recipe',
          spaceId: createSpaceId(uuidv4()),
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId: uuidv4(),
          userId: uuidv4(),
        };

        const error = new Error('Database connection failed');
        recipeService.addRecipe.mockRejectedValue(error);

        await expect(captureRecipeUsecase.execute(inputData)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });
  });
});
