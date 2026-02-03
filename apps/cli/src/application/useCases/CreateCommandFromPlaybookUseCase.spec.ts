import { CreateCommandFromPlaybookUseCase } from './CreateCommandFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';

describe('CreateCommandFromPlaybookUseCase', () => {
  let useCase: CreateCommandFromPlaybookUseCase;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;
  let mockGateway: jest.Mocked<
    Pick<IPackmindGateway, 'spaces' | 'createCommand'>
  >;

  beforeEach(() => {
    mockSpacesGateway = {
      getGlobal: jest.fn(),
    };
    mockGateway = {
      spaces: mockSpacesGateway,
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
      mockSpacesGateway.getGlobal.mockResolvedValue({
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
      expect(mockSpacesGateway.getGlobal).toHaveBeenCalled();
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
      mockSpacesGateway.getGlobal.mockResolvedValue({
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
