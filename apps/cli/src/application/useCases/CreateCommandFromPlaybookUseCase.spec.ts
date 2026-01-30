import { CreateCommandFromPlaybookUseCase } from './CreateCommandFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('CreateCommandFromPlaybookUseCase', () => {
  let useCase: CreateCommandFromPlaybookUseCase;
  let mockGateway: jest.Mocked<
    Pick<IPackmindGateway, 'getGlobalSpace' | 'createCommand'>
  >;

  beforeEach(() => {
    mockGateway = {
      getGlobalSpace: jest.fn(),
      createCommand: jest.fn(),
    };
    useCase = new CreateCommandFromPlaybookUseCase(
      mockGateway as unknown as IPackmindGateway,
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
      mockGateway.getGlobalSpace.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createCommand.mockResolvedValue({
        id: 'cmd-1',
        name: 'Test Command',
        slug: 'test-command',
      });

      await useCase.execute(playbook);
    });

    it('fetches the global space', () => {
      expect(mockGateway.getGlobalSpace).toHaveBeenCalled();
    });

    it('creates command with provided data', () => {
      expect(mockGateway.createCommand).toHaveBeenCalledWith('space-1', {
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
      mockGateway.getGlobalSpace.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createCommand.mockResolvedValue({
        id: 'cmd-1',
        name: 'Test Command',
        slug: 'test-command',
      });

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
