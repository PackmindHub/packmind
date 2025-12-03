import { stubLogger } from '@packmind/test-utils';
import {
  createDistributionId,
  createPackageId,
  createTargetId,
  Distribution,
  DistributionStatus,
  GitRepoId,
  ListDeploymentsByPackageCommand,
  OrganizationId,
  UserId,
} from '@packmind/types';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { ListDeploymentsByPackageUseCase } from './ListDeploymentsByPackageUseCase';

describe('ListDeploymentsByPackageUseCase', () => {
  let useCase: ListDeploymentsByPackageUseCase;
  let mockRepository: jest.Mocked<IDistributionRepository>;

  beforeEach(() => {
    mockRepository = {
      listByPackageId: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    useCase = new ListDeploymentsByPackageUseCase(mockRepository, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('lists distributions for a package', async () => {
      const command: ListDeploymentsByPackageCommand = {
        packageId: createPackageId('package-123'),
        organizationId: 'org-456' as OrganizationId,
        userId: 'user-789' as UserId,
      };
      const mockDistributions: Distribution[] = [
        {
          id: createDistributionId('distribution-1'),
          organizationId: command.organizationId as OrganizationId,
          distributedPackages: [],
          target: {
            id: createTargetId('target-123'),
            name: 'Test Target',
            path: '/test',
            gitRepoId: 'repo-123' as GitRepoId,
          },
          status: DistributionStatus.success,
          authorId: 'author-123' as UserId,
          createdAt: new Date().toISOString(),
          renderModes: [],
        },
      ];

      mockRepository.listByPackageId.mockResolvedValue(mockDistributions);

      const result = await useCase.execute(command);

      expect(result).toEqual(mockDistributions);
      expect(mockRepository.listByPackageId).toHaveBeenCalledWith(
        command.packageId,
        command.organizationId,
      );
    });

    describe('when listing distributions fails', () => {
      it('throws repository error', async () => {
        const command: ListDeploymentsByPackageCommand = {
          packageId: createPackageId('package-123'),
          organizationId: 'org-456' as OrganizationId,
          userId: 'user-789' as UserId,
        };
        const error = new Error('Repository error');

        mockRepository.listByPackageId.mockRejectedValue(error);

        await expect(useCase.execute(command)).rejects.toThrow(
          'Repository error',
        );
      });
    });

    describe('when no distributions found', () => {
      it('returns empty array', async () => {
        const command: ListDeploymentsByPackageCommand = {
          packageId: createPackageId('package-123'),
          organizationId: 'org-456' as OrganizationId,
          userId: 'user-789' as UserId,
        };
        const mockDistributions: Distribution[] = [];

        mockRepository.listByPackageId.mockResolvedValue(mockDistributions);

        const result = await useCase.execute(command);

        expect(result).toEqual([]);
      });
    });
  });
});
