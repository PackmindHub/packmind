import { PublishArtifactsUseCase } from './PublishArtifactsUseCase';
import { CodingAgents } from '@packmind/coding-agent';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { createUserId, createOrganizationId } from '@packmind/types';
import {
  PublishArtifactsCommand,
  DistributionStatus,
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  createRecipeVersionId,
  createStandardVersionId,
  createSkillVersionId,
  createSkillFileId,
  createSkillId,
  createRecipeId,
  createStandardId,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
  createRuleId,
  GitRepo,
  GitCommit,
  IRecipesPort,
  ISkillsPort,
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
  IDeployDefaultSkillsUseCase,
  Rule,
  SkillFile,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { skillVersionFactory } from '@packmind/skills/test/skillVersionFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import assert from 'assert';
import { PublishArtifactsDelayedJob } from '../jobs/PublishArtifactsDelayedJob';

describe('PublishArtifactsUseCase', () => {
  let useCase: PublishArtifactsUseCase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
  let mockPublishArtifactsDelayedJob: jest.Mocked<PublishArtifactsDelayedJob>;
  let mockDeployDefaultSkillsUseCase: jest.Mocked<IDeployDefaultSkillsUseCase>;
  let mockLogger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const activeCodingAgents = [
    CodingAgents.packmind,
    CodingAgents.agents_md,
    CodingAgents.copilot,
  ];
  const activeRenderModes = [
    RenderMode.PACKMIND,
    RenderMode.AGENTS_MD,
    RenderMode.GH_COPILOT,
  ];

  beforeEach(() => {
    mockLogger = stubLogger();

    mockRecipesPort = {
      getRecipeVersionById: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getStandardVersionById: jest.fn(),
      getRulesByStandardId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkillVersion: jest.fn(),
      getSkillFiles: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockGitPort = {
      commitToGit: jest.fn(),
      getRepositoryById: jest.fn(),
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      renderArtifacts: jest.fn(),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockDistributionRepository = {
      add: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
      findActiveRecipeVersionsByTarget: jest.fn(),
      findActiveSkillVersionsByTarget: jest.fn(),
      findActiveStandardVersionsByTargetAndPackages: jest.fn(),
      findActiveRecipeVersionsByTargetAndPackages: jest.fn(),
      findActiveSkillVersionsByTargetAndPackages: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    // Default empty arrays for skill-related methods (can be overridden in test blocks)
    mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
      [],
    );
    mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
      [],
    );

    mockTargetService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
      activeRenderModes,
    );
    mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      activeCodingAgents,
    );

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    mockPublishArtifactsDelayedJob = {
      addJob: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PublishArtifactsDelayedJob>;

    mockDeployDefaultSkillsUseCase = {
      execute: jest.fn().mockResolvedValue({
        fileUpdates: { createOrUpdate: [], delete: [] },
      }),
    } as unknown as jest.Mocked<IDeployDefaultSkillsUseCase>;

    useCase = new PublishArtifactsUseCase(
      mockRecipesPort,
      mockStandardsPort,
      mockSkillsPort,
      mockGitPort,
      mockCodingAgentPort,
      mockDistributionRepository,
      mockTargetService,
      mockRenderModeConfigurationService,
      mockEventEmitterService,
      mockPublishArtifactsDelayedJob,
      mockDeployDefaultSkillsUseCase,
      undefined,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployment is successful with both recipes and standards', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
        version: 1,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Test Standard',
        slug: 'test-standard',
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
        name: 'Production',
        path: 'docs',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
        activeRenderModes,
      );
      mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
        activeCodingAgents,
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
          {
            path: '.packmind/standards/test-standard.md',
            content: 'standard content',
          },
        ],
        delete: [],
      });
    });

    describe('when execute is called', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(command);
      });

      it('returns exactly one distribution', () => {
        expect(result.distributions).toHaveLength(1);
      });

      it('returns distributions with empty distributedPackages', () => {
        // distributedPackages are created by PublishPackagesUseCase, not PublishArtifactsUseCase
        expect(result.distributions[0].distributedPackages).toEqual([]);
      });

      it('stores distribution with in_progress status', () => {
        expect(result.distributions[0].status).toBe(
          DistributionStatus.in_progress,
        );
      });

      it('stores distribution without git commit', () => {
        expect(result.distributions[0].gitCommit).toBeUndefined();
      });
    });

    it('calls renderArtifacts with both recipe and standard versions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: {
            recipeVersions: [recipeVersion],
            standardVersions: [
              expect.objectContaining({
                ...standardVersion,
                rules: [],
              }),
            ],
            skillVersions: [],
          },
          removed: {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          codingAgents: activeCodingAgents,
        }),
      );
    });

    describe('when mapping render modes to coding agents', () => {
      beforeEach(async () => {
        await useCase.execute(command);
      });

      it('retrieves active render modes for organization', () => {
        expect(
          mockRenderModeConfigurationService.getActiveRenderModes,
        ).toHaveBeenCalledWith(organizationId);
      });

      it('maps render modes to coding agents', () => {
        expect(
          mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
        ).toHaveBeenCalledWith(activeRenderModes);
      });
    });

    it('stores distributions with render modes', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].renderModes).toEqual(activeRenderModes);
    });

    it('enqueues exactly one job for the repository', async () => {
      await useCase.execute(command);

      expect(mockPublishArtifactsDelayedJob.addJob).toHaveBeenCalledTimes(1);
    });

    it('enqueues a job with correct parameters', async () => {
      await useCase.execute(command);

      expect(mockPublishArtifactsDelayedJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          gitRepoId: gitRepo.id,
          organizationId,
          userId,
          recipeVersionIds: [recipeVersion.id],
          standardVersionIds: [standardVersion.id],
          skillVersionIds: [],
          fileUpdates: expect.objectContaining({
            createOrUpdate: expect.arrayContaining([
              expect.objectContaining({
                path: expect.stringContaining('recipes'),
              }),
              expect.objectContaining({
                path: expect.stringContaining('standards'),
              }),
            ]),
          }),
          commitMessage: expect.stringContaining(
            'Update artifacts (commands + standards + skills)',
          ),
        }),
      );
    });

    describe('when verifying commit message content', () => {
      let jobInput: { commitMessage: string };

      beforeEach(async () => {
        await useCase.execute(command);
        jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      });

      it('includes recipe name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Test Recipe');
      });

      it('includes recipe slug in commit message', () => {
        expect(jobInput.commitMessage).toContain('test-recipe');
      });

      it('includes standard name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Test Standard');
      });

      it('includes standard slug in commit message', () => {
        expect(jobInput.commitMessage).toContain('test-standard');
      });

      it('includes target name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Production');
      });
    });

    it('includes packmind.json in file updates', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      expect(jobInput.fileUpdates.createOrUpdate).toContainEqual(
        expect.objectContaining({
          path: expect.stringMatching(/packmind\.json$/),
        }),
      );
    });
  });

  describe('when deploying recipes only', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    describe('when execute is called', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(command);
      });

      it('creates exactly one distribution', () => {
        expect(result.distributions).toHaveLength(1);
      });

      it('creates distribution with empty distributedPackages', () => {
        expect(result.distributions[0].distributedPackages).toEqual([]);
      });
    });

    it('calls renderArtifacts with empty standards array', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            standardVersions: [],
          }),
        }),
      );
    });
  });

  describe('when deploying standards only', () => {
    let command: PublishArtifactsCommand;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    describe('when execute is called', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;

      beforeEach(async () => {
        result = await useCase.execute(command);
      });

      it('creates exactly one distribution', () => {
        expect(result.distributions).toHaveLength(1);
      });

      it('creates distribution with empty distributedPackages', () => {
        expect(result.distributions[0].distributedPackages).toEqual([]);
      });
    });

    it('calls renderArtifacts with empty recipes array', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            recipeVersions: [],
          }),
        }),
      );
    });
  });

  describe('when enqueuing the job', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('creates distributions with in_progress status', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].status).toBe(
        DistributionStatus.in_progress,
      );
    });

    it('creates distributions without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].gitCommit).toBeUndefined();
    });

    it('saves distribution to repository with in_progress status', async () => {
      await useCase.execute(command);

      expect(mockDistributionRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          status: DistributionStatus.in_progress,
        }),
      );
    });

    it('enqueues a job with the distribution id', async () => {
      await useCase.execute(command);

      expect(mockPublishArtifactsDelayedJob.addJob).toHaveBeenCalledWith(
        expect.objectContaining({
          distributionId: expect.any(String),
          organizationId,
          userId,
        }),
      );
    });
  });

  describe('when deployment fails', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockRejectedValue(
        new Error('Rendering failed'),
      );
    });

    it('creates failure distribution', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].status).toBe(DistributionStatus.failure);
    });

    it('stores error message in distribution', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].error).toBe('Rendering failed');
    });

    it('creates distribution without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].gitCommit).toBeUndefined();
    });
  });

  describe('when multiple targets share the same repository', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target1: ReturnType<typeof targetFactory>;
    let target2: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const targetId1 = createTargetId(uuidv4());
    const targetId2 = createTargetId(uuidv4());

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target1 = targetFactory({
        id: targetId1,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: 'docs/prod',
      });
      target2 = targetFactory({
        id: targetId2,
        gitRepoId: gitRepo.id,
        name: 'Staging',
        path: 'docs/staging',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId1, targetId2],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById
        .mockResolvedValueOnce(target1)
        .mockResolvedValueOnce(target2);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    describe('when execute is called', () => {
      let result: Awaited<ReturnType<typeof useCase.execute>>;
      let jobInput: { commitMessage: string };

      beforeEach(async () => {
        result = await useCase.execute(command);
        jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      });

      it('creates exactly two distributions', () => {
        expect(result.distributions).toHaveLength(2);
      });

      it('assigns first target to first distribution', () => {
        expect(result.distributions[0].target.id).toBe(targetId1);
      });

      it('assigns second target to second distribution', () => {
        expect(result.distributions[1].target.id).toBe(targetId2);
      });

      it('enqueues only one job for all targets in the same repository', () => {
        expect(mockPublishArtifactsDelayedJob.addJob).toHaveBeenCalledTimes(1);
      });

      it('sets first distribution status to in_progress', () => {
        expect(result.distributions[0].status).toBe(
          DistributionStatus.in_progress,
        );
      });

      it('sets second distribution status to in_progress', () => {
        expect(result.distributions[1].status).toBe(
          DistributionStatus.in_progress,
        );
      });

      it('leaves first distribution gitCommit undefined', () => {
        expect(result.distributions[0].gitCommit).toBeUndefined();
      });

      it('leaves second distribution gitCommit undefined', () => {
        expect(result.distributions[1].gitCommit).toBeUndefined();
      });

      it('calls renderArtifacts once per target', () => {
        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledTimes(2);
      });

      it('includes Production target name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Production');
      });

      it('includes Staging target name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Staging');
      });
    });
  });

  describe('when previous versions exist', () => {
    let command: PublishArtifactsCommand;
    let newRecipeVersion: ReturnType<typeof recipeVersionFactory>;
    let oldRecipeVersion: ReturnType<typeof recipeVersionFactory>;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let oldStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      const recipeId = createRecipeId(uuidv4());
      const standardId = createStandardId(uuidv4());

      newRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId,
        name: 'Recipe A',
        version: 2,
      });
      oldRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId,
        name: 'Recipe A',
        version: 1,
      });

      newStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId,
        name: 'Standard A',
        version: 2,
      });
      oldStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId,
        name: 'Standard A',
        version: 1,
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [newRecipeVersion.id],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(newRecipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        newStandardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [oldRecipeVersion],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [oldStandardVersion],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('combines previous and new recipe versions for rendering', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            recipeVersions: expect.arrayContaining([
              expect.objectContaining({ version: 2 }),
            ]),
          }),
        }),
      );
    });

    it('combines previous and new standard versions for rendering', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            standardVersions: expect.arrayContaining([
              expect.objectContaining({ version: 2 }),
            ]),
          }),
        }),
      );
    });

    it('stores distribution with empty distributedPackages', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].distributedPackages).toEqual([]);
    });
  });

  describe('when target does not exist', () => {
    it('throws error', async () => {
      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        targetIds: [createTargetId(uuidv4())],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow('Target with id');
    });
  });

  describe('when repository does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository with id',
      );
    });
  });

  describe('when recipe version does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [createRecipeVersionId(uuidv4())],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.getRecipeVersionById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Command version with ID',
      );
    });
  });

  describe('when standard version does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [createStandardVersionId(uuidv4())],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Standard version with ID',
      );
    });
  });

  describe('when no targets are provided', () => {
    it('throws error', async () => {
      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        targetIds: [],
        packagesSlugs: [],
        packageIds: [],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'At least one target must be provided',
      );
    });
  });

  describe('when configuration is missing', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
      });
      const target = targetFactory({ id: targetId });
      const gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });

      result = await useCase.execute(command);
    });

    it('maps default render modes to coding agents', () => {
      expect(
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
      ).toHaveBeenCalledWith(DEFAULT_ACTIVE_RENDER_MODES);
    });

    it('stores distribution with default render modes', () => {
      expect(result.distributions[0].renderModes).toEqual(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
    });
  });

  describe('when previously deployed artifacts are removed', () => {
    let command: PublishArtifactsCommand;
    let newRecipeVersion: ReturnType<typeof recipeVersionFactory>;
    let previousRecipeVersion: ReturnType<typeof recipeVersionFactory>;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let previousStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      // New recipe to deploy (different recipeId than previous)
      newRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: createRecipeId('recipe-new'),
        name: 'New Recipe',
        slug: 'new-recipe',
        version: 1,
      });

      // Previously deployed recipe that will NOT be in the new deployment (to be removed)
      previousRecipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: createRecipeId('recipe-old'),
        name: 'Old Recipe',
        slug: 'old-recipe',
        version: 1,
      });

      // New standard to deploy (different standardId than previous)
      newStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: createStandardId('standard-new'),
        name: 'New Standard',
        slug: 'new-standard',
        version: 1,
        rules: [],
      });

      // Previously deployed standard that will NOT be in the new deployment (to be removed)
      previousStandardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: createStandardId('standard-old'),
        name: 'Old Standard',
        slug: 'old-standard',
        version: 1,
        rules: [],
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Deploy only new versions (not the previously deployed ones)
      command = {
        userId,
        organizationId,
        recipeVersionIds: [newRecipeVersion.id],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(newRecipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        newStandardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // Return previously deployed versions that are NOT in the new deployment
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [previousRecipeVersion],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [previousStandardVersion],
      );
      // For removal calculation, return the same data from filtered methods
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [previousRecipeVersion],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [previousStandardVersion],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/new-recipe.md', content: 'content' },
          { path: '.packmind/standards/new-standard.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('passes removed recipe versions to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            recipeVersions: expect.arrayContaining([
              expect.objectContaining({
                recipeId: previousRecipeVersion.recipeId,
              }),
            ]),
          }),
        }),
      );
    });

    it('passes removed standard versions to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            standardVersions: expect.arrayContaining([
              expect.objectContaining({
                standardId: previousStandardVersion.standardId,
              }),
            ]),
          }),
        }),
      );
    });

    it('includes new recipes in installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedRecipeIds =
        renderArtifactsCall.installed.recipeVersions.map(
          (rv: { recipeId: string }) => rv.recipeId,
        );

      expect(installedRecipeIds).toContain(newRecipeVersion.recipeId);
    });

    it('excludes removed recipes from installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedRecipeIds =
        renderArtifactsCall.installed.recipeVersions.map(
          (rv: { recipeId: string }) => rv.recipeId,
        );

      expect(installedRecipeIds).not.toContain(previousRecipeVersion.recipeId);
    });

    it('includes new standards in installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedStandardIds =
        renderArtifactsCall.installed.standardVersions.map(
          (sv: { standardId: string }) => sv.standardId,
        );

      expect(installedStandardIds).toContain(newStandardVersion.standardId);
    });

    it('excludes removed standards from installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedStandardIds =
        renderArtifactsCall.installed.standardVersions.map(
          (sv: { standardId: string }) => sv.standardId,
        );

      expect(installedStandardIds).not.toContain(
        previousStandardVersion.standardId,
      );
    });
  });

  describe('when no artifacts are removed', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: createRecipeId('recipe-1'),
        name: 'Recipe',
        slug: 'recipe',
        version: 1,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: createStandardId('standard-1'),
        name: 'Standard',
        slug: 'standard',
        version: 1,
        rules: [],
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // No previously deployed versions
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/recipe.md', content: 'content' },
          { path: '.packmind/standards/standard.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('passes empty removed arrays to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        }),
      );
    });
  });

  describe('when deploying with previously deployed standards that lack rules', () => {
    let command: PublishArtifactsCommand;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let previousStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const newStandardVersionId = createStandardVersionId(uuidv4());
    const previousStandardVersionId = createStandardVersionId(uuidv4());
    const mockRules: Rule[] = [
      {
        id: createRuleId(uuidv4()),
        content: 'Test rule content',
        standardVersionId: previousStandardVersionId,
      },
    ];

    beforeEach(() => {
      newStandardVersion = standardVersionFactory({
        id: newStandardVersionId,
        standardId: createStandardId('standard-new'),
        name: 'New Standard',
        slug: 'new-standard',
        version: 1,
        rules: mockRules,
      });

      // Previously deployed standard WITHOUT rules (simulating database fetch)
      previousStandardVersion = standardVersionFactory({
        id: previousStandardVersionId,
        standardId: createStandardId('standard-old'),
        name: 'Old Standard',
        slug: 'old-standard',
        version: 1,
        rules: undefined, // Rules not populated from database
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        newStandardVersion,
      );
      mockStandardsPort.getRulesByStandardId = jest
        .fn()
        .mockResolvedValue(mockRules);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      // Return previously deployed standard WITHOUT rules
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [previousStandardVersion],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/standards/new-standard.md',
            content: 'standard content',
          },
        ],
        delete: [],
      });
    });

    it('loads rules for previously deployed standards', async () => {
      await useCase.execute(command);

      expect(mockStandardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        previousStandardVersion.standardId,
      );
    });

    it('passes standards with loaded rules to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            standardVersions: expect.arrayContaining([
              expect.objectContaining({
                id: newStandardVersion.id,
                rules: mockRules,
              }),
              expect.objectContaining({
                id: previousStandardVersion.id,
                rules: mockRules,
              }),
            ]),
          }),
        }),
      );
    });

    it('ensures all standards have rules before rendering', async () => {
      await useCase.execute(command);

      const renderCall = mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const standardsWithoutRules =
        renderCall.installed.standardVersions.filter(
          (sv: { rules?: unknown[] }) => !sv.rules || sv.rules.length === 0,
        );

      expect(standardsWithoutRules).toHaveLength(0);
    });
  });

  describe('when deploying with packagesSlugs', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-one', 'package-two'],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('includes packmind.json in file updates', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      expect(packmindJsonFile).toBeDefined();
    });

    it('includes package-one slug in packmind.json content', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      expect(packmindJsonFile.content).toContain('package-one');
    });

    it('includes package-two slug in packmind.json content', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      expect(packmindJsonFile.content).toContain('package-two');
    });

    it('generates valid JSON content for packmind.json', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      const parsedContent = JSON.parse(packmindJsonFile.content);

      expect(parsedContent.packages).toEqual({
        'package-one': '*',
        'package-two': '*',
      });
    });
  });

  describe('when existing packmind.json exists in repository', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      // Return existing packmind.json with packages
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'existing-sha',
        content: JSON.stringify({
          packages: {
            'existing-package-a': '*',
            'existing-package-b': '*',
          },
        }),
      });
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('merges new packages with existing packages', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      const parsedContent = JSON.parse(packmindJsonFile.content);

      expect(parsedContent.packages).toEqual({
        'existing-package-a': '*',
        'existing-package-b': '*',
        'new-package': '*',
      });
    });

    it('preserves existing-package-a in merged result', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      const parsedContent = JSON.parse(packmindJsonFile.content);

      expect(parsedContent.packages['existing-package-a']).toBe('*');
    });

    it('preserves existing-package-b in merged result', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      const parsedContent = JSON.parse(packmindJsonFile.content);

      expect(parsedContent.packages['existing-package-b']).toBe('*');
    });

    it('fetches existing packmind.json from git', async () => {
      await useCase.execute(command);

      const calls = mockGitPort.getFileFromRepo.mock.calls;
      const packmindJsonCall = calls.find(
        (call) => call[1] === 'packmind.json',
      );

      expect(packmindJsonCall).toBeDefined();
    });
  });

  describe('when existing packmind.json has target path prefix', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Production',
        path: 'apps/frontend',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'existing-sha',
        content: JSON.stringify({
          packages: {
            'existing-package': '*',
          },
        }),
      });
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('fetches packmind.json from target path', async () => {
      await useCase.execute(command);

      const calls = mockGitPort.getFileFromRepo.mock.calls;
      const packmindJsonCall = calls.find(
        (call) => call[1] === 'apps/frontend/packmind.json',
      );

      expect(packmindJsonCall).toBeDefined();
    });
  });

  describe('when packmind.json does not exist in repository', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      // No existing packmind.json
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('creates packmind.json with only new packages', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const packmindJsonFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path.endsWith('packmind.json'),
      );

      assert(packmindJsonFile, 'packmindJsonFile should be defined');
      assert(
        packmindJsonFile.content,
        'packmindJsonFile.content should be defined',
      );
      const parsedContent = JSON.parse(packmindJsonFile.content);

      expect(parsedContent.packages).toEqual({
        'new-package': '*',
      });
    });
  });

  describe('when deploying skills with files', () => {
    let command: PublishArtifactsCommand;
    let skillVersion: ReturnType<typeof skillVersionFactory>;
    let skillFiles: SkillFile[];
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      const skillVersionId = createSkillVersionId(uuidv4());
      skillVersion = skillVersionFactory({
        id: skillVersionId,
        name: 'Test Skill',
        slug: 'test-skill',
        version: 1,
      });

      skillFiles = [
        {
          id: createSkillFileId(uuidv4()),
          skillVersionId,
          path: 'helper.js',
          content: 'console.log("helper");',
          permissions: '644',
          isBase64: false,
        },
        {
          id: createSkillFileId(uuidv4()),
          skillVersionId,
          path: 'config.json',
          content: '{"key": "value"}',
          permissions: '644',
          isBase64: false,
        },
      ];

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
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [skillVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockSkillsPort.getSkillVersion.mockResolvedValue(skillVersion);
      mockSkillsPort.getSkillFiles.mockResolvedValue(skillFiles);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.claude/skills/test-skill/SKILL.md',
            content: 'skill content',
          },
          {
            path: '.claude/skills/test-skill/helper.js',
            content: 'console.log("helper");',
          },
          {
            path: '.claude/skills/test-skill/config.json',
            content: '{"key": "value"}',
          },
        ],
        delete: [],
      });
    });

    it('fetches skill files for each skill version', async () => {
      await useCase.execute(command);

      expect(mockSkillsPort.getSkillFiles).toHaveBeenCalledWith(
        skillVersion.id,
      );
    });

    it('passes skill versions with files to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            skillVersions: expect.arrayContaining([
              expect.objectContaining({
                id: skillVersion.id,
                files: skillFiles,
              }),
            ]),
          }),
        }),
      );
    });

    it('creates distribution with in_progress status', async () => {
      const result = await useCase.execute(command);

      expect(result.distributions[0].status).toBe(
        DistributionStatus.in_progress,
      );
    });
  });

  describe('when skill version does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [createSkillVersionId(uuidv4())],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockSkillsPort.getSkillVersion.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Skill version with ID',
      );
    });
  });

  describe('when a skill is renamed', () => {
    let command: PublishArtifactsCommand;
    let newSkillVersion: ReturnType<typeof skillVersionFactory>;
    let previousSkillVersion: ReturnType<typeof skillVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    let gitCommit: GitCommit;
    const sharedSkillId = createSkillId('shared-skill-id');

    beforeEach(() => {
      // New skill version with NEW slug (same skillId as previous)
      newSkillVersion = skillVersionFactory({
        id: createSkillVersionId(uuidv4()),
        skillId: sharedSkillId,
        name: 'Renamed Skill',
        slug: 'renamed-skill', // NEW slug
        version: 2,
      });

      // Previously deployed skill with OLD slug (same skillId as new)
      previousSkillVersion = skillVersionFactory({
        id: createSkillVersionId(uuidv4()),
        skillId: sharedSkillId,
        name: 'Original Skill',
        slug: 'original-skill', // OLD slug
        version: 1,
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      gitCommit = {
        id: createGitCommitId(uuidv4()),
        sha: 'abc123',
        message: 'Test',
        author: 'Author',
        url: 'https://example.com',
      };

      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [newSkillVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockSkillsPort.getSkillVersion.mockResolvedValue(newSkillVersion);
      mockSkillsPort.getSkillFiles.mockResolvedValue([]);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      // Return previously deployed skill with OLD slug
      mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [previousSkillVersion],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      // For removal calculation, return the old skill version
      mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
        [previousSkillVersion],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.claude/skills/renamed-skill/SKILL.md',
            content: 'skill content',
          },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('passes old skill version to removed.skillVersions for directory cleanup', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            skillVersions: expect.arrayContaining([
              expect.objectContaining({
                slug: 'original-skill', // OLD slug should be in removed list
              }),
            ]),
          }),
        }),
      );
    });

    it('passes new skill version to installed.skillVersions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            skillVersions: expect.arrayContaining([
              expect.objectContaining({
                slug: 'renamed-skill', // NEW slug should be in installed list
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('when deploying to root target', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Root Target',
        path: '/',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockDeployDefaultSkillsUseCase.execute.mockResolvedValue({
        fileUpdates: {
          createOrUpdate: [
            {
              path: '.claude/skills/default-skill/SKILL.md',
              content: 'default skill content',
            },
          ],
          delete: [],
        },
      });

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('includes default skills in file updates', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const defaultSkillFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) =>
          f.path.includes('.claude/skills/default-skill/SKILL.md'),
      );

      expect(defaultSkillFile).toBeDefined();
    });

    it('calls DeployDefaultSkillsUseCase', async () => {
      await useCase.execute(command);

      expect(mockDeployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
        userId,
        organizationId,
      });
    });
  });

  describe('when skill exists only via another package', () => {
    let command: PublishArtifactsCommand;
    let skillVersionFromOtherPackage: ReturnType<typeof skillVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const sharedSkillId = createSkillId('shared-skill-id');

    beforeEach(() => {
      // Skill version that exists ONLY in Package B (not in Package A)
      skillVersionFromOtherPackage = skillVersionFactory({
        id: createSkillVersionId(uuidv4()),
        skillId: sharedSkillId,
        name: 'Shared Skill',
        slug: 'shared-skill',
        version: 1,
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no skills in command)
      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: ['package-a-id'],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      // Skill exists on target via Package B (all packages view)
      mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [skillVersionFromOtherPackage],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      // Package A has NO skills in its distribution (skill is only via Package B)
      mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('does not pass skill to removed.skillVersions since it exists in another package', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            skillVersions: [],
          }),
        }),
      );
    });

    it('keeps skill in installed.skillVersions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            skillVersions: expect.arrayContaining([
              expect.objectContaining({
                skillId: sharedSkillId,
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('when recipe exists only via another package', () => {
    let command: PublishArtifactsCommand;
    let recipeVersionFromOtherPackage: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const sharedRecipeId = createRecipeId('shared-recipe-id');

    beforeEach(() => {
      // Recipe version that exists ONLY in Package B (not in Package A)
      recipeVersionFromOtherPackage = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId: sharedRecipeId,
        name: 'Shared Recipe',
        slug: 'shared-recipe',
        version: 1,
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no recipes in command)
      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: ['package-a-id'],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // Recipe exists on target via Package B (all packages view)
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [recipeVersionFromOtherPackage],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [],
      );
      // Package A has NO recipes in its distribution (recipe is only via Package B)
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('does not pass recipe to removed.recipeVersions since it exists in another package', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            recipeVersions: [],
          }),
        }),
      );
    });

    it('keeps recipe in installed.recipeVersions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            recipeVersions: expect.arrayContaining([
              expect.objectContaining({
                recipeId: sharedRecipeId,
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('when standard exists only via another package', () => {
    let command: PublishArtifactsCommand;
    let standardVersionFromOtherPackage: ReturnType<
      typeof standardVersionFactory
    >;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const sharedStandardId = createStandardId('shared-standard-id');

    beforeEach(() => {
      // Standard version that exists ONLY in Package B (not in Package A)
      standardVersionFromOtherPackage = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId: sharedStandardId,
        name: 'Shared Standard',
        slug: 'shared-standard',
        version: 1,
        rules: [],
      });

      gitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no standards in command)
      command = {
        userId,
        organizationId,
        recipeVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: ['package-a-id'],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      // Standard exists on target via Package B (all packages view)
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [standardVersionFromOtherPackage],
      );
      mockDistributionRepository.findActiveSkillVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      // Package A has NO standards in its distribution (standard is only via Package B)
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveSkillVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('does not pass standard to removed.standardVersions since it exists in another package', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            standardVersions: [],
          }),
        }),
      );
    });

    it('keeps standard in installed.standardVersions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            standardVersions: expect.arrayContaining([
              expect.objectContaining({
                standardId: sharedStandardId,
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('when deploying to non-root target', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Test Recipe',
        slug: 'test-recipe',
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
        name: 'Nested Target',
        path: 'apps/frontend',
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockDistributionRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveRecipeVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockDistributionRepository.findActiveStandardVersionsByTargetAndPackages.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
        ],
        delete: [],
      });
    });

    it('does not include default skills in file updates', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const defaultSkillFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) =>
          f.path.includes('.claude/skills/default-skill/SKILL.md'),
      );

      expect(defaultSkillFile).toBeUndefined();
    });

    it('does not call DeployDefaultSkillsUseCase', async () => {
      await useCase.execute(command);

      expect(mockDeployDefaultSkillsUseCase.execute).not.toHaveBeenCalled();
    });
  });
});
