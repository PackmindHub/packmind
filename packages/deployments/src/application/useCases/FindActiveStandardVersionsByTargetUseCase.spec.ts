import { stubLogger } from '@packmind/test-utils';
import {
  createOrganizationId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  FindActiveStandardVersionsByTargetCommand,
  StandardVersion,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { FindActiveStandardVersionsByTargetUseCase } from './FindActiveStandardVersionsByTargetUseCase';

describe('FindActiveStandardVersionsByTargetUseCase', () => {
  let useCase: FindActiveStandardVersionsByTargetUseCase;
  let mockRepository: jest.Mocked<IDistributionRepository>;

  beforeEach(() => {
    mockRepository = {
      findActiveStandardVersionsByTarget: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByPackageId: jest.fn(),
      listByRecipeId: jest.fn(),
      listByStandardId: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    useCase = new FindActiveStandardVersionsByTargetUseCase(
      mockRepository,
      stubLogger(),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const organizationId = createOrganizationId('org-123');
    const targetId = createTargetId('target-456');
    const userId = createUserId('user-789');

    const createCommand = (): FindActiveStandardVersionsByTargetCommand => ({
      organizationId,
      targetId,
      userId,
    });

    const createStandardVersion = (
      overrides?: Partial<StandardVersion>,
    ): StandardVersion => ({
      id: createStandardVersionId('sv-1'),
      standardId: createStandardId('std-1'),
      name: 'Test Standard',
      slug: 'test-standard',
      description: 'Test description',
      version: 1,
      summary: null,
      gitCommit: undefined,
      userId: createUserId('author-1'),
      scope: null,
      ...overrides,
    });

    it('returns active standard versions for target', async () => {
      const command = createCommand();
      const mockStandardVersions: StandardVersion[] = [
        createStandardVersion({
          id: createStandardVersionId('sv-1'),
          standardId: createStandardId('std-1'),
          name: 'Standard One',
        }),
        createStandardVersion({
          id: createStandardVersionId('sv-2'),
          standardId: createStandardId('std-2'),
          name: 'Standard Two',
        }),
      ];

      mockRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        mockStandardVersions,
      );

      const result = await useCase.execute(command);

      expect(result).toEqual(mockStandardVersions);
      expect(
        mockRepository.findActiveStandardVersionsByTarget,
      ).toHaveBeenCalledWith(command.organizationId, command.targetId);
    });

    describe('when no standard versions exist', () => {
      it('returns empty array', async () => {
        const command = createCommand();

        mockRepository.findActiveStandardVersionsByTarget.mockResolvedValue([]);

        const result = await useCase.execute(command);

        expect(result).toEqual([]);
        expect(
          mockRepository.findActiveStandardVersionsByTarget,
        ).toHaveBeenCalledWith(command.organizationId, command.targetId);
      });
    });
  });
});
