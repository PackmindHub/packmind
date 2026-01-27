import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockGateway: jest.Mocked<Pick<IPackmindGateway, 'createStandard'>>;

  beforeEach(() => {
    mockGateway = {
      createStandard: jest.fn(),
    };
    useCase = new CreateStandardFromPlaybookUseCase(
      mockGateway as unknown as IPackmindGateway,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when executing', () => {
    it('calls gateway.createStandard with playbook data', async () => {
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });

      await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(mockGateway.createStandard).toHaveBeenCalledWith({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });
    });

    it('returns standardId and name from gateway result', async () => {
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });

      const result = await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(result).toEqual({ standardId: 'std-1', name: 'Test Standard' });
    });

    it('passes rules with examples to gateway', async () => {
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test',
      });

      await useCase.execute({
        name: 'Test',
        description: 'Desc',
        scope: 'test',
        rules: [
          {
            content: 'Rule 1',
            examples: {
              positive: 'good',
              negative: 'bad',
              language: 'TYPESCRIPT',
            },
          },
        ],
      });

      expect(mockGateway.createStandard).toHaveBeenCalledWith({
        name: 'Test',
        description: 'Desc',
        scope: 'test',
        rules: [
          {
            content: 'Rule 1',
            examples: {
              positive: 'good',
              negative: 'bad',
              language: 'TYPESCRIPT',
            },
          },
        ],
      });
    });
  });
});
