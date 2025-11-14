import { PublishPackagesUseCase } from './PublishPackagesUseCase';
import { CodingAgents } from '@packmind/coding-agent';
import { IPackagesDeploymentRepository } from '../../domain/repositories/IPackagesDeploymentRepository';
import { IRecipesDeploymentRepository } from '../../domain/repositories/IRecipesDeploymentRepository';
import { IStandardsDeploymentRepository } from '../../domain/repositories/IStandardsDeploymentRepository';
import { TargetService } from '../services/TargetService';
import { RenderModeConfigurationService } from '../services/RenderModeConfigurationService';
import { PackageService } from '../services/PackageService';
import {
  createUserId,
  createOrganizationId,
  createPackageId,
  createRecipeId,
  createStandardId,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
  createRecipeVersionId,
  createStandardVersionId,
  PublishPackagesCommand,
  DistributionStatus,
  RenderMode,
  GitRepo,
  GitCommit,
  Package,
  RecipeVersion,
  StandardVersion,
  IRecipesPort,
  IStandardsPort,
  ICodingAgentPort,
  IGitPort,
} from '@packmind/types';
import { PackmindLogger } from '@packmind/logger';
import { recipeVersionFactory } from '@packmind/recipes/test/recipeVersionFactory';
import { standardVersionFactory } from '@packmind/standards/test/standardVersionFactory';
import { targetFactory } from '../../../test/targetFactory';
import { packageFactory } from '../../../test/packageFactory';
import { v4 as uuidv4 } from 'uuid';
import { stubLogger } from '@packmind/test-utils';

describe('PublishPackagesUseCase', () => {
  let useCase: PublishPackagesUseCase;
  let mockPackagesDeploymentRepository: jest.Mocked<IPackagesDeploymentRepository>;
  let mockRecipesDeploymentRepository: jest.Mocked<IRecipesDeploymentRepository>;
  let mockStandardsDeploymentRepository: jest.Mocked<IStandardsDeploymentRepository>;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockCodingAgentPort: jest.Mocked<ICodingAgentPort>;
  let mockTargetService: jest.Mocked<TargetService>;
  let mockRenderModeConfigurationService: jest.Mocked<RenderModeConfigurationService>;
  let mockPackageService: jest.Mocked<PackageService>;
  let mockLogger: PackmindLogger;

  const userId = createUserId(uuidv4());
  const organizationId = createOrganizationId(uuidv4());
  const targetId = createTargetId(uuidv4());
  const packageId = createPackageId(uuidv4());
  const recipeId = createRecipeId(uuidv4());
  const standardId = createStandardId(uuidv4());
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

    mockPackagesDeploymentRepository = {
      add: jest.fn(),
    } as unknown as jest.Mocked<IPackagesDeploymentRepository>;

    mockRecipesDeploymentRepository = {
      findActiveRecipeVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IRecipesDeploymentRepository>;

    mockStandardsDeploymentRepository = {
      findActiveStandardVersionsByTarget: jest.fn(),
    } as unknown as jest.Mocked<IStandardsDeploymentRepository>;

    mockRecipesPort = {
      listRecipeVersions: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    mockStandardsPort = {
      getLatestStandardVersion: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;

    mockGitPort = {
      commitToGit: jest.fn(),
      getRepositoryById: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;

    mockCodingAgentPort = {
      prepareRecipesDeployment: jest.fn(),
      prepareStandardsDeployment: jest.fn(),
    } as unknown as jest.Mocked<ICodingAgentPort>;

    mockTargetService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TargetService>;

    mockRenderModeConfigurationService = {
      getActiveRenderModes: jest.fn(),
      mapRenderModesToCodingAgents: jest.fn(),
    } as unknown as jest.Mocked<RenderModeConfigurationService>;

    mockPackageService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<PackageService>;

    mockRenderModeConfigurationService.getActiveRenderModes.mockResolvedValue(
      activeRenderModes,
    );
    mockRenderModeConfigurationService.mapRenderModesToCodingAgents.mockReturnValue(
      activeCodingAgents,
    );

    useCase = new PublishPackagesUseCase(
      mockPackagesDeploymentRepository,
      mockRecipesDeploymentRepository,
      mockStandardsDeploymentRepository,
      mockRecipesPort,
      mockStandardsPort,
      mockGitPort,
      mockCodingAgentPort,
      mockTargetService,
      mockRenderModeConfigurationService,
      mockPackageService,
      mockLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when deployment is successful', () => {
    let command: PublishPackagesCommand;
    let pkg: Package;
    let recipeVersion: RecipeVersion;
    let standardVersion: StandardVersion;
    let gitCommit: GitCommit;
    let target: ReturnType<typeof targetFactory>;
    let gitRepo: GitRepo;

    beforeEach(() => {
      recipeVersion = recipeVersionFactory({
        id: createRecipeVersionId(uuidv4()),
        recipeId,
        name: 'Test Recipe',
        slug: 'test-recipe',
        version: 2,
      });

      standardVersion = standardVersionFactory({
        id: createStandardVersionId(uuidv4()),
        standardId,
        version: 3,
      });

      pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [standardId],
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
        packageIds: [packageId],
        targetIds: [targetId],
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([
        recipeVersionFactory({ version: 1, recipeId }),
        recipeVersion,
      ]);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion,
      );
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/standards/test-standard.md',
            content: 'standard content',
          },
        ],
        delete: [],
      });
      mockCodingAgentPort.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [
          {
            path: '.packmind/recipes/test-recipe.md',
            content: 'recipe content',
          },
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

    it('stores deployment with packages', async () => {
      const result = await useCase.execute(command);

      expect(result[0].packages).toEqual([pkg]);
    });

    it('resolves recipes to latest version', async () => {
      await useCase.execute(command);

      expect(mockRecipesPort.listRecipeVersions).toHaveBeenCalledWith(recipeId);
    });

    it('resolves standards to latest version', async () => {
      await useCase.execute(command);

      expect(mockStandardsPort.getLatestStandardVersion).toHaveBeenCalledWith(
        standardId,
      );
    });

    it('prepares standards deployment first', async () => {
      await useCase.execute(command);

      expect(
        mockCodingAgentPort.prepareStandardsDeployment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          standardVersions: [standardVersion],
          codingAgents: activeCodingAgents,
        }),
      );
    });

    it('prepares recipes deployment second', async () => {
      await useCase.execute(command);

      expect(mockCodingAgentPort.prepareRecipesDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          recipeVersions: [recipeVersion],
          codingAgents: activeCodingAgents,
        }),
      );
    });

    it('commits both standards and recipes files together', async () => {
      await useCase.execute(command);

      expect(mockGitPort.commitToGit).toHaveBeenCalledWith(
        gitRepo,
        expect.arrayContaining([
          expect.objectContaining({
            path: '.packmind/standards/test-standard.md',
          }),
          expect.objectContaining({ path: '.packmind/recipes/test-recipe.md' }),
        ]),
        expect.stringContaining('[PACKMIND] Update packages files'),
      );
    });

    it('saves deployment to repository', async () => {
      await useCase.execute(command);

      expect(mockPackagesDeploymentRepository.add).toHaveBeenCalledWith(
        expect.objectContaining({
          packages: [pkg],
          status: DistributionStatus.success,
          gitCommit,
          target,
        }),
      );
    });
  });

  describe('when package contains only recipes', () => {
    it('deploys only recipes', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      const recipeVersion = recipeVersionFactory({
        recipeId,
        version: 1,
      });

      const target = targetFactory({ id: targetId });
      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
      mockCodingAgentPort.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/recipes/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue({
        id: createGitCommitId(uuidv4()),
        sha: 'abc',
        message: 'msg',
        author: 'author',
        url: 'url',
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await useCase.execute(command);

      expect(mockStandardsPort.getLatestStandardVersion).not.toHaveBeenCalled();
      expect(mockCodingAgentPort.prepareRecipesDeployment).toHaveBeenCalled();
    });
  });

  describe('when package contains only standards', () => {
    it('deploys only standards', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [],
        standards: [standardId],
      });

      const standardVersion = standardVersionFactory({
        standardId,
        version: 1,
      });

      const target = targetFactory({ id: targetId });
      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockStandardsPort.getLatestStandardVersion.mockResolvedValue(
        standardVersion,
      );
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [
          { path: '.packmind/standards/test.md', content: 'content' },
        ],
        delete: [],
      });
      mockCodingAgentPort.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
      mockGitPort.commitToGit.mockResolvedValue({
        id: createGitCommitId(uuidv4()),
        sha: 'abc',
        message: 'msg',
        author: 'author',
        url: 'url',
      });

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      await useCase.execute(command);

      expect(mockRecipesPort.listRecipeVersions).not.toHaveBeenCalled();
      expect(mockCodingAgentPort.prepareStandardsDeployment).toHaveBeenCalled();
    });
  });

  describe('when no changes detected', () => {
    it('creates deployment with no_changes status', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      const recipeVersion = recipeVersionFactory({ recipeId, version: 1 });
      const target = targetFactory({ id: targetId });
      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
      mockCodingAgentPort.prepareRecipesDeployment.mockResolvedValue({
        createOrUpdate: [{ path: 'file.md', content: 'content' }],
        delete: [],
      });
      mockGitPort.commitToGit.mockRejectedValue(
        new Error('NO_CHANGES_DETECTED'),
      );

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      const result = await useCase.execute(command);

      expect(result[0].status).toBe(DistributionStatus.no_changes);
      expect(result[0].gitCommit).toBeUndefined();
    });
  });

  describe('when deployment fails', () => {
    it('creates deployment with failure status and error message', async () => {
      const pkg = packageFactory({
        id: packageId,
        recipes: [recipeId],
        standards: [],
      });

      const recipeVersion = recipeVersionFactory({ recipeId, version: 1 });
      const target = targetFactory({ id: targetId });
      const gitRepo: GitRepo = {
        id: createGitRepoId(uuidv4()),
        owner: 'owner',
        repo: 'repo',
        branch: 'main',
        providerId: createGitProviderId(uuidv4()),
      };

      mockPackageService.findById.mockResolvedValue(pkg);
      mockTargetService.findById.mockResolvedValue(target);
      mockGitPort.getRepositoryById.mockResolvedValue(gitRepo);
      mockRecipesPort.listRecipeVersions.mockResolvedValue([recipeVersion]);
      mockRecipesDeploymentRepository.findActiveRecipeVersionsByTarget.mockResolvedValue(
        [],
      );
      mockStandardsDeploymentRepository.findActiveStandardVersionsByTarget.mockResolvedValue(
        [],
      );
      mockCodingAgentPort.prepareStandardsDeployment.mockResolvedValue({
        createOrUpdate: [],
        delete: [],
      });
      mockCodingAgentPort.prepareRecipesDeployment.mockRejectedValue(
        new Error('Git error'),
      );

      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [targetId],
      };

      const result = await useCase.execute(command);

      expect(result[0].status).toBe(DistributionStatus.failure);
      expect(result[0].error).toBe('Git error');
      expect(result[0].gitCommit).toBeUndefined();
    });
  });

  describe('when targetIds are missing', () => {
    it('throws an error', async () => {
      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [packageId],
        targetIds: [],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'targetIds must be provided',
      );
    });
  });

  describe('when packageIds are missing', () => {
    it('throws an error', async () => {
      const command: PublishPackagesCommand = {
        userId,
        organizationId,
        packageIds: [],
        targetIds: [targetId],
      };

      await expect(useCase.execute(command)).rejects.toThrow(
        'packageIds must be provided',
      );
    });
  });
});
