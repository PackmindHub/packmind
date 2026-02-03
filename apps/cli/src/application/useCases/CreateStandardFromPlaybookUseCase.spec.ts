import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;
  let mockGateway: jest.Mocked<
    Pick<
      IPackmindGateway,
      | 'spaces'
      | 'createStandardInSpace'
      | 'getRulesForStandard'
      | 'addExampleToRule'
    >
  >;

  beforeEach(() => {
    mockSpacesGateway = {
      getGlobal: jest.fn(),
    };
    mockGateway = {
      spaces: mockSpacesGateway,
      createStandardInSpace: jest.fn(),
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

  describe('when executing', () => {
    it('gets the global space first', async () => {
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandardInSpace.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });

      await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(mockSpacesGateway.getGlobal).toHaveBeenCalled();
    });

    it('creates standard in space with rules content only', async () => {
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandardInSpace.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });

      await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(mockGateway.createStandardInSpace).toHaveBeenCalledWith(
        'space-1',
        {
          name: 'Test Standard',
          description: 'Desc',
          scope: 'test',
          rules: [{ content: 'Rule 1' }],
        },
      );
    });

    it('returns standardId and name from gateway result', async () => {
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockGateway.createStandardInSpace.mockResolvedValue({
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

    describe('when rules have no examples', () => {
      beforeEach(async () => {
        mockSpacesGateway.getGlobal.mockResolvedValue({
          id: 'space-1',
          slug: 'global',
        });
        mockGateway.createStandardInSpace.mockResolvedValue({
          id: 'std-1',
          name: 'Test',
        });

        await useCase.execute({
          name: 'Test',
          description: 'Desc',
          scope: 'test',
          rules: [{ content: 'Rule 1' }, { content: 'Rule 2' }],
        });
      });

      it('does not fetch rules', () => {
        expect(mockGateway.getRulesForStandard).not.toHaveBeenCalled();
      });

      it('does not add examples', () => {
        expect(mockGateway.addExampleToRule).not.toHaveBeenCalled();
      });
    });

    describe('when rules have examples', () => {
      beforeEach(() => {
        mockSpacesGateway.getGlobal.mockResolvedValue({
          id: 'space-1',
          slug: 'global',
        });
        mockGateway.createStandardInSpace.mockResolvedValue({
          id: 'std-1',
          name: 'Test',
        });
        mockGateway.getRulesForStandard.mockResolvedValue([
          { id: 'rule-1', content: 'Rule 1' },
          { id: 'rule-2', content: 'Rule 2' },
        ]);
      });

      it('fetches created rules from the standard', async () => {
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

        expect(mockGateway.getRulesForStandard).toHaveBeenCalledWith(
          'space-1',
          'std-1',
        );
      });

      describe('when only first rule has examples', () => {
        beforeEach(async () => {
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
              { content: 'Rule 2' },
            ],
          });
        });

        it('adds example to the corresponding rule', () => {
          expect(mockGateway.addExampleToRule).toHaveBeenCalledWith(
            'space-1',
            'std-1',
            'rule-1',
            { positive: 'good', negative: 'bad', language: 'TYPESCRIPT' },
          );
        });

        it('adds example only once', () => {
          expect(mockGateway.addExampleToRule).toHaveBeenCalledTimes(1);
        });
      });

      describe('when multiple rules have examples', () => {
        beforeEach(async () => {
          await useCase.execute({
            name: 'Test',
            description: 'Desc',
            scope: 'test',
            rules: [
              {
                content: 'Rule 1',
                examples: {
                  positive: 'good1',
                  negative: 'bad1',
                  language: 'TYPESCRIPT',
                },
              },
              {
                content: 'Rule 2',
                examples: {
                  positive: 'good2',
                  negative: 'bad2',
                  language: 'PYTHON',
                },
              },
            ],
          });
        });

        it('adds example for each rule with examples', () => {
          expect(mockGateway.addExampleToRule).toHaveBeenCalledTimes(2);
        });

        it('adds example to first rule', () => {
          expect(mockGateway.addExampleToRule).toHaveBeenNthCalledWith(
            1,
            'space-1',
            'std-1',
            'rule-1',
            { positive: 'good1', negative: 'bad1', language: 'TYPESCRIPT' },
          );
        });

        it('adds example to second rule', () => {
          expect(mockGateway.addExampleToRule).toHaveBeenNthCalledWith(
            2,
            'space-1',
            'std-1',
            'rule-2',
            { positive: 'good2', negative: 'bad2', language: 'PYTHON' },
          );
        });
      });

      describe('when addExampleToRule fails', () => {
        it('continues without failing the operation', async () => {
          mockGateway.addExampleToRule.mockRejectedValue(
            new Error('Example creation failed'),
          );

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
      });
    });
  });
});
