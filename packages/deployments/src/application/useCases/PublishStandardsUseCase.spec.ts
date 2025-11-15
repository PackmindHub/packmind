import { PublishStandardsUseCase } from './PublishStandardsUseCase';
import { IStandardsPort, ICodingAgentPort, IGitPort } from '@packmind/types';
import { CodingAgents } from '@packmind/coding-agent';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { createUserId, createOrganizationId } from '@packmind/types';
import {
  PublishStandardsCommand,
  DistributionStatus,
  createStandardVersionId,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
  createRuleId,
  GitRepo,
  GitCommit,
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  Standard,
} from '@packmind/types';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { stubLogger } from '@packmind/test-utils';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';

describe('PublishStandardsUseCase', () => {
  let useCase: PublishStandardsUseCase;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockLogger: ReturnType<typeof stubLogger>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const activeCodingAgents = [
    CodingAgents.packmind,
    CodingAgents.agents_md,
    CodingAgents.claude,
  ];

  const activeRenderModes = [
    RenderMode.PACKMIND,
    RenderMode.AGENTS_MD,
    RenderMode.GH_COPILOT,
  ];

  beforeEach(() => {
    mockStandardsPort = {
      getStandard: jest.fn(),
      getStandardVersionById: jest.fn(),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockGitPort = {
      commitToGit: jest.fn(),
      getRepositoryById: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      prepareStandardsDeployment: jest.fn(),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockStandardsDeploymentRepository = {
      add: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

    mockTargetService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockLogger = stubLogger();

    mockRenderModeConfigurationService = {
      resolveActiveCodingAgents: jest.fn(),
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;
    mockRenderModeConfigurationService.resolveActiveCodingAgents.mockResolvedValue(
      activeCodingAgents,
    );
    mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      activeCodingAgents,
    );

    useCase = new PublishStandardsUseCase(
      mockStandardsPort,
      mockGitPort,
      mockCodingAgentPort,
      mockStandardsDeploymentRepository,
      mockTargetService,
      mockRenderModeConfigurationService,
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

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
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

    it('prepares deployment using resolved coding agents', async () => {
      mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
        activeRenderModes,
      );

      await useCase.execute(command);
      expect(
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
      ).toHaveBeenCalledWith(activeRenderModes);
      expect(
        mockCodingAgentPort.prepareStandardsDeployment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ codingAgents: activeCodingAgents }),
      );
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

    describe('when configuration is missing', () => {
      it('uses default render modes', async () => {
        mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
          DEFAULT_ACTIVE_RENDER_MODES,
        );

        await useCase.execute(command);

        expect(
          mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
        ).toHaveBeenCalledWith(DEFAULT_ACTIVE_RENDER_MODES);
        expect(mockStandardsDeploymentRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({ renderModes: DEFAULT_ACTIVE_RENDER_MODES }),
        );
      });
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

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockRejectedValue(deploymentError);
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

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test-standard.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockRejectedValue(noChangesError);
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
      mockStandardsPort.getStandardVersionById.mockImplementation((id) => {
        if (id === standardVersionA.id)
          return Promise.resolve(standardVersionA);
        if (id === standardVersionM.id)
          return Promise.resolve(standardVersionM);
        if (id === standardVersionZ.id)
          return Promise.resolve(standardVersionZ);
        return Promise.resolve(null);
      });

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockImplementation(
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
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
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

  describe('when a previously deployed standard has been deleted', () => {
    let command: PublishStandardsCommand;
    let deletedStandardVersion: ReturnType<typeof standardVersionFactory>;
    let activeStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      // Create first standard that will be deleted
      deletedStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Deleted Standard',
        slug: 'deleted-standard',
        version: 1,
      });

      // Create second standard that is still active
      activeStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Active Standard',
        slug: 'active-standard',
        version: 1,
      });

      gitRepo = {
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

      // Command to deploy only the active standard
      command = {
        userId,
        organizationId,
        standardVersionIds: [activeStandardVersion.id],
        targetIds: [targetId],
      };

      // Mock: active standard returns the version
      mockStandardsPort.getStandardVersionById.mockImplementation((id) => {
        if (id === activeStandardVersion.id)
          return Promise.resolve(activeStandardVersion);
        return Promise.resolve(null);
      });

      // Mock: deleted standard's parent returns null, active standard's parent returns the standard
      mockStandardsPort.getStandard.mockImplementation(
        (id: string): Promise<Standard | null> => {
          if (id === deletedStandardVersion.standardId)
            return Promise.resolve(null);
          if (id === activeStandardVersion.standardId)
            return Promise.resolve({ id } as Standard);
          return Promise.resolve(null);
        },
      );

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);

      // Simulate that the deleted standard was previously deployed
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [deletedStandardVersion],
      );

      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/standards/active-standard.md',
            content: 'content',
          },
        ],
        delete: [],
      });

      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('excludes deleted standard from deployment', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DistributionStatus.success);

      // Verify only the active standard is in the deployment
      expect(result[0].standardVersions).toHaveLength(1);
      expect(result[0].standardVersions[0].id).toBe(activeStandardVersion.id);
      expect(result[0].standardVersions[0].slug).toBe('active-standard');
    });

    it('passes only active standards to prepareStandardsDeployment', async () => {
      await useCase.execute(command);

      expect(
        mockCodingAgentPort.prepareStandardsDeployment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: [
            expect.objectContaining({
              id: activeStandardVersion.id,
              slug: activeStandardVersion.slug,
              name: activeStandardVersion.name,
            }),
          ],
        }),
      );
    });
  });

  describe('when deploying new standards with previously deployed standards', () => {
    let command: PublishStandardsCommand;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let previousStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      // Create a new standard being deployed
      newStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'New Standard',
        slug: 'new-standard',
        version: 1,
        rules: [
          {
            id: createRuleId(uuidv4()),
            content: 'New standard rule 1',
            standardVersionId: createStandardVersionId(uuidv4()),
          },
          {
            id: createRuleId(uuidv4()),
            content: 'New standard rule 2',
            standardVersionId: createStandardVersionId(uuidv4()),
          },
        ],
      });

      // Create a previously deployed standard (without rules populated, simulating DB retrieval)
      previousStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Previous Standard',
        slug: 'previous-standard',
        version: 1,
        // Rules are NOT populated when retrieved from deployment history
        rules: undefined,
      });

      gitRepo = {
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

      // Command to deploy only the new standard
      command = {
        userId,
        organizationId,
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
      };

      // Mock: new standard returns the version with rules
      mockStandardsPort.getStandardVersionById.mockImplementation((id) => {
        if (id === newStandardVersion.id)
          return Promise.resolve(newStandardVersion);
        return Promise.resolve(null);
      });

      // Mock: both standards exist (not deleted)
      mockStandardsPort.getStandard.mockImplementation(
        (id: string): Promise<Standard | null> => {
          if (
            id === newStandardVersion.standardId ||
            id === previousStandardVersion.standardId
          )
            return Promise.resolve({ id } as Standard);
          return Promise.resolve(null);
        },
      );

      // Mock: get rules for previous standard when requested
      mockStandardsPort.getRulesByStandardId = jest
        .fn()
        .mockImplementation((standardId: string) => {
          if (standardId === previousStandardVersion.standardId) {
            return Promise.resolve([
              {
                id: createRuleId(uuidv4()),
                content: 'Previous standard rule 1',
                standardVersionId: previousStandardVersion.id,
              },
              {
                id: createRuleId(uuidv4()),
                content: 'Previous standard rule 2',
                standardVersionId: previousStandardVersion.id,
              },
            ]);
          }
          return Promise.resolve([]);
        });

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);

      // Simulate that the previous standard was deployed before
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [previousStandardVersion],
      );

      // Mock the prepareStandardsDeployment to capture what content is being deployed
      mockCodingAgentPort.prepareStandardsDeployment.mockImplementation(() => {
        // This is where we'll verify the bug: the previous standard file should contain rules
        return Promise.resolve({
          createOrUpdate: [
            {
              path: '.packmind/standards/new-standard.md',
              content:
                '# New Standard\n* New standard rule 1\n* New standard rule 2',
            },
            {
              path: '.packmind/standards/previous-standard.md',
              content:
                '# Previous Standard\n* Previous standard rule 1\n* Previous standard rule 2',
            },
          ],
          delete: [],
        });
      });

      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('includes both new and previous standards in deployment', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DistributionStatus.success);

      // Verify that prepareStandardsDeployment was called with both standards
      expect(
        mockCodingAgentPort.prepareStandardsDeployment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: expect.arrayContaining([
            expect.objectContaining({ slug: 'new-standard' }),
            expect.objectContaining({ slug: 'previous-standard' }),
          ]),
        }),
      );
    });

    it('ensures previous standard has rules loaded before deployment', async () => {
      await useCase.execute(command);

      // Get the actual call arguments
      const callArgs =
        mockCodingAgentPort.prepareStandardsDeployment.mock.calls[0][0];
      const standardVersions = callArgs.standardVersions;

      // Find the previous standard in the call
      const previousStandard = standardVersions.find(
        (sv) => sv.slug === 'previous-standard',
      );

      expect(previousStandard).toBeDefined();

      // This is the key assertion: the previous standard should have rules loaded
      // Currently this WILL FAIL because rules are not loaded for previously deployed standards
      expect(previousStandard?.rules).toBeDefined();
      expect(previousStandard?.rules).toHaveLength(2);
      expect(previousStandard?.rules?.[0]?.content).toBe(
        'Previous standard rule 1',
      );
    });
  });
});
