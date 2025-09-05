import { ListDeploymentsByStandardUseCase } from './ListDeploymentsByStandardUseCase';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import {
  createStandardId,
  createStandardVersionId,
  createOrganizationId,
  createUserId,
  createGitCommitId,
  createGitRepoId,
  createGitProviderId,
  createStandardsDeploymentId,
  StandardsDeployment,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';

describe('ListDeploymentsByStandardUseCase', () => {
  let useCase: ListDeploymentsByStandardUseCase;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  const logger = stubLogger();

  const mockStandardId = createStandardId('standard-123');
  const mockOrganizationId = createOrganizationId('org-123');
  const mockUserId = createUserId('user-123');
  const mockGitRepoId = createGitRepoId('repo-123');

  beforeEach(() => {
    mockStandardsDeploymentRepository = {
      listByStandardId: jest.fn(),
      listByOrganizationId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      findActiveStandardVersionsByRepository: jest.fn(),
      add: jest.fn(),
      findById: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
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
        gitRepos: [
          {
            id: mockGitRepoId,
            owner: 'test-owner',
            repo: 'test-repo',
            branch: 'main',
            providerId: createGitProviderId('provider-123'),
          },
        ],
        gitCommits: [
          {
            id: createGitCommitId('commit-1'),
            sha: 'abc123',
            message: 'Test commit',
            author: 'test-author',
            url: 'https://github.com/test/commit/abc123',
          },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        authorId: mockUserId,
        organizationId: mockOrganizationId,
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
      gitRepos: mockStandardsDeployments[0].gitRepos,
      gitCommits: mockStandardsDeployments[0].gitCommits,
      createdAt: mockStandardsDeployments[0].createdAt,
      authorId: mockStandardsDeployments[0].authorId,
      organizationId: mockStandardsDeployments[0].organizationId,
    });
    // Verify that a new StandardDeploymentId is generated
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].id).toBe('string');
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
          gitRepos: [
            {
              id: mockGitRepoId,
              owner: 'test-owner',
              repo: 'test-repo',
              branch: 'main',
              providerId: createGitProviderId('provider-123'),
            },
          ],
          gitCommits: [
            {
              id: createGitCommitId('commit-1'),
              sha: 'abc123',
              message: 'Test commit',
              author: 'test-author',
              url: 'https://github.com/test/commit/abc123',
            },
          ],
          createdAt: '2024-01-01T00:00:00Z',
          authorId: mockUserId,
          organizationId: mockOrganizationId,
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
          gitRepos: [
            {
              id: createGitRepoId('repo-456'),
              owner: 'test-owner',
              repo: 'test-repo-2',
              branch: 'main',
              providerId: createGitProviderId('provider-123'),
            },
          ],
          gitCommits: [
            {
              id: createGitCommitId('commit-2'),
              sha: 'def456',
              message: 'Test commit 2',
              author: 'test-author',
              url: 'https://github.com/test/commit/def456',
            },
          ],
          createdAt: '2024-01-02T00:00:00Z',
          authorId: mockUserId,
          organizationId: mockOrganizationId,
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
