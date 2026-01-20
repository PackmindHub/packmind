import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createRecipeId,
  createRecipeVersionId,
  createSpaceId,
  createUserId,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { recipeFactory } from '../../../../test/recipeFactory';
import { recipeVersionFactory } from '../../../../test/recipeVersionFactory';
import { RecipeService } from '../../services/RecipeService';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import { CaptureRecipeUsecase } from './captureRecipe.usecase';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CaptureRecipeUsecase', () => {
  let captureRecipeUsecase: CaptureRecipeUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let recipeVersionService: jest.Mocked<RecipeVersionService>;
  let recipeSummaryService: jest.Mocked<RecipeSummaryService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
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

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    // Default: no existing recipes (can be overridden in individual tests)
    recipeService.listRecipesBySpace.mockResolvedValue([]);

    captureRecipeUsecase = new CaptureRecipeUsecase(
      recipeService,
      recipeVersionService,
      recipeSummaryService,
      eventEmitterService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assembleRecipeContent', () => {
    describe('with all sections populated', () => {
      let result: string;

      beforeEach(() => {
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

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );
      });

      it('includes summary', () => {
        expect(result).toContain('Create user authentication flow');
      });

      it('includes WhenToUse section header', () => {
        expect(result).toContain('## When to Use');
      });

      it('includes first WhenToUse item', () => {
        expect(result).toContain('- Adding login functionality');
      });

      it('includes second WhenToUse item', () => {
        expect(result).toContain('- Implementing OAuth');
      });

      it('includes Context Validation Checkpoints section header', () => {
        expect(result).toContain('## Context Validation Checkpoints');
      });

      it('includes first checkpoint', () => {
        expect(result).toContain('* [ ] User model exists');
      });

      it('includes second checkpoint', () => {
        expect(result).toContain('* [ ] Database is configured');
      });

      it('includes Command Steps section header', () => {
        expect(result).toContain('## Command Steps');
      });

      it('includes first step title', () => {
        expect(result).toContain('### Step 1: Setup Dependencies');
      });

      it('includes first step description', () => {
        expect(result).toContain('Install required packages');
      });

      it('includes first step code snippet', () => {
        expect(result).toContain('npm install passport');
      });

      it('includes second step title', () => {
        expect(result).toContain('### Step 2: Configure Routes');
      });

      it('includes second step description', () => {
        expect(result).toContain('Add authentication routes');
      });
    });

    describe('when other sections are empty', () => {
      let result: string;

      beforeEach(() => {
        const summary = 'Simple recipe';
        const whenToUse: string[] = [];
        const contextValidationCheckpoints: string[] = [];
        const steps: {
          name: string;
          description: string;
          codeSnippet?: string;
        }[] = [];

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );
      });

      it('contains only summary', () => {
        expect(result).toBe('Simple recipe');
      });

      it('omits WhenToUse section', () => {
        expect(result).not.toContain('## When to Use');
      });

      it('omits Context Validation Checkpoints section', () => {
        expect(result).not.toContain('## Context Validation Checkpoints');
      });

      it('omits Command Steps section', () => {
        expect(result).not.toContain('## Command Steps');
      });
    });

    describe('with empty WhenToUse section', () => {
      let result: string;

      beforeEach(() => {
        const summary = 'Test recipe';
        const whenToUse: string[] = [];
        const contextValidationCheckpoints = ['Check prerequisites'];
        const steps = [{ name: 'Step One', description: 'Do something' }];

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );
      });

      it('includes summary', () => {
        expect(result).toContain('Test recipe');
      });

      it('omits WhenToUse section', () => {
        expect(result).not.toContain('## When to Use');
      });

      it('includes Context Validation Checkpoints section', () => {
        expect(result).toContain('## Context Validation Checkpoints');
      });

      it('includes Command Steps section', () => {
        expect(result).toContain('## Command Steps');
      });
    });

    describe('with empty Context Validation Checkpoints section', () => {
      let result: string;

      beforeEach(() => {
        const summary = 'Test recipe';
        const whenToUse = ['Scenario one'];
        const contextValidationCheckpoints: string[] = [];
        const steps = [{ name: 'Step One', description: 'Do something' }];

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );
      });

      it('includes summary', () => {
        expect(result).toContain('Test recipe');
      });

      it('includes WhenToUse section', () => {
        expect(result).toContain('## When to Use');
      });

      it('omits Context Validation Checkpoints section', () => {
        expect(result).not.toContain('## Context Validation Checkpoints');
      });

      it('includes Command Steps section', () => {
        expect(result).toContain('## Command Steps');
      });
    });

    describe('with empty Command Steps section', () => {
      let result: string;

      beforeEach(() => {
        const summary = 'Test recipe';
        const whenToUse = ['Scenario one'];
        const contextValidationCheckpoints = ['Check prerequisites'];
        const steps: {
          name: string;
          description: string;
          codeSnippet?: string;
        }[] = [];

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          whenToUse,
          contextValidationCheckpoints,
          steps,
        );
      });

      it('includes summary', () => {
        expect(result).toContain('Test recipe');
      });

      it('includes WhenToUse section', () => {
        expect(result).toContain('## When to Use');
      });

      it('includes Context Validation Checkpoints section', () => {
        expect(result).toContain('## Context Validation Checkpoints');
      });

      it('omits Command Steps section', () => {
        expect(result).not.toContain('## Command Steps');
      });
    });

    describe('with steps without code snippets', () => {
      let result: string;

      beforeEach(() => {
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

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          [],
          [],
          steps,
        );
      });

      it('includes first step title', () => {
        expect(result).toContain('### Step 1: First Step');
      });

      it('includes first step description', () => {
        expect(result).toContain('This is the description');
      });

      it('includes second step title', () => {
        expect(result).toContain('### Step 2: Second Step');
      });

      it('includes second step description', () => {
        expect(result).toContain('Another description');
      });
    });

    describe('with steps containing code snippets', () => {
      let result: string;

      beforeEach(() => {
        const summary = 'Test recipe';
        const steps = [
          {
            name: 'Install Package',
            description: 'Install the required package',
            codeSnippet: '```bash\nnpm install express\n```',
          },
        ];

        result = captureRecipeUsecase.assembleRecipeContent(
          summary,
          [],
          [],
          steps,
        );
      });

      it('includes step title', () => {
        expect(result).toContain('### Step 1: Install Package');
      });

      it('includes step description', () => {
        expect(result).toContain('Install the required package');
      });

      it('includes code snippet', () => {
        expect(result).toContain('```bash\nnpm install express\n```');
      });
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
    });

    describe('with slug conflicts', () => {
      let result: Recipe;
      let createdRecipe: Recipe;

      beforeEach(async () => {
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

        const existingRecipes = [
          recipeFactory({ slug: 'test-recipe' }),
          recipeFactory({ slug: 'test-recipe-1' }),
        ];

        createdRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: inputData.name,
          slug: 'test-recipe-2',
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

        result = await captureRecipeUsecase.execute(inputData);
      });

      it('returns the created recipe', () => {
        expect(result).toEqual(createdRecipe);
      });

      it('appends counter to slug', () => {
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

        expect(recipeSummaryService.createRecipeSummary).toHaveBeenCalledWith(
          expect.any(String), // organizationId
          {
            recipeId: createdRecipe.id,
            name: createdRecipe.name,
            slug: createdRecipe.slug,
            content: createdRecipe.content,
            version: 1,
            userId: createdRecipe.userId,
          },
        );
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

        expect(recipeSummaryService.createRecipeSummary).toHaveBeenCalledWith(
          expect.any(String), // organizationId
          {
            recipeId: createdRecipe.id,
            name: createdRecipe.name,
            slug: createdRecipe.slug,
            content: createdRecipe.content,
            version: 1,
            userId: createdRecipe.userId,
          },
        );
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
