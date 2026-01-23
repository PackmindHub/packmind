import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockGateway: jest.Mocked<
    Pick<
      IPackmindGateway,
      | 'getGlobalSpace'
      | 'createStandard'
      | 'getRulesForStandard'
      | 'addExampleToRule'
    >
  >;

  beforeEach(() => {
    mockGateway = {
      getGlobalSpace: jest.fn(),
      createStandard: jest.fn(),
      getRulesForStandard: jest.fn(),
      addExampleToRule: jest.fn(),
    };
    useCase = new CreateStandardFromPlaybookUseCase(
      mockGateway as unknown as IPackmindGateway,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when creating standard without examples', () => {
    beforeEach(async () => {
      mockGateway.getGlobalSpace.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });
      mockGateway.getRulesForStandard.mockResolvedValue([]);

      await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });
    });

    it('fetches the global space', () => {
      expect(mockGateway.getGlobalSpace).toHaveBeenCalled();
    });

    it('creates standard with provided data', () => {
      expect(mockGateway.createStandard).toHaveBeenCalledWith('space-1', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });
    });

    it('does not add examples', () => {
      expect(mockGateway.addExampleToRule).not.toHaveBeenCalled();
    });
  });

  describe('when creating standard', () => {
    it('returns standard id and name', async () => {
      mockGateway.getGlobalSpace.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });
      mockGateway.getRulesForStandard.mockResolvedValue([]);

      const result = await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(result).toEqual({ standardId: 'std-1', name: 'Test Standard' });
    });
  });

  it('creates standard with examples', async () => {
    mockGateway.getGlobalSpace.mockResolvedValue({
      id: 'space-1',
      slug: 'global',
    });
    mockGateway.createStandard.mockResolvedValue({ id: 'std-1', name: 'Test' });
    mockGateway.getRulesForStandard.mockResolvedValue([
      { id: 'rule-1', content: 'Rule 1' },
    ]);

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

    expect(mockGateway.addExampleToRule).toHaveBeenCalledWith(
      'space-1',
      'std-1',
      'rule-1',
      { positive: 'good', negative: 'bad', language: 'TYPESCRIPT' },
    );
  });

  it('succeeds even if example creation fails', async () => {
    mockGateway.getGlobalSpace.mockResolvedValue({
      id: 'space-1',
      slug: 'global',
    });
    mockGateway.createStandard.mockResolvedValue({ id: 'std-1', name: 'Test' });
    mockGateway.getRulesForStandard.mockResolvedValue([
      { id: 'rule-1', content: 'Rule 1' },
    ]);
    mockGateway.addExampleToRule.mockRejectedValue(new Error('Failed'));

    const result = await useCase.execute({
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

    expect(result).toEqual({ standardId: 'std-1', name: 'Test' });
  });

  describe('when no rules have examples', () => {
    it('does not fetch rules from server', async () => {
      mockGateway.getGlobalSpace.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandard.mockResolvedValue({
        id: 'std-1',
        name: 'Test',
      });

      await useCase.execute({
        name: 'Test',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }, { content: 'Rule 2' }],
      });

      expect(mockGateway.getRulesForStandard).not.toHaveBeenCalled();
    });
  });
});
