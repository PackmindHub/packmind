import { PublishArtifactsUseCase } from './PublishArtifactsUseCase';
import { CodingAgents } from '@packmind/coding-agent';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
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
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
  IEventTrackingPort,
  Rule,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { PackmindEventEmitterService } from '@packmind/node-utils';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

describe('PublishArtifactsUseCase', () => {
  let useCase: PublishArtifactsUseCase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockRecipesDeploymentRepository: jest.Mocked<IRecipesDeploymentRepository>;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockEventTrackingPort: jest.Mocked<IEventTrackingPort>;
  let mockEventEmitterService: jest.Mocked<PackmindEventEmitterService>;
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

    mockGitPort = {
      commitToGit: jest.fn(),
      getRepositoryById: jest.fn(),
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      renderArtifacts: jest.fn(),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockRecipesDeploymentRepository = {
      add: jest.fn(),
      findActiveRecipeVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IRecipesDeploymentRepository>;

    mockStandardsDeploymentRepository = {
      add: jest.fn(),
      findActiveStandardVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

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

    mockEventTrackingPort = {
      trackEvent: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<IEventTrackingPort>;

    mockEventEmitterService = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<PackmindEventEmitterService>;

    useCase = new PublishArtifactsUseCase(
      mockRecipesPort,
      mockStandardsPort,
      mockGitPort,
      mockCodingAgentPort,
      mockRecipesDeploymentRepository,
      mockStandardsDeploymentRepository,
      mockTargetService,
      mockRenderModeConfigurationService,
      mockEventTrackingPort,
      mockEventEmitterService,
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
    let gitCommit: GitCommit;
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
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
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
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('returns both recipe and standard deployments', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments).toHaveLength(1);
      expect(result.standardDeployments).toHaveLength(1);
    });

    it('stores recipe deployment with success status', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].status).toBe(
        DistributionStatus.success,
      );
      expect(result.recipeDeployments[0].gitCommit).toEqual(gitCommit);
    });

    it('stores standard deployment with success status', async () => {
      const result = await useCase.execute(command);

      expect(result.standardDeployments[0].status).toBe(
        DistributionStatus.success,
      );
      expect(result.standardDeployments[0].gitCommit).toEqual(gitCommit);
    });

    it('stores both deployments with the same git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].gitCommit).toEqual(gitCommit);
      expect(result.standardDeployments[0].gitCommit).toEqual(gitCommit);
    });

    it('calls renderArtifacts with both recipe and standard versions', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: [recipeVersion],
          standardVersions: [
            expect.objectContaining({
              ...standardVersion,
              rules: [],
            }),
          ],
          codingAgents: activeCodingAgents,
        }),
      );
    });

    it('uses coding agents mapped from render modes', async () => {
      await useCase.execute(command);

      expect(
        mockRenderModeConfigurationService.getActiveRenderModes,
      ).toHaveBeenCalledWith(organizationId);
      expect(
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
      ).toHaveBeenCalledWith(activeRenderModes);
    });

    it('stores deployments with render modes', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].renderModes).toEqual(
        activeRenderModes,
      );
      expect(result.standardDeployments[0].renderModes).toEqual(
        activeRenderModes,
      );
    });

    it('creates a single git commit for both artifacts', async () => {
      await useCase.execute(command);

      expect(mockGitPort.commitToGit).toHaveBeenCalledTimes(1);
      expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
        gitRepo,
        expect.arrayContaining([
          expect.objectContaining({ path: expect.stringContaining('recipes') }),
          expect.objectContaining({
            path: expect.stringContaining('standards'),
          }),
        ]),
        expect.stringContaining('Update artifacts (recipes + standards)'),
      );
    });

    it('includes both recipes and standards in commit message', async () => {
      await useCase.execute(command);

      const commitMessage = mockGitPort.commitToGit.mock.calls[0][2];
      expect(commitMessage).toContain('Test Recipe');
      expect(commitMessage).toContain('test-recipe');
      expect(commitMessage).toContain('Test Standard');
      expect(commitMessage).toContain('test-standard');
      expect(commitMessage).toContain('Production');
    });
  });

  describe('when deploying recipes only', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    let gitCommit: GitCommit;

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
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('creates recipe deployment but still creates standard deployment', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments).toHaveLength(1);
      expect(result.standardDeployments).toHaveLength(1);
      expect(result.standardDeployments[0].standardVersions).toEqual([]);
    });

    it('calls renderArtifacts with empty standards array', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: [],
        }),
      );
    });
  });

  describe('when deploying standards only', () => {
    let command: PublishArtifactsCommand;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    let gitCommit: GitCommit;

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
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId],
      };

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('creates standard deployment but still creates recipe deployment', async () => {
      const result = await useCase.execute(command);

      expect(result.standardDeployments).toHaveLength(1);
      expect(result.recipeDeployments).toHaveLength(1);
      expect(result.recipeDeployments[0].recipeVersions).toEqual([]);
    });

    it('calls renderArtifacts with empty recipes array', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: [],
        }),
      );
    });
  });

  describe('when no changes are detected', () => {
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
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
      mockGitPort.commitToGit.mockRejectedValue(
        new Error('NO_CHANGES_DETECTED'),
      );
    });

    it('creates deployments with no_changes status', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].status).toBe(
        DistributionStatus.no_changes,
      );
      expect(result.standardDeployments[0].status).toBe(
        DistributionStatus.no_changes,
      );
    });

    it('creates deployments without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].gitCommit).toBeUndefined();
      expect(result.standardDeployments[0].gitCommit).toBeUndefined();
    });

    it('saves both deployments to repositories', async () => {
      await useCase.execute(command);

      expect(mockRecipesDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({ status: DistributionStatus.no_changes }),
      );
      expect(mockStandardsDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({ status: DistributionStatus.no_changes }),
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
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockRejectedValue(
        new Error('Rendering failed'),
      );
    });

    it('creates failure deployments for both recipes and standards', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].status).toBe(
        DistributionStatus.failure,
      );
      expect(result.standardDeployments[0].status).toBe(
        DistributionStatus.failure,
      );
    });

    it('stores error message in both deployments', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].error).toBe('Rendering failed');
      expect(result.standardDeployments[0].error).toBe('Rendering failed');
    });

    it('creates deployments without git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].gitCommit).toBeUndefined();
      expect(result.standardDeployments[0].gitCommit).toBeUndefined();
    });
  });

  describe('when multiple targets share the same repository', () => {
    let command: PublishArtifactsCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
    let standardVersion: ReturnType<typeof standardVersionFactory>;
    let target1: ReturnType<typeof targetFactory>;
    let target2: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    let gitCommit: GitCommit;
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
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [standardVersion.id],
        targetIds: [targetId1, targetId2],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        standardVersion,
      );
      mockTargetService.findById
        .mockResolvedValueOnce(target1)
        .mockResolvedValueOnce(target2);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
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
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('creates one deployment per target for recipes', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments).toHaveLength(2);
      expect(result.recipeDeployments[0].target.id).toBe(targetId1);
      expect(result.recipeDeployments[1].target.id).toBe(targetId2);
    });

    it('creates one deployment per target for standards', async () => {
      const result = await useCase.execute(command);

      expect(result.standardDeployments).toHaveLength(2);
      expect(result.standardDeployments[0].target.id).toBe(targetId1);
      expect(result.standardDeployments[1].target.id).toBe(targetId2);
    });

    it('creates only one git commit for all targets', async () => {
      await useCase.execute(command);

      expect(mockGitPort.commitToGit).toHaveBeenCalledTimes(1);
    });

    it('all deployments share the same git commit', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].gitCommit).toEqual(gitCommit);
      expect(result.recipeDeployments[1].gitCommit).toEqual(gitCommit);
      expect(result.standardDeployments[0].gitCommit).toEqual(gitCommit);
      expect(result.standardDeployments[1].gitCommit).toEqual(gitCommit);
    });

    it('calls renderArtifacts once per target', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledTimes(2);
    });

    it('includes both targets in commit message', async () => {
      await useCase.execute(command);

      const commitMessage = mockGitPort.commitToGit.mock.calls[0][2];
      expect(commitMessage).toContain('Production');
      expect(commitMessage).toContain('Staging');
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
    let gitCommit: GitCommit;

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
        recipeVersionIds: [newRecipeVersion.id],
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(newRecipeVersion);
      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        newStandardVersion,
      );
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [oldRecipeVersion],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [oldStandardVersion],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
    });

    it('combines previous and new recipe versions for rendering', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: expect.arrayContaining([
            expect.objectContaining({ version: 2 }),
          ]),
        }),
      );
    });

    it('combines previous and new standard versions for rendering', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.renderArtifacts).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: expect.arrayContaining([
            expect.objectContaining({ version: 2 }),
          ]),
        }),
      );
    });

    it('stores only new versions in deployment record', async () => {
      const result = await useCase.execute(command);

      expect(result.recipeDeployments[0].recipeVersions).toEqual([
        newRecipeVersion,
      ]);
      expect(result.standardDeployments[0].standardVersions).toEqual([
        newStandardVersion,
      ]);
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
      };

      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.getRecipeVersionById.mockResolvedValue(null);

      await expect(useCase.execute(command)).rejects.toThrow(
        'Recipe version with ID',
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
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'At least one target must be provided',
      );
    });
  });

  describe('when configuration is missing', () => {
    it('uses default render modes', async () => {
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
      const gitCommit = {
        id: createGitCommitId(uuidv4()),
        sha: 'abc123',
        message: 'Test',
        author: 'Author',
        url: 'https://example.com',
      };

      const command: PublishArtifactsCommand = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        standardVersionIds: [],
        targetIds: [targetId],
      };

      mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockGitPort.getFileFromRepo.mockResolvedValue(null);
      mockCodingAgentPort.renderArtifacts.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);

      const result = await useCase.execute(command);

      expect(
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
      ).toHaveBeenCalledWith(DEFAULT_ACTIVE_RENDER_MODES);
      expect(result.recipeDeployments[0].renderModes).toEqual(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
      expect(result.standardDeployments[0].renderModes).toEqual(
        DEFAULT_ACTIVE_RENDER_MODES,
      );
    });
  });

  describe('when deploying with previously deployed standards that lack rules', () => {
    let command: PublishArtifactsCommand;
    let newStandardVersion: ReturnType<typeof standardVersionFactory>;
    let previousStandardVersion: ReturnType<typeof standardVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;
    let gitCommit: GitCommit;
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
        standardVersionIds: [newStandardVersion.id],
        targetIds: [targetId],
      };

      mockStandardsPort.getStandardVersionById.mockResolvedValue(
        newStandardVersion,
      );
      mockStandardsPort.getRulesByStandardId = jest
        .fn()
        .mockResolvedValue(mockRules);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      // Return previously deployed standard WITHOUT rules
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [previousStandardVersion],
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
      mockGitPort.commitToGit.mockResolvedValue(gitCommit);
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
      );
    });

    it('ensures all standards have rules before rendering', async () => {
      await useCase.execute(command);

      const renderCall = mockCodingAgentPort.renderArtifacts.mock.calls[0][0];
      const standardsWithoutRules = renderCall.standardVersions.filter(
        (sv: { rules?: unknown[] }) => !sv.rules || sv.rules.length === 0,
      );

      expect(standardsWithoutRules).toHaveLength(0);
    });
  });
});
