import { PublishArtifactsUseCase } from './PublishArtifactsUseCase';
import { IDistributionRepository } from '../../domain/repositories/IDistributionRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
} from '@packmind/types';
import {
  PublishArtifactsCommand,
  DistributionStatus,
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  createCommandVersionId,
  createStandardVersionId,
  createSkillVersionId,
  createSkillFileId,
  createSkillId,
  createCommandId,
  createStandardId,
  createTargetId,
  createGitCommitId,
  createRuleId,
  GitRepo,
  GitCommit,
  ICommandsPort,
  ISkillsPort,
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
  IDeployDefaultSkillsUseCase,
  Rule,
  SkillFile,
  CodingAgents,
  DeleteItemType,
  PackmindLockFile,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { commandVersionFactory } from '@packmind/commands/test/commandVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { skillFileFactory } from '@packmind/skills/test/skillFileFactory';
import { skillVersionFactory } from '@packmind/skills/test/skillVersionFactory';
import { gitRepoFactory } from '@packmind/git/test';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';
import assert from 'assert';
import { PublishArtifactsDelayedJob } from '../jobs/PublishArtifactsDelayedJob';
import { TargetNotFoundError } from '../../domain/errors/TargetNotFoundError';

describe('PublishArtifactsUseCase', () => {
  let useCase: PublishArtifactsUseCase;
  let mockCommandsPort: jest.Mocked<ICommandsPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockSkillsPort: jest.Mocked<ISkillsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockDistributionRepository: jest.Mocked<IDistributionRepository>;
  // The publish path fetches all three artifact types, for every target and
  // in both scopes, through the single batched findActiveVersionsByTargets
  // call. These per-artifact stubs let each test block seed the three types
  // independently; the mock implementation in beforeEach assembles them into
  // the batched per-target result.
  let activeVersions: {
    standardVersionsByTarget: jest.Mock;
    commandVersionsByTarget: jest.Mock;
    skillVersionsByTarget: jest.Mock;
    standardVersionsByTargetAndPackages: jest.Mock;
    commandVersionsByTargetAndPackages: jest.Mock;
    skillVersionsByTargetAndPackages: jest.Mock;
  };
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

    mockCommandsPort = {
      getCommandVersionsByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ICommandsPort>;

    mockStandardsPort = {
      getStandardVersionsByIds: jest.fn().mockResolvedValue([]),
      getLatestStandardVersionsWithRules: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockSkillsPort = {
      getSkillVersionsByIds: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ISkillsPort>;

    mockGitPort = {
      commitToGit: jest.fn(),
      getRepositoryById: jest.fn(),
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      renderArtifacts: jest.fn(),
      generateAgentCleanupUpdatesForAgents: jest.fn().mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      }),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockDistributionRepository = {
      add: jest.fn(),
      findActiveVersionsByTargets: jest.fn(),
      // Still used by the removed-agents cleanup branch, one target at a time.
      findActiveVersionsByTarget: jest.fn(),
      findActiveRenderModesByTarget: jest.fn(),
    } as unknown as jest.Mocked<IDistributionRepository>;

    activeVersions = {
      standardVersionsByTarget: jest.fn(),
      commandVersionsByTarget: jest.fn(),
      skillVersionsByTarget: jest.fn(),
      standardVersionsByTargetAndPackages: jest.fn(),
      commandVersionsByTargetAndPackages: jest.fn(),
      skillVersionsByTargetAndPackages: jest.fn(),
    };

    // Default empty arrays for skill-related stubs (can be overridden in test blocks)
    activeVersions.skillVersionsByTarget.mockResolvedValue([]);
    activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
    mockDistributionRepository.findActiveRenderModesByTarget.mockResolvedValue(
      [],
    );
    mockDistributionRepository.findActiveVersionsByTarget.mockImplementation(
      async (orgId, tId) => {
        const [standardVersions, commandVersions, skillVersions] =
          await Promise.all([
            activeVersions.standardVersionsByTarget(orgId, tId),
            activeVersions.commandVersionsByTarget(orgId, tId),
            activeVersions.skillVersionsByTarget(orgId, tId),
          ]);
        return { standardVersions, commandVersions, skillVersions };
      },
    );

    mockDistributionRepository.findActiveVersionsByTargets.mockImplementation(
      async (orgId, targetIds, packageIds) => {
        const activeVersionsByTargetId = new Map();

        for (const tId of targetIds) {
          const [standardVersions, commandVersions, skillVersions] =
            await Promise.all([
              activeVersions.standardVersionsByTarget(orgId, tId),
              activeVersions.commandVersionsByTarget(orgId, tId),
              activeVersions.skillVersionsByTarget(orgId, tId),
            ]);
          const all = { standardVersions, commandVersions, skillVersions };

          // Without a package filter the two scopes are the same thing, which
          // is what the repository itself returns.
          let fromPackages = all;
          if (packageIds) {
            const [
              standardVersionsFromPackages,
              commandVersionsFromPackages,
              skillVersionsFromPackages,
            ] = await Promise.all([
              activeVersions.standardVersionsByTargetAndPackages(
                orgId,
                tId,
                packageIds,
              ),
              activeVersions.commandVersionsByTargetAndPackages(
                orgId,
                tId,
                packageIds,
              ),
              activeVersions.skillVersionsByTargetAndPackages(
                orgId,
                tId,
                packageIds,
              ),
            ]);
            fromPackages = {
              standardVersions: standardVersionsFromPackages,
              commandVersions: commandVersionsFromPackages,
              skillVersions: skillVersionsFromPackages,
            };
          }

          activeVersionsByTargetId.set(tId, { all, fromPackages });
        }

        return activeVersionsByTargetId;
      },
    );

    mockTargetService = {
      findById: jest.fn(),
      findByIdsInOrganization: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
      mapCodingAgentsToRenderModes: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
      activeRenderModes,
    );
    mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      activeCodingAgents,
    );
    mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
      activeRenderModes,
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
      mockCommandsPort,
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
      undefined,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployment is successful with both commands and standards', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Test Standard',
        slug: 'test-standard',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: 'docs',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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

      it('fetches every command version in a single call', () => {
        expect(mockCommandsPort.getCommandVersionsByIds).toHaveBeenCalledWith([
          commandVersion.id,
        ]);
      });

      it('fetches every standard version in a single call', () => {
        expect(mockStandardsPort.getStandardVersionsByIds).toHaveBeenCalledWith(
          [standardVersion.id],
        );
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

      it('emits a DeploymentCompletedEvent with the requested artifact counts', () => {
        expect(mockEventEmitterService.emit).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              targetIds: [targetId],
              recipeCount: 1,
              standardCount: 1,
            }),
          }),
        );
      });
    });

    it('calls renderArtifacts with both command and standard versions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: {
            recipeVersions: [commandVersion],
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
          commandVersionIds: [commandVersion.id],
          standardVersionIds: [standardVersion.id],
          skillVersionIds: [],
          fileUpdates: expect.objectContaining({
            createOrUpdate: expect.arrayContaining([
              expect.objectContaining({
                path: expect.stringContaining('commands'),
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

      it('includes command name in commit message', () => {
        expect(jobInput.commitMessage).toContain('Test Command');
      });

      it('includes command slug in commit message', () => {
        expect(jobInput.commitMessage).toContain('test-command');
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

    it('includes packmind-lock.json in file updates', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'docs/packmind-lock.json',
      );

      expect(lockFile).toBeDefined();
    });

    it('generates valid lock file with lockfileVersion 1', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'docs/packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.lockfileVersion).toBe(2);
    });

    it('generates lock file with target id', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'docs/packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.targetId).toBe(targetId);
    });
  });

  describe('when deploying commands only', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/test.md', content: 'content' },
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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

    it('calls renderArtifacts with empty commands array', async () => {
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/test.md', content: 'content' },
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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

    it('emits a DeploymentCompletedEvent despite the repository failure', async () => {
      await useCase.execute(command);

      expect(mockEventEmitterService.emit).toHaveBeenCalledTimes(1);
    });
  });

  describe('when multiple targets share the same repository', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target1: ReturnType<typeof targetFactory>;
    let target2: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const targetId1 = createTargetId(uuidv4());
    const targetId2 = createTargetId(uuidv4());

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
      });
      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
      });

      gitRepo = gitRepoFactory();

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
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId1, targetId2],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById
        .mockResolvedValueOnce(target1)
        .mockResolvedValueOnce(target2);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([
        target1,
        target2,
      ]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/test.md', content: 'content' },
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

      it('fetches the active versions of every target in one call', () => {
        // Both scopes, for both targets, out of a single batched read: the
        // cost no longer grows with the number of targets.
        expect(
          mockDistributionRepository.findActiveVersionsByTargets,
        ).toHaveBeenCalledTimes(1);
      });

      it('asks for both targets at once', () => {
        expect(
          mockDistributionRepository.findActiveVersionsByTargets,
        ).toHaveBeenCalledWith(organizationId, [targetId1, targetId2], []);
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
    let newCommandVersion: ReturnType<typeof commandVersionFactory>;
    let oldCommandVersion: ReturnType<typeof commandVersionFactory>;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let oldStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      const commandId = createCommandId(uuidv4());
      const standardId = createStandardId(uuidv4());

      newCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: commandId,
        name: 'Command A',
        version: 2,
      });
      oldCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: commandId,
        name: 'Command A',
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [newCommandVersion.id],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        newCommandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        newStandardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([
        oldCommandVersion,
      ]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([
        oldStandardVersion,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/test.md', content: 'content' },
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('combines previous and new command versions for rendering', async () => {
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
    it('throws TargetNotFoundError', async () => {
      const nonExistentTargetId = createTargetId(uuidv4());
      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        targetIds: [nonExistentTargetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findByIdsInOrganization.mockRejectedValue(
        new TargetNotFoundError(nonExistentTargetId),
      );

      await expect(useCase.execute(command)).rejects.toThrow(
        TargetNotFoundError,
      );
    });
  });

  describe('when repository does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Repository with id',
      );
    });
  });

  describe('when command version does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const gitRepo = gitRepoFactory();

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [createCommandVersionId(uuidv4())],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([]);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Command version with ID',
      );
    });
  });

  describe('when standard version does not exist', () => {
    it('throws error', async () => {
      const target = targetFactory({ id: targetId });
      const gitRepo = gitRepoFactory();

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [createStandardVersionId(uuidv4())],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([]);

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
        commandVersionIds: [],
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

  describe('when a target does not belong to the organization', () => {
    it('throws TargetNotFoundError', async () => {
      const crossOrgTargetId = createTargetId(uuidv4());

      mockTargetService.findByIdsInOrganization.mockRejectedValue(
        new TargetNotFoundError(crossOrgTargetId),
      );

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [createCommandVersionId(uuidv4())],
        standardVersionIds: [],
        targetIds: [crossOrgTargetId],
        packagesSlugs: [],
        packageIds: [],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        TargetNotFoundError,
      );
    });
  });

  describe('when configuration is missing', () => {
    let result: Awaited<ReturnType<typeof useCase.execute>>;

    beforeEach(async () => {
      const commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
      });
      const target = targetFactory({ id: targetId });
      const gitRepo = gitRepoFactory();

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
      mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValueOnce(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/test.md', content: 'content' },
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
    let newCommandVersion: ReturnType<typeof commandVersionFactory>;
    let previousCommandVersion: ReturnType<typeof commandVersionFactory>;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let previousStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      // New command to deploy (different recipeId than previous)
      newCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: createCommandId('command-new'),
        name: 'New Command',
        slug: 'new-command',
        version: 1,
      });

      // Previously deployed command that will NOT be in the new deployment (to be removed)
      previousCommandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: createCommandId('command-old'),
        name: 'Old Command',
        slug: 'old-command',
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Deploy only new versions (not the previously deployed ones)
      command = {
        userId,
        organizationId,
        commandVersionIds: [newCommandVersion.id],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        newCommandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        newStandardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // Return previously deployed versions that are NOT in the new deployment
      activeVersions.commandVersionsByTarget.mockResolvedValue([
        previousCommandVersion,
      ]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([
        previousStandardVersion,
      ]);
      // For removal calculation, return the same data from filtered methods
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([
        previousCommandVersion,
      ]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([
        previousStandardVersion,
      ]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/new-command.md', content: 'content' },
          { path: '.packmind/standards/new-standard.md', content: 'content' },
        ],
        delete: [],
      });
    });

    it('passes removed command versions to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            recipeVersions: expect.arrayContaining([
              expect.objectContaining({
                recipeId: previousCommandVersion.recipeId,
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

    it('includes new commands in installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedCommandIds =
        renderArtifactsCall.installed.recipeVersions.map(
          (cv: { recipeId: string }) => cv.recipeId,
        );

      expect(installedCommandIds).toContain(newCommandVersion.recipeId);
    });

    it('excludes removed commands from installed', async () => {
      await useCase.execute(command);

      const renderArtifactsCall =
        mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const installedCommandIds =
        renderArtifactsCall.installed.recipeVersions.map(
          (cv: { recipeId: string }) => cv.recipeId,
        );

      expect(installedCommandIds).not.toContain(
        previousCommandVersion.recipeId,
      );
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: createCommandId('command-1'),
        name: 'Command',
        slug: 'command',
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // No previously deployed versions
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/commands/command.md', content: 'content' },
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        newStandardVersion,
      ]);
      mockStandardsPort.getLatestStandardVersionsWithRules.mockResolvedValue([
        { ...previousStandardVersion, rules: mockRules },
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      // Return previously deployed standard WITHOUT rules
      activeVersions.standardVersionsByTarget.mockResolvedValue([
        previousStandardVersion,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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

    it('loads the rules of every rules-less standard in a single call', async () => {
      await useCase.execute(command);

      expect(
        mockStandardsPort.getLatestStandardVersionsWithRules,
      ).toHaveBeenCalledWith([previousStandardVersion.standardId]);
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

  describe('when deploying with previously deployed skills that lack files', () => {
    let command: PublishArtifactsCommand;
    let newSkillVersion: ReturnType<typeof skillVersionFactory>;
    let previousSkillVersion: ReturnType<typeof skillVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const newSkillVersionId = createSkillVersionId(uuidv4());
    const previousSkillVersionId = createSkillVersionId(uuidv4());
    const mockFiles: SkillFile[] = [
      skillFileFactory({
        id: createSkillFileId(uuidv4()),
        skillVersionId: previousSkillVersionId,
        path: 'references/guide.md',
        content: 'Reference guide content',
      }),
    ];

    beforeEach(() => {
      newSkillVersion = skillVersionFactory({
        id: newSkillVersionId,
        skillId: createSkillId('skill-new'),
        name: 'New Skill',
        slug: 'new-skill',
        version: 1,
        files: [],
      });

      // Previously deployed skill WITHOUT files (simulating database fetch)
      previousSkillVersion = skillVersionFactory({
        id: previousSkillVersionId,
        skillId: createSkillId('skill-old'),
        name: 'Old Skill',
        slug: 'old-skill',
        version: 1,
        files: undefined,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [newSkillVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockSkillsPort.getSkillVersionsByIds.mockImplementation(async (ids) =>
        [newSkillVersion, { ...previousSkillVersion, files: mockFiles }].filter(
          (version) => ids.includes(version.id),
        ),
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      // Return previously deployed skill WITHOUT files
      activeVersions.skillVersionsByTarget.mockResolvedValue([
        previousSkillVersion,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.claude/skills/new-skill/SKILL.md',
            content: 'skill content',
          },
        ],
        delete: [],
      });
    });

    it('loads files for previously deployed skills', async () => {
      await useCase.execute(command);

      expect(mockSkillsPort.getSkillVersionsByIds).toHaveBeenCalledWith([
        previousSkillVersion.id,
      ]);
    });

    it('passes skills with loaded files to renderArtifacts', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            skillVersions: expect.arrayContaining([
              expect.objectContaining({
                id: newSkillVersion.id,
                files: [],
              }),
              expect.objectContaining({
                id: previousSkillVersion.id,
                files: mockFiles,
              }),
            ]),
          }),
        }),
      );
    });

    it('ensures no skill version has undefined files before rendering', async () => {
      await useCase.execute(command);

      const renderCall = mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const skillsWithoutFiles = renderCall.installed.skillVersions.filter(
        (sv: { files?: unknown }) => sv.files === undefined,
      );

      expect(skillsWithoutFiles).toHaveLength(0);
    });
  });

  describe('when deploying with packagesSlugs', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-one', 'package-two'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: 'apps/frontend',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
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
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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

  describe('when target path has leading slash', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '/apps/frontend',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'existing-sha',
        content: JSON.stringify({
          packages: {
            'existing-package': '*',
          },
          agents: ['cursor', 'claude'],
        }),
      });
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
          },
        ],
        delete: [],
      });
    });

    it('fetches packmind.json from correct path without leading slash', async () => {
      await useCase.execute(command);

      const calls = mockGitPort.getFileFromRepo.mock.calls;
      const packmindJsonCall = calls.find(
        (call) => call[1] === 'apps/frontend/packmind.json',
      );

      expect(packmindJsonCall).toBeDefined();
    });

    it('preserves agents from existing packmind.json', async () => {
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

      expect(parsedContent.agents).toEqual(['cursor', 'claude']);
    });

    it('merges existing packages with new package', async () => {
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
        'existing-package': '*',
        'new-package': '*',
      });
    });
  });

  describe('when packmind.json does not exist in repository', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['new-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      // No existing packmind.json
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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
    let carriedSkillVersion: ReturnType<typeof skillVersionFactory>;
    let carriedSkillFiles: SkillFile[];
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

      // Carried over from a previous deployment (not part of this command's
      // skillVersionIds): it reaches the installed list only through the
      // unfiltered findActiveSkillVersionsByTarget history read, which never
      // carries `files`. This is the only way to put a version into
      // skillVersionIdsMissingFiles and exercise the batched hydration call,
      // as opposed to the up-front fetch of skillVersion.id above.
      const carriedSkillVersionId = createSkillVersionId(uuidv4());
      carriedSkillVersion = skillVersionFactory({
        id: carriedSkillVersionId,
        name: 'Carried Skill',
        slug: 'carried-skill',
        version: 1,
        files: undefined,
      });

      carriedSkillFiles = [
        {
          id: createSkillFileId(uuidv4()),
          skillVersionId: carriedSkillVersionId,
          path: 'carried.md',
          content: 'Carried skill content',
          permissions: '644',
          isBase64: false,
        },
      ];

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [skillVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockSkillsPort.getSkillVersionsByIds.mockImplementation(async (ids) =>
        [
          { ...skillVersion, files: skillFiles },
          { ...carriedSkillVersion, files: carriedSkillFiles },
        ].filter((version) => ids.includes(version.id)),
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.skillVersionsByTarget.mockResolvedValue([
        carriedSkillVersion,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
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

    it('fetches missing skill version files through a dedicated hydration call', async () => {
      await useCase.execute(command);

      expect(mockSkillsPort.getSkillVersionsByIds).toHaveBeenCalledWith([
        carriedSkillVersion.id,
      ]);
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
              expect.objectContaining({
                id: carriedSkillVersion.id,
                files: carriedSkillFiles,
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
      const gitRepo = gitRepoFactory();

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [createSkillVersionId(uuidv4())],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockSkillsPort.getSkillVersionsByIds.mockResolvedValue([]);

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

      gitRepo = gitRepoFactory();

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
        commandVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [newSkillVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockSkillsPort.getSkillVersionsByIds.mockResolvedValue([newSkillVersion]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      // Return previously deployed skill with OLD slug
      activeVersions.skillVersionsByTarget.mockResolvedValue([
        previousSkillVersion,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      // For removal calculation, return the old skill version
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([
        previousSkillVersion,
      ]);
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Root Target',
        path: '/',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
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
        skippedSkillsCount: 0,
        lockFileSlice: {},
      });

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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

    it('calls DeployDefaultSkillsUseCase with org-level agents', async () => {
      await useCase.execute(command);

      expect(mockDeployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
        userId,
        organizationId,
        agents: activeCodingAgents,
        excludeDeprecated: true,
      });
    });

    it('asks DeployDefaultSkillsUseCase to exclude deprecated skills', async () => {
      await useCase.execute(command);

      const executeCall =
        mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
      expect(executeCall.excludeDeprecated).toBe(true);
    });
  });

  describe('when deploying default skills to a repository with a lock file', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    const isLockFilePath = (path: string) =>
      path.endsWith('packmind-lock.json');

    const mockLockFileContent = (
      lockFile: Partial<PackmindLockFile> | null,
    ) => {
      mockGitPort.getFileFromRepo.mockImplementation(
        async (_gitRepo: GitRepo, path: string) => {
          if (isLockFilePath(path) && lockFile) {
            return { sha: 'lock-sha', content: JSON.stringify(lockFile) };
          }
          return null;
        },
      );
    };

    const lockFileReadCount = () =>
      mockGitPort.getFileFromRepo.mock.calls.filter(([, path]) =>
        isLockFilePath(path as string),
      ).length;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Root Target',
        path: '/',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
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
        skippedSkillsCount: 0,
        lockFileSlice: {},
      });

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
          },
        ],
        delete: [],
      });
      mockLockFileContent(null);
    });

    describe('when the lock file records a pre-rename CLI version', () => {
      beforeEach(() => {
        mockLockFileContent({
          lockfileVersion: 2,
          cliVersion: '0.23.0',
          packageSlugs: [],
          agents: activeCodingAgents,
          artifacts: {},
        });
      });

      it('passes that CLI version to the default skills deployment', async () => {
        await useCase.execute(command);

        const executeCall =
          mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
        expect(executeCall.cliVersion).toBe('0.23.0');
      });
    });

    describe('when the lock file records a modern CLI version', () => {
      beforeEach(() => {
        mockLockFileContent({
          lockfileVersion: 2,
          cliVersion: '0.34.0',
          packageSlugs: [],
          agents: activeCodingAgents,
          artifacts: {},
        });
      });

      it('passes that CLI version to the default skills deployment', async () => {
        await useCase.execute(command);

        const executeCall =
          mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
        expect(executeCall.cliVersion).toBe('0.34.0');
      });
    });

    describe('when the lock file has no cliVersion field', () => {
      beforeEach(() => {
        mockLockFileContent({
          lockfileVersion: 2,
          packageSlugs: [],
          agents: activeCodingAgents,
          artifacts: {},
        });
      });

      it('leaves the CLI version undefined', async () => {
        await useCase.execute(command);

        const executeCall =
          mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
        expect(executeCall.cliVersion).toBeUndefined();
      });
    });

    describe('when the repository has no lock file', () => {
      it('leaves the CLI version undefined', async () => {
        await useCase.execute(command);

        const executeCall =
          mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
        expect(executeCall.cliVersion).toBeUndefined();
      });
    });

    it('reads the lock file only once per target', async () => {
      mockLockFileContent({
        lockfileVersion: 2,
        cliVersion: '0.23.0',
        packageSlugs: [],
        agents: activeCodingAgents,
        artifacts: {},
      });

      await useCase.execute(command);

      expect(lockFileReadCount()).toBe(1);
    });
  });

  describe('when deploying to root target with packmind.json agents', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    // Normalized: packmind is always added and agents are ordered
    const perTargetAgents = [
      CodingAgents.packmind,
      CodingAgents.claude,
      CodingAgents.cursor,
    ];

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Root Target',
        path: '/',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
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
        skippedSkillsCount: 0,
        lockFileSlice: {},
      });

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
          },
        ],
        delete: [],
      });
    });

    describe('when packmind.json has agents configured', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'packmind.json',
          content: JSON.stringify({
            packages: {},
            agents: ['claude', 'cursor'],
          }),
        });
      });

      it('calls DeployDefaultSkillsUseCase with per-target agents', async () => {
        await useCase.execute(command);

        expect(mockDeployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
          userId,
          organizationId,
          agents: perTargetAgents,
          excludeDeprecated: true,
        });
      });

      it('does not use org-level agents for default skills', async () => {
        await useCase.execute(command);

        const executeCall =
          mockDeployDefaultSkillsUseCase.execute.mock.calls[0][0];
        expect(executeCall.agents).not.toEqual(activeCodingAgents);
      });
    });

    describe('when packmind.json has empty agents array', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'packmind.json',
          content: JSON.stringify({
            packages: {},
            agents: [],
          }),
        });
      });

      it('calls DeployDefaultSkillsUseCase with packmind automatically included', async () => {
        await useCase.execute(command);

        expect(mockDeployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
          userId,
          organizationId,
          agents: [CodingAgents.packmind],
          excludeDeprecated: true,
        });
      });
    });

    describe('when packmind.json has no agents property', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'packmind.json',
          content: JSON.stringify({
            packages: {},
          }),
        });
      });

      it('calls DeployDefaultSkillsUseCase with org-level agents', async () => {
        await useCase.execute(command);

        expect(mockDeployDefaultSkillsUseCase.execute).toHaveBeenCalledWith({
          userId,
          organizationId,
          agents: activeCodingAgents,
          excludeDeprecated: true,
        });
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no skills in command)
      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        skillVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: [createPackageId('package-a-id')],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      // Skill exists on target via Package B (all packages view)
      activeVersions.skillVersionsByTarget.mockResolvedValue([
        skillVersionFromOtherPackage,
      ]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      // Package A has NO skills in its distribution (skill is only via Package B)
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
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

  describe('when command exists only via another package', () => {
    let command: PublishArtifactsCommand;
    let commandVersionFromOtherPackage: ReturnType<
      typeof commandVersionFactory
    >;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const sharedCommandId = createCommandId('shared-command-id');

    beforeEach(() => {
      // Command version that exists ONLY in Package B (not in Package A)
      commandVersionFromOtherPackage = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: sharedCommandId,
        name: 'Shared Command',
        slug: 'shared-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no recipes in command)
      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: [createPackageId('package-a-id')],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      // Command exists on target via Package B (all packages view)
      activeVersions.commandVersionsByTarget.mockResolvedValue([
        commandVersionFromOtherPackage,
      ]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.skillVersionsByTarget.mockResolvedValue([]);
      // Package A has NO commands in its distribution (command is only via Package B)
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    it('does not pass command to removed.recipeVersions since it exists in another package', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          removed: expect.objectContaining({
            recipeVersions: [],
          }),
        }),
      );
    });

    it('keeps command in installed.recipeVersions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          installed: expect.objectContaining({
            recipeVersions: expect.arrayContaining([
              expect.objectContaining({
                recipeId: sharedCommandId,
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

      gitRepo = gitRepoFactory();

      target = targetFactory({ id: targetId, gitRepoId: gitRepo.id });

      // Package A is being redistributed (no standards in command)
      command = {
        userId,
        organizationId,
        commandVersionIds: [],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['package-a'],
        packageIds: [createPackageId('package-a-id')],
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      // Standard exists on target via Package B (all packages view)
      activeVersions.standardVersionsByTarget.mockResolvedValue([
        standardVersionFromOtherPackage,
      ]);
      activeVersions.skillVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      // Package A has NO standards in its distribution (standard is only via Package B)
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
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
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Nested Target',
        path: 'apps/frontend',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
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

  describe('when packmind.json has agents defined', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: 'docs',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['my-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('when agents are specified in packmind.json', () => {
      // Normalized: packmind is always added and agents are ordered
      const perTargetAgents = [
        CodingAgents.packmind,
        CodingAgents.claude,
        CodingAgents.cursor,
      ];

      beforeEach(() => {
        // Return packmind.json with agents defined
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
            agents: ['claude', 'cursor'],
          }),
        });
      });

      it('uses per-target agents with packmind automatically included', async () => {
        await useCase.execute(command);

        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: perTargetAgents,
          }),
        );
      });

      it('does not use org-level agents', async () => {
        await useCase.execute(command);

        const renderCall = mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
        expect(renderCall.codingAgents).not.toEqual(activeCodingAgents);
      });
    });

    describe('when agents is an empty array in packmind.json', () => {
      beforeEach(() => {
        // Return packmind.json with empty agents array
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
            agents: [],
          }),
        });
      });

      it('automatically includes packmind agent', async () => {
        await useCase.execute(command);

        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: [CodingAgents.packmind],
          }),
        );
      });
    });

    describe('when agents do not include packmind in packmind.json', () => {
      beforeEach(() => {
        // Return packmind.json with agents that don't include packmind
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
            agents: ['cursor'],
          }),
        });
      });

      it('automatically includes packmind agent', async () => {
        await useCase.execute(command);

        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: [CodingAgents.packmind, CodingAgents.cursor],
          }),
        );
      });
    });

    describe('when agents is undefined in packmind.json', () => {
      beforeEach(() => {
        // Return packmind.json without agents property
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
          }),
        });
      });

      it('falls back to org-level agents', async () => {
        await useCase.execute(command);

        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: activeCodingAgents,
          }),
        );
      });
    });

    describe('when packmind.json does not exist', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);
      });

      it('falls back to org-level agents', async () => {
        await useCase.execute(command);

        expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
          expect.objectContaining({
            codingAgents: activeCodingAgents,
          }),
        );
      });
    });
  });

  describe('render mode cleanup', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Cleanup Command',
        slug: 'cleanup-command',
        version: 1,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        name: 'Cleanup Standard',
        slug: 'cleanup-standard',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Docs',
        path: 'docs',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: [],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });

      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.skillVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.skillVersionsByTargetAndPackages.mockResolvedValue([]);
      mockDistributionRepository.findActiveRenderModesByTarget.mockResolvedValue(
        [RenderMode.CLAUDE, RenderMode.CURSOR],
      );

      mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockImplementation(
        (renderModes) =>
          renderModes.includes(RenderMode.CLAUDE)
            ? [CodingAgents.claude, CodingAgents.cursor]
            : activeCodingAgents,
      );
    });

    describe('when per-target agents override org-level agents', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'packmind-json-sha',
          content: JSON.stringify({ agents: [CodingAgents.claude] }),
        });
      });

      it('generates cleanup only for removed agents', async () => {
        await useCase.execute(command);

        expect(
          mockCodingAgentPort.generateAgentCleanupUpdatesForAgents,
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            agents: [CodingAgents.cursor],
          }),
        );
      });
    });

    describe('when cleanup updates are generated', () => {
      beforeEach(() => {
        mockCodingAgentPort.generateAgentCleanupUpdatesForAgents.mockResolvedValue(
          {
            createOrUpdate: [],
            delete: [
              {
                path: '.cursor/rules/packmind/recipes-index.mdc',
                type: DeleteItemType.File,
              },
            ],
          },
        );
      });

      it('prefixes cleanup updates with the target path', async () => {
        await useCase.execute(command);

        const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
        expect(jobInput.fileUpdates.delete).toContainEqual({
          path: 'docs/.cursor/rules/packmind/recipes-index.mdc',
          type: 'file',
        });
      });
    });
  });

  describe('when distribution render modes match packmind.json agents', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: 'docs',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['my-package'],
        packageIds: [],
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
    });

    describe('when packmind.json has agents configured', () => {
      // Normalized agents include packmind
      const perTargetRenderModes = [
        RenderMode.PACKMIND,
        RenderMode.CLAUDE,
        RenderMode.CURSOR,
      ];

      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
            agents: ['claude', 'cursor'],
          }),
        });

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
          perTargetRenderModes,
        );
      });

      it('stores distribution with per-target render modes including packmind', async () => {
        const result = await useCase.execute(command);

        expect(result.distributions[0].renderModes).toEqual(
          perTargetRenderModes,
        );
      });

      it('does not use org-level render modes in distribution', async () => {
        const result = await useCase.execute(command);

        expect(result.distributions[0].renderModes).not.toEqual(
          activeRenderModes,
        );
      });
    });

    describe('when packmind.json has empty agents array', () => {
      // Normalized: packmind is always included
      const packmindOnlyRenderModes = [RenderMode.PACKMIND];

      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
            agents: [],
          }),
        });

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
          packmindOnlyRenderModes,
        );
      });

      it('stores distribution with packmind render mode', async () => {
        const result = await useCase.execute(command);

        expect(result.distributions[0].renderModes).toEqual(
          packmindOnlyRenderModes,
        );
      });
    });

    describe('when packmind.json has no agents property', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue({
          sha: 'docs/packmind.json',
          content: JSON.stringify({
            packages: { 'existing-pkg': '*' },
          }),
        });

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
          activeRenderModes,
        );
      });

      it('stores distribution with org-level render modes', async () => {
        const result = await useCase.execute(command);

        expect(result.distributions[0].renderModes).toEqual(activeRenderModes);
      });
    });

    describe('when packmind.json does not exist', () => {
      beforeEach(() => {
        mockGitPort.getFileFromRepo.mockResolvedValue(null);

        mockRenderModeConfigurationService.mapCodingAgentsToRenderModes.mockReturnValue(
          activeRenderModes,
        );
      });

      it('stores distribution with org-level render modes', async () => {
        const result = await useCase.execute(command);

        expect(result.distributions[0].renderModes).toEqual(activeRenderModes);
      });
    });
  });

  describe('when lock file includes artifact metadata from rendered files', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    const commandId = createCommandId(uuidv4());
    const standardId = createStandardId(uuidv4());
    const spaceId = uuidv4();
    const pkgId = uuidv4();

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        recipeId: commandId,
        name: 'Test Command',
        slug: 'test-command',
        version: 3,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId,
        name: 'Test Standard',
        slug: 'test-standard',
        version: 2,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
        packagesSlugs: ['my-package'],
        packageIds: [createPackageId(pkgId)],
        artifactSpaceIds: {
          [commandId]: spaceId,
          [standardId]: spaceId,
        },
        artifactPackageIds: {
          [commandId]: [pkgId],
          [standardId]: [pkgId],
        },
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockStandardsPort.getStandardVersionsByIds.mockResolvedValue([
        standardVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/commands/test-command.md',
            content: 'command content',
            artifactType: 'command',
            artifactId: commandId,
            artifactSlug: 'test-command',
            artifactVersion: 3,
          },
          {
            path: '.packmind/standards/test-standard.md',
            content: 'standard content',
            artifactType: 'standard',
            artifactId: standardId,
            artifactSlug: 'test-standard',
            artifactVersion: 2,
          },
        ],
        delete: [],
      });
    });

    it('includes command artifact entry in lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['user:command:test-command']).toEqual(
        expect.objectContaining({
          type: 'command',
          version: 3,
          name: 'Test Command',
          id: commandId,
        }),
      );
    });

    it('includes standard artifact entry in lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['user:standard:test-standard']).toEqual(
        expect.objectContaining({
          type: 'standard',
          version: 2,
          name: 'Test Standard',
          id: standardId,
        }),
      );
    });

    it('includes package slugs in lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.packageSlugs).toEqual(['my-package']);
    });

    it('includes space id in lock file artifact entries', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['user:command:test-command'].spaceId).toBe(
        spaceId,
      );
    });

    it('includes package ids in lock file artifact entries', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['user:command:test-command'].packageIds).toEqual([
        pkgId,
      ]);
    });
  });

  describe('when existing lock file has entries from inaccessible packages', () => {
    let command: PublishArtifactsCommand;
    let commandVersion: ReturnType<typeof commandVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    const existingLockFileContent = {
      lockfileVersion: 1,
      packageSlugs: ['@team-a/pkg-a', '@private-team/pkg-private'],
      agents: ['claude'],
      targetId: 'target-1',
      artifacts: {
        'command:private-command': {
          name: 'Private Command',
          type: 'command',
          id: 'command-private',
          version: 5,
          spaceId: 'space-private',
          packageIds: ['pkg-private'],
          files: [
            {
              path: '.claude/commands/private-command.md',
              agent: 'claude',
            },
          ],
        },
      },
    };

    beforeEach(() => {
      commandVersion = commandVersionFactory({
        id: createCommandVersionId(uuidv4()),
        name: 'Test Command',
        slug: 'test-command',
        version: 1,
      });

      gitRepo = gitRepoFactory();

      target = targetFactory({
        id: targetId,
        gitRepoId: gitRepo.id,
        name: 'Production',
        path: '/',
      });

      command = {
        userId,
        organizationId,
        commandVersionIds: [commandVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
        packagesSlugs: ['@team-a/pkg-a'],
        packageIds: [createPackageId(uuidv4())],
        artifactSpaceIds: { [String(commandVersion.recipeId)]: 'space-a' },
        artifactPackageIds: {
          [String(commandVersion.recipeId)]: ['pkg-a'],
        },
      };

      mockCommandsPort.getCommandVersionsByIds.mockResolvedValue([
        commandVersion,
      ]);
      mockTargetService.findById.mockResolvedValue(target);
      mockTargetService.findByIdsInOrganization.mockResolvedValue([target]);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      activeVersions.commandVersionsByTarget.mockResolvedValue([]);
      activeVersions.standardVersionsByTarget.mockResolvedValue([]);
      activeVersions.commandVersionsByTargetAndPackages.mockResolvedValue([]);
      activeVersions.standardVersionsByTargetAndPackages.mockResolvedValue([]);

      mockGitPort.getFileFromRepo.mockImplementation(
        async (_gitRepo, filePath) => {
          if (filePath === 'packmind-lock.json') {
            return {
              sha: 'lock-sha',
              content: JSON.stringify(existingLockFileContent),
            };
          }
          return null;
        },
      );

      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.claude/commands/test-command.md',
            content: 'command content',
            artifactType: 'command',
            artifactId: String(commandVersion.recipeId),
          },
        ],
        delete: [],
      });
    });

    it('preserves inaccessible artifact entries in the lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['command:private-command']).toEqual(
        existingLockFileContent.artifacts['command:private-command'],
      );
    });

    it('includes new artifact entries alongside preserved ones', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.artifacts['user:command:test-command']).toBeDefined();
    });

    it('preserves inaccessible package slugs in lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.packageSlugs).toContain('@private-team/pkg-private');
    });

    it('preserves accessible package slugs in lock file', async () => {
      await useCase.execute(command);

      const jobInput = mockPublishArtifactsDelayedJob.addJob.mock.calls[0][0];
      const lockFile = jobInput.fileUpdates.createOrUpdate.find(
        (f: { path: string }) => f.path === 'packmind-lock.json',
      );

      assert(lockFile, 'lockFile should be defined');
      assert(lockFile.content, 'lockFile.content should be defined');
      const parsed = JSON.parse(lockFile.content);

      expect(parsed.packageSlugs).toContain('@team-a/pkg-a');
    });
  });
});
