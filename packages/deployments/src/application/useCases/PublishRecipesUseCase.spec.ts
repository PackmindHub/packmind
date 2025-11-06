import { PublishRecipesUseCase } from './PublishRecipesUseCase';
import { GitHexa } from '@packmind/git';
import { CodingAgentHexa, CodingAgents } from '@packmind/coding-agent';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { createUserId, createOrganizationId } from '@packmind/types';
import {
  PublishRecipesCommand,
  DistributionStatus,
  DEFAULT_ACTIVE_RENDER_MODES,
  RenderMode,
  createRecipeVersionId,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
  GitRepo,
  GitCommit,
  IRecipesPort,
} from '@packmind/shared';
import { PackmindLogger } from '@packmind/logger';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { targetFactory } from '../../../test/targetFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

describe('PublishRecipesUseCase', () => {
  let useCase: PublishRecipesUseCase;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockGitHexa: jest.Mocked<GitHexa>;
  let mockCodingAgentHexa: jest.Mocked<CodingAgentHexa>;
  let mockRecipesDeploymentRepository: jest.Mocked<IRecipesDeploymentRepository>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
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

    mockGitHexa = {
      commitToGit: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    mockCodingAgentHexa = {
      prepareRecipesDeployment: jest.fn(),
    } as unknown as jest.Mocked<CodingAgentHexa>;

    mockRecipesDeploymentRepository = {
      add: jest.fn(),
      findActiveRecipeVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IRecipesDeploymentRepository>;

    mockTargetService = {
      getRepositoryByTargetId: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockRenderModeConfigurationService = {
      resolveActiveCodingAgents: jest.fn(),
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
      activeRenderModes,
    );
    mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      activeCodingAgents,
    );

    useCase = new PublishRecipesUseCase(
      mockRecipesDeploymentRepository,
      mockGitHexa,
      mockRecipesPort,
      mockCodingAgentHexa,
      mockTargetService,
      mockRenderModeConfigurationService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployment is successful', () => {
    let command: PublishRecipesCommand;
    let recipeVersion: ReturnType<typeof recipeVersionFactory>;
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
        targetIds: [targetId],
      };

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test-recipe.md', content: 'content' },
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

    it('prepares deployment using coding agents mapped from render modes', async () => {
      await useCase.execute(command);

      expect(
        mockRenderModeConfigurationService.getActiveRenderModes,
      ).toHaveBeenCalledWith(organizationId);
      expect(
        mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
      ).toHaveBeenCalledWith(activeRenderModes);
      expect(mockCodingAgentHexa.prepareRecipesDeployment).toHaveBeenCalledWith(
        expect.objectContaining({ codingAgents: activeCodingAgents }),
      );
    });

    describe('when configuration is missing', () => {
      it('uses default render modes', async () => {
        mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValueOnce(
          DEFAULT_ACTIVE_RENDER_MODES,
        );

        const result = await useCase.execute(command);

        expect(
          mockRenderModeConfigurationService.mapRenderModesToCodingAgents,
        ).toHaveBeenCalledWith(DEFAULT_ACTIVE_RENDER_MODES);
        expect(result[0].renderModes).toEqual(DEFAULT_ACTIVE_RENDER_MODES);
        expect(mockRecipesDeploymentRepository.add).toHaveBeenCalledWith(
          expect.objectContaining({ renderModes: DEFAULT_ACTIVE_RENDER_MODES }),
        );
      });
    });
  });

  describe('when no changes are detected', () => {
    let command: PublishRecipesCommand;
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
      });

      command = {
        userId,
        organizationId,
        recipeVersionIds: [recipeVersion.id],
        targetIds: [targetId],
      };

      const noChangesError = new Error('NO_CHANGES_DETECTED');

      mockRecipesPort.getRecipeVersionById.mockResolvedValue(recipeVersion);
      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test-recipe.md', content: 'content' },
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
  });

  describe('when deploying multiple recipes', () => {
    let command: PublishRecipesCommand;
    let recipeVersionA: ReturnType<typeof recipeVersionFactory>;
    let recipeVersionZ: ReturnType<typeof recipeVersionFactory>;
    let recipeVersionM: ReturnType<typeof recipeVersionFactory>;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      // Create recipes with names that should be sorted Z, M, A -> A, M, Z
      recipeVersionZ = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Zulu Recipe',
        slug: 'zulu-recipe',
        version: 1,
      });

      recipeVersionM = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Mike Recipe',
        slug: 'mike-recipe',
        version: 1,
      });

      recipeVersionA = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        name: 'Alpha Recipe',
        slug: 'alpha-recipe',
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

      // Command with recipes in Z, M, A order (should be sorted to A, M, Z)
      command = {
        userId,
        organizationId,
        recipeVersionIds: [
          recipeVersionZ.id,
          recipeVersionM.id,
          recipeVersionA.id,
        ],
        targetIds: [targetId],
      };

      // Mock responses - order here doesn't matter as we're testing the sorting
      mockRecipesPort.getRecipeVersionById.mockImplementation((id) => {
        if (id === recipeVersionA.id) return Promise.resolve(recipeVersionA);
        if (id === recipeVersionM.id) return Promise.resolve(recipeVersionM);
        if (id === recipeVersionZ.id) return Promise.resolve(recipeVersionZ);
        return Promise.resolve(null);
      });

      mockTargetService.getRepositoryByTargetId.mockResolvedValue({
        target,
        repository: gitRepo,
      });
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentHexa.prepareRecipesDeployment.mockImplementation((cmd) => {
        // Verify that the recipes passed to prepareRecipesDeployment are sorted alphabetically
        const sortedNames = cmd.recipeVersions.map((rv) => rv.name);
        expect(sortedNames).toEqual([
          'Alpha Recipe',
          'Mike Recipe',
          'Zulu Recipe',
        ]);

        return Promise.resolve({
          createOrUpdate: [
            { path: '.packmind/recipes/alpha-recipe.md', content: 'content A' },
            { path: '.packmind/recipes/mike-recipe.md', content: 'content M' },
            { path: '.packmind/recipes/zulu-recipe.md', content: 'content Z' },
          ],
          delete: [],
        });
      });
      mockGitHexa.commitToGit.mockResolvedValue(gitCommit);
    });

    it('sorts recipes alphabetically before sending to file deployer', async () => {
      const result = await useCase.execute(command);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(DistributionStatus.success);

      // Verify that the recipes in the deployment are sorted alphabetically
      const recipeNames = result[0].recipeVersions.map((rv) => rv.name);
      expect(recipeNames).toEqual([
        'Alpha Recipe',
        'Mike Recipe',
        'Zulu Recipe',
      ]);
    });
  });
});
