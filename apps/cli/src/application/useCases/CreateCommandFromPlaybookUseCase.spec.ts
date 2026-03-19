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

  const basePlaybook = {
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

  const globalSpace = spaceFactory({
    id: createSpaceId('space-1'),
    slug: 'global',
  });
  const teamSpace = spaceFactory({
    id: createSpaceId('space-2'),
    slug: 'team',
  });

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
    mockCommandsGateway.create.mockResolvedValue(
      recipeFactory({
        id: createRecipeId('cmd-1'),
        name: 'Test Command',
        slug: 'test-command',
      }),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when organization has a single space', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace]);
    });

    it('uses the only available space', async () => {
      await useCase.execute(basePlaybook);

      expect(mockCommandsGateway.create).toHaveBeenCalledWith(
        expect.objectContaining({ spaceId: 'space-1' }),
      );
    });

    it('creates command with provided data', async () => {
      await useCase.execute(basePlaybook);

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
        originSkill: undefined,
      });
    });

    it('returns command id, name, and slug', async () => {
      const result = await useCase.execute(basePlaybook);

      expect(result).toEqual({
        commandId: 'cmd-1',
        name: 'Test Command',
        slug: 'test-command',
      });
    });
  });

  describe('when organization has multiple spaces', () => {
    beforeEach(() => {
      mockSpaceService.getSpaces.mockResolvedValue([globalSpace, teamSpace]);
    });

    describe('and no --space flag is provided', () => {
      it('throws an error listing available spaces', async () => {
        await expect(useCase.execute(basePlaybook)).rejects.toThrow(
          'Multiple spaces found',
        );
      });

      it('lists available space slugs in the error', async () => {
        await expect(useCase.execute(basePlaybook)).rejects.toThrow('global');
      });
    });

    describe('and a valid --space slug is provided', () => {
      it('uses the matching space', async () => {
        await useCase.execute({ ...basePlaybook, spaceSlug: 'team' });

        expect(mockCommandsGateway.create).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId: 'space-2' }),
        );
      });

      it('accepts slug with a leading @ prefix', async () => {
        await useCase.execute({ ...basePlaybook, spaceSlug: '@team' });

        expect(mockCommandsGateway.create).toHaveBeenCalledWith(
          expect.objectContaining({ spaceId: 'space-2' }),
        );
      });
    });

    describe('and an invalid --space slug is provided', () => {
      it('throws an error indicating the space was not found', async () => {
        await expect(
          useCase.execute({ ...basePlaybook, spaceSlug: 'unknown' }),
        ).rejects.toThrow('Space "unknown" not found');
      });

      it('lists available spaces in the error', async () => {
        await expect(
          useCase.execute({ ...basePlaybook, spaceSlug: 'unknown' }),
        ).rejects.toThrow('global');
      });
    });
  });
});
