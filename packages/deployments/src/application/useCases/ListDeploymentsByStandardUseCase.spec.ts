import { ListDeploymentsByStandardUseCase } from './ListDeploymentsByStandardUseCase';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import {
  createStandardId,
  createStandardVersionId,
  createOrganizationId,
  createUserId,
  createGitRepoId,
  createStandardsDeploymentId,
  StandardsDeployment,
  createTargetId,
  DistributionStatus,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('ListDeploymentsByStandardUseCase', () => {
  let useCase: ListDeploymentsByStandardUseCase;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  const logger = stubLogger();

  const mockStandardId = createStandardId('standard-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockUserId = createUserId('user-123');

  beforeEach(() => {
    mockStandardsDeploymentRepository = {
      listByStandardId: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      findActiveStandardVersionsByRepository: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      listByTargetIds: jest.fn(),
      listByOrganizationIdWithStatus: jest.fn(),
    } as jest.Mocked<IStandardsDeploymentRepository>;

    useCase = new ListDeploymentsByStandardUseCase(
      mockStandardsDeploymentRepository,
      logger,
    );
  });

  it('returns standard deployments for a given standard ID', async () => {
    const mockStandardsDeployments: StandardsDeployment[] = [
      {
        id: createStandardsDeploymentId('deployment-1'),
        standardVersions: [
          {
            id: createStandardVersionId('version-1'),
            standardId: mockStandardId,
            name: 'Test Standard',
            slug: 'test-standard',
            version: 1,
            description: 'Test description',
            scope: null,
            rules: [],
          },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        authorId: mockUserId,
        organizationId: mockOrganizationId,
        target: {
          id: createTargetId('deployment-1'),
          name: '',
          path: '',
          gitRepoId: createGitRepoId('repo-123'),
        },
        status: DistributionStatus.success,
        renderModes: [],
      },
    ];

    mockStandardsDeploymentRepository.listByStandardId.mockResolvedValue(
      mockStandardsDeployments,
    );

    const command = {
      standardId: mockStandardId,
      organizationId: mockOrganizationId,
      userId: mockUserId,
    };

    const result = await useCase.execute(command);

    expect(
      mockStandardsDeploymentRepository.listByStandardId,
    ).toHaveBeenCalledWith(mockStandardId, mockOrganizationId);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      standardVersions: mockStandardsDeployments[0].standardVersions,
      target: mockStandardsDeployments[0].target,
      status: mockStandardsDeployments[0].status,
      createdAt: mockStandardsDeployments[0].createdAt,
      authorId: mockStandardsDeployments[0].authorId,
      organizationId: mockStandardsDeployments[0].organizationId,
    });
    // Verify that the deployment ID is preserved (no longer generating new IDs)
    expect(result[0].id).toBe(mockStandardsDeployments[0].id);
  });

  describe('when no deployments exist', () => {
    it('returns empty array', async () => {
      mockStandardsDeploymentRepository.listByStandardId.mockResolvedValue([]);

      const command = {
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      };

      const result = await useCase.execute(command);

      expect(
        mockStandardsDeploymentRepository.listByStandardId,
      ).toHaveBeenCalledWith(mockStandardId, mockOrganizationId);
      expect(result).toEqual([]);
    });
  });

  describe('when multiple deployments exist', () => {
    it('returns multiple deployments', async () => {
      const mockStandardsDeployments: StandardsDeployment[] = [
        {
          id: createStandardsDeploymentId('deployment-1'),
          standardVersions: [
            {
              id: createStandardVersionId('version-1'),
              standardId: mockStandardId,
              name: 'Test Standard',
              slug: 'test-standard',
              version: 1,
              description: 'Test description',
              scope: null,
              rules: [],
            },
          ],
          createdAt: '2024-01-01T00:00:00Z',
          authorId: mockUserId,
          organizationId: mockOrganizationId,
          target: {
            id: createTargetId('deployment-1'),
            name: '',
            path: '',
            gitRepoId: createGitRepoId('repo-123'),
          },
          status: DistributionStatus.success,
          renderModes: [],
        },
        {
          id: createStandardsDeploymentId('deployment-2'),
          standardVersions: [
            {
              id: createStandardVersionId('version-2'),
              standardId: mockStandardId,
              name: 'Test Standard',
              slug: 'test-standard',
              version: 2,
              description: 'Test description v2',
              scope: null,
              rules: [],
            },
          ],
          createdAt: '2024-01-02T00:00:00Z',
          authorId: mockUserId,
          organizationId: mockOrganizationId,
          target: {
            id: createTargetId('deployment-1'),
            name: '',
            path: '',
            gitRepoId: createGitRepoId('repo-123'),
          },
          status: DistributionStatus.success,
          renderModes: [],
        },
      ];

      mockStandardsDeploymentRepository.listByStandardId.mockResolvedValue(
        mockStandardsDeployments,
      );

      const command = {
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      };

      const result = await useCase.execute(command);

      expect(result).toHaveLength(2);
      expect(result[0].standardVersions[0].version).toBe(1);
      expect(result[1].standardVersions[0].version).toBe(2);
    });
  });

  describe('when repository throws error', () => {
    it('throws error', async () => {
      const error = new Error('Database error');
      mockStandardsDeploymentRepository.listByStandardId.mockRejectedValue(
        error,
      );

      const command = {
        standardId: mockStandardId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
      };

      await expect(useCase.execute(command)).rejects.toThrow('Database error');
      expect(
        mockStandardsDeploymentRepository.listByStandardId,
      ).toHaveBeenCalledWith(mockStandardId, mockOrganizationId);
    });
  });
});
