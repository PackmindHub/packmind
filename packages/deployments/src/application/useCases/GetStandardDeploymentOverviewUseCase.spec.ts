import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import {
  createGitRepoId,
  createGitProviderId,
  Standard,
  GitRepo,
  OrganizationId,
  UserId,
  GetStandardDeploymentOverviewCommand,
} from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { GetStandardDeploymentOverviewUseCase } from './GetStandardDeploymentOverviewUseCase';
import { StandardsDeployment } from '../../domain/entities/StandardsDeployment';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { StandardDeploymentOverview } from '../../domain/types/StandardDeploymentOverview';

describe('GetStandardDeploymentOverviewUseCase', () => {
  let useCase: GetStandardDeploymentOverviewUseCase;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;
  let mockGitHexa: jest.Mocked<GitHexa>;
  const logger = stubLogger();

  const organizationId = 'org-123' as OrganizationId;
  const userId = 'user-123' as UserId;

  const mockOverview: StandardDeploymentOverview = {
    repositories: [],
    standards: [],
  };

  beforeEach(() => {
    mockStandardsDeploymentRepository = {
      listByOrganizationId: jest.fn(),
      listByStandardId: jest.fn(),
      listByOrganizationIdAndGitRepos: jest.fn(),
      findActiveStandardVersionsByRepository: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteById: jest.fn(),
      restoreById: jest.fn(),
      list: jest.fn(),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

    mockStandardsHexa = {
      listStandardsByOrganization: jest.fn(),
    } as unknown as jest.Mocked<StandardsHexa>;

    mockGitHexa = {
      getOrganizationRepositories: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    useCase = new GetStandardDeploymentOverviewUseCase(
      mockStandardsDeploymentRepository,
      mockStandardsHexa,
      mockGitHexa,
      logger,
    );
  });

  describe('when getting standard deployment overview', () => {
    it('returns overview built from deployment data', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockDeployments: StandardsDeployment[] = [];
      const mockStandards: Standard[] = [];
      const mockGitRepos: GitRepo[] = [];

      mockStandardsDeploymentRepository.listByOrganizationId.mockResolvedValue(
        mockDeployments,
      );
      mockStandardsHexa.listStandardsByOrganization.mockResolvedValue(
        mockStandards,
      );
      mockGitHexa.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      const result = await useCase.execute(command);

      expect(result).toEqual(mockOverview);
      expect(
        mockStandardsDeploymentRepository.listByOrganizationId,
      ).toHaveBeenCalledWith(organizationId);
      expect(
        mockStandardsHexa.listStandardsByOrganization,
      ).toHaveBeenCalledWith(organizationId);
      expect(mockGitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
        organizationId,
      );
    });
  });

  describe('when repository throws an error', () => {
    it('logs error and re-throws', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const error = new Error('Repository error');
      mockStandardsDeploymentRepository.listByOrganizationId.mockRejectedValue(
        error,
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository error',
      );
    });
  });

  describe('when service throws non-Error', () => {
    it('logs string representation and re-throws', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const error = 'String error';
      mockStandardsHexa.listStandardsByOrganization.mockRejectedValue(error);

      await expect(useCase.execute(command)).rejects.toBe('String error');
    });
  });

  describe('when overview has data', () => {
    it('builds overview with deployment data', async () => {
      const command: GetStandardDeploymentOverviewCommand = {
        organizationId,
        userId,
      };

      const mockDeployments: StandardsDeployment[] = [];
      const mockStandards: Standard[] = [
        { id: 'std-1', name: 'Standard 1', version: 1 } as Standard,
      ];
      const mockGitRepos: GitRepo[] = [
        {
          id: createGitRepoId('repo-1'),
          name: 'Repository 1',
          owner: 'owner1',
          repo: 'repo1',
          branch: 'main',
          providerId: createGitProviderId('provider1'),
        } as GitRepo,
        {
          id: createGitRepoId('repo-2'),
          name: 'Repository 2',
          owner: 'owner2',
          repo: 'repo2',
          branch: 'main',
          providerId: createGitProviderId('provider2'),
        } as GitRepo,
      ];

      mockStandardsDeploymentRepository.listByOrganizationId.mockResolvedValue(
        mockDeployments,
      );
      mockStandardsHexa.listStandardsByOrganization.mockResolvedValue(
        mockStandards,
      );
      mockGitHexa.getOrganizationRepositories.mockResolvedValue(mockGitRepos);

      const result = await useCase.execute(command);

      expect(result.repositories).toHaveLength(2);
      expect(result.standards).toHaveLength(1);
      expect(result.repositories[0].gitRepo.id).toBe(createGitRepoId('repo-1'));
      expect(result.repositories[1].gitRepo.id).toBe(createGitRepoId('repo-2'));
      expect(result.standards[0].standard.id).toBe('std-1');
    });
  });
});
