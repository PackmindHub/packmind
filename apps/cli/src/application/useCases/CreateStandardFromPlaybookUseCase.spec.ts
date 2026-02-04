import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { ISpacesGateway } from '../../domain/repositories/ISpacesGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockSpacesGateway: jest.Mocked<ISpacesGateway>;
  let mockStandardsGateway: jest.Mocked<IStandardsGateway>;
  let mockGateway: jest.Mocked<Pick<IPackmindGateway, 'spaces' | 'standards'>>;

  beforeEach(() => {
    mockSpacesGateway = {
      getGlobal: jest.fn(),
    };
    mockStandardsGateway = {
      create: jest.fn(),
      getRules: jest.fn(),
      addExampleToRule: jest.fn(),
      list: jest.fn(),
    };
    mockGateway = {
      spaces: mockSpacesGateway,
      standards: mockStandardsGateway,
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
      mockStandardsGateway.create.mockResolvedValue({
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

    it('creates standard in space with rules', async () => {
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockStandardsGateway.create.mockResolvedValue({
        id: 'std-1',
        name: 'Test Standard',
      });

      await useCase.execute({
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1' }],
      });

      expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
        name: 'Test Standard',
        description: 'Desc',
        scope: 'test',
        rules: [{ content: 'Rule 1', examples: undefined }],
      });
    });

    it('returns standardId and name from gateway result', async () => {
      mockSpacesGateway.getGlobal.mockResolvedValue({
        id: 'space-1',
        slug: 'global',
      });
      mockStandardsGateway.create.mockResolvedValue({
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
        mockStandardsGateway.create.mockResolvedValue({
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

      it('creates standard with rules without examples', () => {
        expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
          name: 'Test',
          description: 'Desc',
          scope: 'test',
          rules: [
            { content: 'Rule 1', examples: undefined },
            { content: 'Rule 2', examples: undefined },
          ],
        });
      });
    });

    describe('when rules have examples', () => {
      beforeEach(() => {
        mockSpacesGateway.getGlobal.mockResolvedValue({
          id: 'space-1',
          slug: 'global',
        });
        mockStandardsGateway.create.mockResolvedValue({
          id: 'std-1',
          name: 'Test',
        });
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

        it('includes examples in the create call', () => {
          expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
            name: 'Test',
            description: 'Desc',
            scope: 'test',
            rules: [
              {
                content: 'Rule 1',
                examples: [
                  { lang: 'TYPESCRIPT', positive: 'good', negative: 'bad' },
                ],
              },
              { content: 'Rule 2', examples: undefined },
            ],
          });
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

        it('includes all examples in the create call', () => {
          expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
            name: 'Test',
            description: 'Desc',
            scope: 'test',
            rules: [
              {
                content: 'Rule 1',
                examples: [
                  { lang: 'TYPESCRIPT', positive: 'good1', negative: 'bad1' },
                ],
              },
              {
                content: 'Rule 2',
                examples: [
                  { lang: 'PYTHON', positive: 'good2', negative: 'bad2' },
                ],
              },
            ],
          });
        });
      });
    });
  });
});
