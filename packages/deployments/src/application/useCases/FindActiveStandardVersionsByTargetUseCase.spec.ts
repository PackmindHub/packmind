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

    describe('when active standard versions exist', () => {
      let result: StandardVersion[];
      let command: FindActiveStandardVersionsByTargetCommand;
      let mockStandardVersions: StandardVersion[];

      beforeEach(async () => {
        command = createCommand();
        mockStandardVersions = [
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

        result = await useCase.execute(command);
      });

      it('returns active standard versions for target', () => {
        expect(result).toEqual(mockStandardVersions);
      });

      it('calls repository with correct parameters', () => {
        expect(
          mockRepository.findActiveStandardVersionsByTarget,
        ).toHaveBeenCalledWith(command.organizationId, command.targetId);
      });
    });

    describe('when no standard versions exist', () => {
      let result: StandardVersion[];
      let command: FindActiveStandardVersionsByTargetCommand;

      beforeEach(async () => {
        command = createCommand();

        mockRepository.findActiveStandardVersionsByTarget.mockResolvedValue([]);

        result = await useCase.execute(command);
      });

      it('returns empty array', () => {
        expect(result).toEqual([]);
      });

      it('calls repository with correct parameters', () => {
        expect(
          mockRepository.findActiveStandardVersionsByTarget,
        ).toHaveBeenCalledWith(command.organizationId, command.targetId);
      });
    });
  });
});
