import { PackmindLogger } from '@packmind/logger';
import {
  PackmindEventEmitterService,
  SpaceMembershipRequiredError,
} from '@packmind/node-utils';
import { stubLogger } from '@packmind/test-utils';
import {
  CaptureCommandCommand,
  CommandCreatedEvent,
  createOrganizationId,
  createCommandId,
  createCommandVersionId,
  createSpaceId,
  createUserId,
  IAccountsPort,
  ISpacesPort,
  Organization,
  OrganizationId,
  Command,
  CommandSlugAlreadyExistsError,
  Space,
  SpaceId,
  SpaceType,
  User,
  UserId,
} from '@packmind/types';
import slug from 'slug';
import { v4 as uuidv4 } from 'uuid';
import { commandFactory } from '../../../../test/commandFactory';
import { commandVersionFactory } from '../../../../test/commandVersionFactory';
import { CommandService } from '../../services/CommandService';
import { CommandVersionService } from '../../services/CommandVersionService';
import { CaptureCommandUseCase } from './CaptureCommandUseCase';

// Mock external dependencies
jest.mock('slug');

const mockSlug = slug as jest.MockedFunction<typeof slug>;

describe('CaptureRecipeUseCase', () => {
  let captureCommandUseCase: CaptureCommandUseCase;
  let accountsPort: jest.Mocked<IAccountsPort>;
  let spacesPort: jest.Mocked<ISpacesPort>;
  let commandService: jest.Mocked<CommandService>;
  let commandVersionService: jest.Mocked<CommandVersionService>;
  let eventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    accountsPort = {
      getUserById: jest.fn(),
      getOrganizationById: jest.fn(),
    } as unknown as jest.Mocked<IAccountsPort>;

    spacesPort = {
      getSpaceById: jest.fn(),
      createSpace: jest.fn(),
      listSpacesByOrganization: jest.fn(),
      getSpaceBySlug: jest.fn(),
      findMembership: jest.fn().mockResolvedValue({ role: 'member' }),
    } as jest.Mocked<ISpacesPort>;

    // Mock RecipeService
    commandService = {
      addCommand: jest.fn(),
      listCommandsBySpace: jest.fn(),
      getCommandById: jest.fn(),
      findCommandBySlug: jest.fn(),
      updateRecipe: jest.fn(),
      deleteCommand: jest.fn(),
    } as unknown as jest.Mocked<CommandService>;

    // Mock RecipeVersionService
    commandVersionService = {
      addCommandVersion: jest.fn(),
      listCommandVersions: jest.fn(),
      getCommandVersion: jest.fn(),
      getLatestCommandVersion: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<CommandVersionService>;

    // Setup default mock implementations
    mockSlug.mockImplementation((input: string) =>
      input.toLowerCase().replace(/\s+/g, '-'),
    );

    stubbedLogger = stubLogger();

    eventEmitterService = {
      emit: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    // Default: no existing recipes (can be overridden in individual tests)
    commandService.listCommandsBySpace.mockResolvedValue([]);

    captureCommandUseCase = new CaptureCommandUseCase(
      spacesPort,
      accountsPort,
      commandService,
      commandVersionService,
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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

        result = captureCommandUseCase.assembleCommandContent(
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
    let userId: UserId;
    let organizationId: OrganizationId;
    let spaceId: SpaceId;
    let user: User;
    let organization: Organization;
    let space: Space;

    beforeEach(() => {
      userId = createUserId(uuidv4());
      organizationId = createOrganizationId(uuidv4());
      spaceId = createSpaceId(uuidv4());

      user = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        memberships: [{ organizationId, role: 'member', userId }],
        active: true,
      };
      organization = {
        id: organizationId,
        name: 'Test Org',
        slug: 'test-org',
      };
      space = {
        id: spaceId,
        name: 'Test Space',
        slug: 'test-space',
        organizationId,
        type: SpaceType.open,
        isDefaultSpace: true,
      };

      accountsPort.getUserById.mockResolvedValue(user);
      accountsPort.getOrganizationById.mockResolvedValue(organization);
      spacesPort.getSpaceById.mockResolvedValue(space);
    });

    describe('when summary is provided', () => {
      it('composes provided summary into the recipe content', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Provided summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const expectedContent = captureCommandUseCase.assembleCommandContent(
          command.summary!,
          command.whenToUse!,
          command.contextValidationCheckpoints!,
          command.steps!,
        );

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          name: command.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        expect(commandVersionService.addCommandVersion).toHaveBeenCalledWith({
          recipeId: createdCommand.id,
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
          gitCommit: undefined,
          userId: createUserId(userId),
        });
      });
    });

    describe('with slug conflicts', () => {
      let result: Command;
      let createdCommand: Command;

      beforeEach(async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const existingCommands = [
          commandFactory({ slug: 'test-recipe' }),
          commandFactory({ slug: 'test-recipe-1' }),
        ];

        createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe-2',
          content: command.summary,
          version: 1,
          userId: createUserId(userId),
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          name: command.name,
          slug: 'test-recipe-2',
          version: 1,
        });

        commandService.listCommandsBySpace.mockResolvedValue(existingCommands);
        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        result = await captureCommandUseCase.execute(command);
      });

      it('returns the created recipe', () => {
        expect(result).toEqual(createdCommand);
      });

      it('appends counter to slug', () => {
        expect(commandService.addCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            slug: 'test-recipe-2',
          }),
        );
      });
    });

    describe('when recipe creation succeeds', () => {
      it('generates correct slug from recipe name', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        expect(mockSlug).toHaveBeenCalledWith(command.name);
      });

      it('calls RecipeService.addRecipe with correct parameters', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const expectedContent = captureCommandUseCase.assembleCommandContent(
          command.summary!,
          command.whenToUse!,
          command.contextValidationCheckpoints!,
          command.steps!,
        );

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
          userId: createUserId(userId),
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        expect(commandService.addCommand).toHaveBeenCalledWith({
          name: command.name,
          slug: 'test-recipe',
          content: expectedContent,
          version: 1,
          userId: createUserId(userId),
          spaceId,
          gitCommit: undefined,
        });
      });

      it('creates recipe before recipe version', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        const commandCall =
          commandService.addCommand.mock.invocationCallOrder[0];
        const versionCall =
          commandVersionService.addCommandVersion.mock.invocationCallOrder[0];
        expect(commandCall).toBeLessThan(versionCall);
      });

      it('returns the created recipe', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        const result = await captureCommandUseCase.execute(command);

        expect(result).toEqual(createdCommand);
      });
    });

    describe('with different recipe names and slug generation', () => {
      it('generates correct slug for recipe with spaces', async () => {
        const command: CaptureCommandCommand = {
          name: 'My Complex Recipe Name',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const expectedContent = captureCommandUseCase.assembleCommandContent(
          command.summary!,
          command.whenToUse!,
          command.contextValidationCheckpoints!,
          command.steps!,
        );

        const createdCommand = commandFactory({
          name: command.name,
          slug: 'my-complex-recipe-name',
          content: expectedContent,
        });

        const createdCommandVersion = commandVersionFactory({
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        expect(mockSlug).toHaveBeenCalledWith('My Complex Recipe Name');
      });

      it('generates correct slug for recipe with special characters', async () => {
        const command: CaptureCommandCommand = {
          name: 'Recipe with "Special" Characters!',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        mockSlug.mockReturnValue('recipe-with-special-characters');

        const expectedContent = captureCommandUseCase.assembleCommandContent(
          command.summary!,
          command.whenToUse!,
          command.contextValidationCheckpoints!,
          command.steps!,
        );

        const createdCommand = commandFactory({
          name: command.name,
          slug: 'recipe-with-special-characters',
          content: expectedContent,
        });

        const createdCommandVersion = commandVersionFactory({
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        expect(mockSlug).toHaveBeenCalledWith(
          'Recipe with "Special" Characters!',
        );
      });
    });

    describe('with user-provided slug', () => {
      describe('when slug is valid and unique', () => {
        it('uses the provided slug directly', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'my-custom-slug',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const createdCommand = commandFactory({
            id: createCommandId(uuidv4()),
            name: command.name,
            slug: 'my-custom-slug',
            content: command.summary,
            version: 1,
          });

          const createdCommandVersion = commandVersionFactory({
            id: createCommandVersionId(uuidv4()),
            recipeId: createdCommand.id,
            version: 1,
          });

          commandService.addCommand.mockResolvedValue(createdCommand);
          commandVersionService.addCommandVersion.mockResolvedValue(
            createdCommandVersion,
          );

          await captureCommandUseCase.execute(command);

          expect(commandService.addCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              slug: 'my-custom-slug',
            }),
          );
        });

        it('does not call slug library', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'my-custom-slug',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const createdCommand = commandFactory({
            id: createCommandId(uuidv4()),
            name: command.name,
            slug: 'my-custom-slug',
            content: command.summary,
            version: 1,
          });

          const createdCommandVersion = commandVersionFactory({
            id: createCommandVersionId(uuidv4()),
            recipeId: createdCommand.id,
            version: 1,
          });

          commandService.addCommand.mockResolvedValue(createdCommand);
          commandVersionService.addCommandVersion.mockResolvedValue(
            createdCommandVersion,
          );

          await captureCommandUseCase.execute(command);

          expect(mockSlug).not.toHaveBeenCalled();
        });
      });

      describe('when slug needs sanitization', () => {
        it('sanitizes the slug to lowercase with hyphens', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'My Custom SLUG with spaces!',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const createdCommand = commandFactory({
            id: createCommandId(uuidv4()),
            name: command.name,
            slug: 'my-custom-slug-with-spaces',
            content: command.summary,
            version: 1,
          });

          const createdCommandVersion = commandVersionFactory({
            id: createCommandVersionId(uuidv4()),
            recipeId: createdCommand.id,
            version: 1,
          });

          commandService.addCommand.mockResolvedValue(createdCommand);
          commandVersionService.addCommandVersion.mockResolvedValue(
            createdCommandVersion,
          );

          await captureCommandUseCase.execute(command);

          expect(commandService.addCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              slug: 'my-custom-slug-with-spaces',
            }),
          );
        });
      });

      describe('when slug already exists', () => {
        it('throws RecipeSlugAlreadyExistsError', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'existing-slug',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const existingCommands = [commandFactory({ slug: 'existing-slug' })];
          commandService.listCommandsBySpace.mockResolvedValue(
            existingCommands,
          );

          await expect(captureCommandUseCase.execute(command)).rejects.toThrow(
            CommandSlugAlreadyExistsError,
          );
        });

        it('includes slug in error message', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'existing-slug',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const existingCommands = [commandFactory({ slug: 'existing-slug' })];
          commandService.listCommandsBySpace.mockResolvedValue(
            existingCommands,
          );

          await expect(captureCommandUseCase.execute(command)).rejects.toThrow(
            'A command with slug "existing-slug" already exists in this space',
          );
        });

        it('does not call RecipeService.addRecipe', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: 'existing-slug',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const existingCommands = [commandFactory({ slug: 'existing-slug' })];
          commandService.listCommandsBySpace.mockResolvedValue(
            existingCommands,
          );

          try {
            await captureCommandUseCase.execute(command);
          } catch {
            // Expected to throw
          }

          expect(commandService.addCommand).not.toHaveBeenCalled();
        });
      });

      describe('when slug is empty string', () => {
        beforeEach(async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: '',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const createdCommand = commandFactory({
            id: createCommandId(uuidv4()),
            name: command.name,
            slug: 'test-recipe',
            content: command.summary,
            version: 1,
          });

          const createdCommandVersion = commandVersionFactory({
            id: createCommandVersionId(uuidv4()),
            recipeId: createdCommand.id,
            version: 1,
          });

          commandService.addCommand.mockResolvedValue(createdCommand);
          commandVersionService.addCommandVersion.mockResolvedValue(
            createdCommandVersion,
          );

          await captureCommandUseCase.execute(command);
        });

        it('calls slug library with recipe name', () => {
          expect(mockSlug).toHaveBeenCalledWith('Test Recipe');
        });

        it('saves recipe with generated slug', () => {
          expect(commandService.addCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              slug: 'test-recipe',
            }),
          );
        });
      });

      describe('when slug is whitespace only', () => {
        it('auto-generates slug from name', async () => {
          const command: CaptureCommandCommand = {
            name: 'Test Recipe',
            spaceId,
            slug: '   ',
            summary: 'Test summary',
            whenToUse: [],
            contextValidationCheckpoints: [],
            steps: [],
            organizationId,
            userId,
          };

          const createdCommand = commandFactory({
            id: createCommandId(uuidv4()),
            name: command.name,
            slug: 'test-recipe',
            content: command.summary,
            version: 1,
          });

          const createdCommandVersion = commandVersionFactory({
            id: createCommandVersionId(uuidv4()),
            recipeId: createdCommand.id,
            version: 1,
          });

          commandService.addCommand.mockResolvedValue(createdCommand);
          commandVersionService.addCommandVersion.mockResolvedValue(
            createdCommandVersion,
          );

          await captureCommandUseCase.execute(command);

          expect(mockSlug).toHaveBeenCalledWith('Test Recipe');
        });
      });
    });

    describe('when directUpdate is provided', () => {
      it('includes directUpdate in CommandCreatedEvent payload', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
          directUpdate: true,
        };

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        const emittedEvent = eventEmitterService.emit.mock
          .calls[0][0] as CommandCreatedEvent;
        expect(emittedEvent.payload.directUpdate).toBe(true);
      });
    });

    describe('when directUpdate is not provided', () => {
      it('has undefined directUpdate in CommandCreatedEvent payload', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const createdCommand = commandFactory({
          id: createCommandId(uuidv4()),
          name: command.name,
          slug: 'test-recipe',
          content: command.summary,
          version: 1,
        });

        const createdCommandVersion = commandVersionFactory({
          id: createCommandVersionId(uuidv4()),
          recipeId: createdCommand.id,
          version: 1,
        });

        commandService.addCommand.mockResolvedValue(createdCommand);
        commandVersionService.addCommandVersion.mockResolvedValue(
          createdCommandVersion,
        );

        await captureCommandUseCase.execute(command);

        const emittedEvent = eventEmitterService.emit.mock
          .calls[0][0] as CommandCreatedEvent;
        expect(emittedEvent.payload.directUpdate).toBeUndefined();
      });
    });

    describe('when recipe creation fails', () => {
      it('throws error', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        const error = new Error('Database connection failed');
        commandService.addCommand.mockRejectedValue(error);

        await expect(captureCommandUseCase.execute(command)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when the user is not a member of the space', () => {
      beforeEach(() => {
        spacesPort.findMembership.mockResolvedValue(null);
      });

      it('throws a SpaceMembershipRequiredError', async () => {
        const command: CaptureCommandCommand = {
          name: 'Test Recipe',
          spaceId,
          summary: 'Test summary',
          whenToUse: [],
          contextValidationCheckpoints: [],
          steps: [],
          organizationId,
          userId,
        };

        await expect(captureCommandUseCase.execute(command)).rejects.toThrow(
          SpaceMembershipRequiredError,
        );
      });
    });
  });
});
