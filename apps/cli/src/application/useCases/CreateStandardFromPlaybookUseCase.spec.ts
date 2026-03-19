import { CreateStandardFromPlaybookUseCase } from './CreateStandardFromPlaybookUseCase';
import { IPackmindGateway } from '../../domain/repositories/IPackmindGateway';
import { IStandardsGateway } from '../../domain/repositories/IStandardsGateway';
import { ISpaceService } from '../../domain/services/ISpaceService';
import { createMockSpaceService } from '../../mocks/createMockServices';
import { spaceFactory } from '@packmind/spaces/test';
import { createSpaceId } from '@packmind/types';

describe('CreateStandardFromPlaybookUseCase', () => {
  let useCase: CreateStandardFromPlaybookUseCase;
  let mockSpaceService: jest.Mocked<ISpaceService>;
  let mockStandardsGateway: jest.Mocked<IStandardsGateway>;
  let mockGateway: jest.Mocked<Pick<IPackmindGateway, 'standards'>>;

  const basePlaybook = {
    name: 'Test Standard',
    description: 'Desc',
    scope: 'test',
    rules: [{ content: 'Rule 1' }],
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
    mockStandardsGateway = {
      create: jest.fn(),
      getRules: jest.fn(),
      addExampleToRule: jest.fn(),
      list: jest.fn(),
    };
    mockGateway = {
      standards: mockStandardsGateway,
    };
    useCase = new CreateStandardFromPlaybookUseCase(
      mockGateway as unknown as IPackmindGateway,
      mockSpaceService,
    );
    mockStandardsGateway.create.mockResolvedValue({
      id: 'std-1',
      name: 'Test Standard',
    });
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

      expect(mockStandardsGateway.create).toHaveBeenCalledWith(
        'space-1',
        expect.objectContaining({ name: 'Test Standard' }),
      );
    });

    it('returns standardId and name', async () => {
      const result = await useCase.execute(basePlaybook);

      expect(result).toEqual({ standardId: 'std-1', name: 'Test Standard' });
    });

    describe('when rules have no examples', () => {
      it('creates standard with rules without examples', async () => {
        await useCase.execute({
          ...basePlaybook,
          rules: [{ content: 'Rule 1' }, { content: 'Rule 2' }],
        });

        expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
          name: 'Test Standard',
          description: 'Desc',
          scope: 'test',
          rules: [
            { content: 'Rule 1', examples: undefined },
            { content: 'Rule 2', examples: undefined },
          ],
          originSkill: undefined,
        });
      });
    });

    describe('when rules have examples', () => {
      it('includes examples in the create call', async () => {
        await useCase.execute({
          ...basePlaybook,
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

        expect(mockStandardsGateway.create).toHaveBeenCalledWith('space-1', {
          name: 'Test Standard',
          description: 'Desc',
          scope: 'test',
          rules: [
            {
              content: 'Rule 1',
              examples: [
                { lang: 'TYPESCRIPT', positive: 'good', negative: 'bad' },
              ],
            },
          ],
          originSkill: undefined,
        });
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

        expect(mockStandardsGateway.create).toHaveBeenCalledWith(
          'space-2',
          expect.anything(),
        );
      });

      it('accepts slug with a leading @ prefix', async () => {
        await useCase.execute({ ...basePlaybook, spaceSlug: '@team' });

        expect(mockStandardsGateway.create).toHaveBeenCalledWith(
          'space-2',
          expect.anything(),
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
