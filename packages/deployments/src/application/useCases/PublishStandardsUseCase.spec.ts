import { PublishStandardsUseCase } from './PublishStandardsUseCase';
import { StandardsHexa } from '@packmind/standards';
import { GitHexa } from '@packmind/git';
import { CodingAgentHexa } from '@packmind/coding-agent';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { TargetService } from '../services/TargetService';
import {
  PublishStandardsCommand,
  DistributionStatus,
  createStandardVersionId,
  createTargetId,
  createUserId,
  createOrganizationId,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
  GitRepo,
  GitCommit,
} from '@packmind/shared';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { stubLogger } from '@packmind/shared/test';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';

describe('PublishStandardsUseCase', () => {
  let useCase: PublishStandardsUseCase;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;
  let mockGitHexa: jest.Mocked<GitHexa>;
  let mockCodingAgentHexa: jest.Mocked<CodingAgentHexa>;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockLogger: ReturnType<typeof stubLogger>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());

  beforeEach(() => {
    mockStandardsHexa = {
      getStandardVersionById: jest.fn(),
    } as unknown as jest.Mocked<StandardsHexa>;

    mockGitHexa = {
      commitToGit: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    mockCodingAgentHexa = {
      prepareStandardsDeployment: jest.fn(),
    } as unknown as jest.Mocked<CodingAgentHexa>;

    mockStandardsDeploymentRepository = {
      add: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

    mockTargetService = {
      getRepositoryByTargetId: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockLogger = stubLogger();

    useCase = new PublishStandardsUseCase(
      mockStandardsHexa,
      mockGitHexa,
      mockCodingAgentHexa,
      mockStandardsDeploymentRepository,
      mockTargetService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployment is successful', () => {
    let command: PublishStandardsCommand;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let gitCommit: GitCommit;
    let target: ReturnType<typeof targetFactory>;

    beforeEach(() => {
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Test Standard',
        slug: 'test-standard',
        version: 1,
      });

      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
      });

      gitCommit = {
        id: createGitCommitId(uuidv4()),
        sha: 'abc123def456',
        message: 'Test commit',
        author: 'Test Author <test@example.com>',
        url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
      };

      command = {
        userId,
        organizationId,
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
      };

      mockStandardsHexa.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitHexa.commitToGit.mockResolvedValue(gitCommit);
    });

    it('returns one deployment', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
    });

    it('stores deployment with success status', async () => {
      const result = await useCase.execute(command);

      expect(result[0].status).toBe(DistributionStatus.success);
    });

    it('stores deployment with git commit', async () => {
      const result = await useCase.execute(command);

      expect(result[0].gitCommit).toEqual(gitCommit);
    });

    it('stores deployment with target information', async () => {
      const result = await useCase.execute(command);

      expect(result[0].target).toEqual(target);
    });

    it('stores deployment with standard versions', async () => {
      const result = await useCase.execute(command);

      expect(result[0].standardVersions).toContainEqual(standardVersion);
    });

    it('calls repository add with correct parameters', async () => {
      await useCase.execute(command);

      expect(mockStandardsDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DistributionStatus.success,
          gitCommit,
          target,
        }),
      );
    });
  });

  describe('when deployment fails', () => {
    let command: PublishStandardsCommand;
    let target: ReturnType<typeof targetFactory>;

    beforeEach(() => {
      const standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Test Standard',
        slug: 'test-standard',
        version: 1,
      });

      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
      });

      command = {
        userId,
        organizationId,
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
      };

      const deploymentError = new Error('Git push failed');

      mockStandardsHexa.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitHexa.commitToGit.mockRejectedValue(deploymentError);
    });

    it('returns one deployment', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
    });

    it('stores deployment with failure status', async () => {
      const result = await useCase.execute(command);

      expect(result[0].status).toBe(DistributionStatus.failure);
    });

    it('stores deployment with error message', async () => {
      const result = await useCase.execute(command);

      expect(result[0].error).toBe('Git push failed');
    });

    it('stores deployment without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result[0].gitCommit).toBeUndefined();
    });

    it('stores deployment with target information', async () => {
      const result = await useCase.execute(command);

      expect(result[0].target).toEqual(target);
    });

    it('calls repository add with failure status', async () => {
      await useCase.execute(command);

      expect(mockStandardsDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DistributionStatus.failure,
          error: 'Git push failed',
        }),
      );
    });
  });

  describe('when no changes are detected', () => {
    let command: PublishStandardsCommand;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;

    beforeEach(() => {
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Test Standard',
        slug: 'test-standard',
        version: 1,
      });

      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
      });

      command = {
        userId,
        organizationId,
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
      };

      const noChangesError = new Error('NO_CHANGES_DETECTED');

      mockStandardsHexa.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitHexa.commitToGit.mockRejectedValue(noChangesError);
    });

    it('returns one deployment', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
    });

    it('stores deployment with no_changes status', async () => {
      const result = await useCase.execute(command);

      expect(result[0].status).toBe(DistributionStatus.no_changes);
    });

    it('stores deployment without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result[0].gitCommit).toBeUndefined();
    });

    it('stores deployment with target information', async () => {
      const result = await useCase.execute(command);

      expect(result[0].target).toEqual(target);
    });

    it('stores deployment with standard versions', async () => {
      const result = await useCase.execute(command);

      expect(result[0].standardVersions).toContainEqual(standardVersion);
    });

    it('stores deployment without error message', async () => {
      const result = await useCase.execute(command);

      expect(result[0].error).toBeUndefined();
    });

    it('calls repository add with no_changes status', async () => {
      await useCase.execute(command);

      expect(mockStandardsDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DistributionStatus.no_changes,
        }),
      );
    });
  });

  describe('when deploying multiple standards', () => {
    let command: PublishStandardsCommand;
    let standardVersionA: ReturnType<typeof standardVersionFactory>;
    let standardVersionZ: ReturnType<typeof standardVersionFactory>;
    let standardVersionM: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;

    beforeEach(() => {
      // Create standards with names that should be sorted Z, M, A -> A, M, Z
      standardVersionZ = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Zulu Standard',
        slug: 'zulu-standard',
        version: 1,
      });

      standardVersionM = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Mike Standard',
        slug: 'mike-standard',
        version: 1,
      });

      standardVersionA = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Alpha Standard',
        slug: 'alpha-standard',
        version: 1,
      });

      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
      });

      const gitCommit = {
        id: createGitCommitId(uuidv4()),
        sha: 'abc123def456',
        message: 'Test commit',
        author: 'Test Author <test@example.com>',
        url: 'https://github.com/test-owner/test-repo/commit/abc123def456',
      };

      // Command with standards in Z, M, A order (should be sorted to A, M, Z)
      command = {
        userId,
        organizationId,
        standardVersionIds: [
          standardVersionZ.id,
          standardVersionM.id,
          standardVersionA.id,
        ],
        targetIds: [targetId],
      };

      // Mock responses - order here doesn't matter as we're testing the sorting
      mockStandardsHexa.getStandardVersionById.mockImplementation((id) => {
        if (id === standardVersionA.id)
          return Promise.resolve(standardVersionA);
        if (id === standardVersionM.id)
          return Promise.resolve(standardVersionM);
        if (id === standardVersionZ.id)
          return Promise.resolve(standardVersionZ);
        return Promise.resolve(null);
      });

      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareStandardsDeployment.mockImplementation(
        (cmd) => {
          // Verify that the standards passed to prepareStandardsDeployment are sorted alphabetically
          const sortedNames = cmd.standardVersions.map((sv) => sv.name);
          expect(sortedNames).toEqual([
            'Alpha Standard',
            'Mike Standard',
            'Zulu Standard',
          ]);

          return Promise.resolve({
            createOrUpdate: [
              {
                path: '.packmind/standards/alpha-standard.md',
                content: 'content A',
              },
              {
                path: '.packmind/standards/mike-standard.md',
                content: 'content M',
              },
              {
                path: '.packmind/standards/zulu-standard.md',
                content: 'content Z',
              },
            ],
            delete: [],
          });
        },
      );
      mockGitHexa.commitToGit.mockResolvedValue(gitCommit);
    });

    it('sorts standards alphabetically before sending to file deployer', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DistributionStatus.success);

      // Verify that the standards in the deployment are sorted alphabetically
      const standardNames = result[0].standardVersions.map((sv) => sv.name);
      expect(standardNames).toEqual([
        'Alpha Standard',
        'Mike Standard',
        'Zulu Standard',
      ]);
    });
  });
});
