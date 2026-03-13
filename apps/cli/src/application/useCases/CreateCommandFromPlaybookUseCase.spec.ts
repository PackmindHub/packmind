import { CreateCommandFromPlaybookUseCase } from './CreateCommandFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ICommandsGateway } from '../../domain/repositories/ICommandsGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { createMockSpaceService } from '../../mocks/createMockServices';
import { spaceFactory } from '@packmind/spaces/test';
import { createRecipeId, createSpaceId } from '@packmind/types';
import { recipeFactory } from '@packmind/recipes/test';

describe('CreateCommandFromPlaybookUseCase', () => {
  let useCase: CreateCommandFromPlaybookUseCase;
  let mockSpaceService: jest.Mocked<ISpaceService>;
  let mockCommandsGateway: jest.Mocked<ICommandsGateway>;
  let mockGateway: jest.Mocked<Pick<IPackmindGateway, 'commands'>>;

  beforeEach(() => {
    mockSpaceService = createMockSpaceService();
    mockCommandsGateway = {
      create: jest.fn(),
      list: jest.fn(),
    };
    mockGateway = {
      commands: mockCommandsGateway,
    };
    useCase = new CreateCommandFromPlaybookUseCase(
      mockGateway as unknown as IPackmindGateway,
      mockSpaceService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating a command', () => {
    const playbook = {
      name: 'Test Command',
      summary: 'A test command summary',
      whenToUse: ['When testing', 'When developing'],
      contextValidationCheckpoints: ['Check 1', 'Check 2'],
      steps: [
        { name: 'Step 1', description: 'First step' },
        {
          name: 'Step 2',
          description: 'Second step',
          codeSnippet: 'const x = 1;',
        },
      ],
    };

    beforeEach(async () => {
      mockSpaceService.getDefaultSpace.mockResolvedValue(
        spaceFactory({
          id: createSpaceId('space-1'),
          slug: 'global',
        }),
      );
      mockCommandsGateway.create.mockResolvedValue(
        recipeFactory({
          id: createRecipeId('cmd-1'),
          name: 'Test Command',
          slug: 'test-command',
        }),
      );

      await useCase.execute(playbook);
    });

    it('fetches the global space', () => {
      expect(mockSpaceService.getDefaultSpace).toHaveBeenCalled();
    });

    it('creates command with provided data', () => {
      expect(mockCommandsGateway.create).toHaveBeenCalledWith({
        spaceId: 'space-1',
        name: 'Test Command',
        summary: 'A test command summary',
        whenToUse: ['When testing', 'When developing'],
        contextValidationCheckpoints: ['Check 1', 'Check 2'],
        steps: [
          { name: 'Step 1', description: 'First step', codeSnippet: undefined },
          {
            name: 'Step 2',
            description: 'Second step',
            codeSnippet: 'const x = 1;',
          },
        ],
      });
    });
  });

  describe('when command is created', () => {
    it('returns command id, name, and slug', async () => {
      mockSpaceService.getDefaultSpace.mockResolvedValue(
        spaceFactory({
          id: createSpaceId('space-1'),
          slug: 'global',
        }),
      );
      mockCommandsGateway.create.mockResolvedValue(
        recipeFactory({
          id: createRecipeId('cmd-1'),
          name: 'Test Command',
          slug: 'test-command',
        }),
      );

      const result = await useCase.execute({
        name: 'Test Command',
        summary: 'A test command summary',
        whenToUse: ['When testing'],
        contextValidationCheckpoints: ['Check 1'],
        steps: [{ name: 'Step 1', description: 'First step' }],
      });

      expect(result).toEqual({
        commandId: 'cmd-1',
        name: 'Test Command',
        slug: 'test-command',
      });
    });
  });
});
