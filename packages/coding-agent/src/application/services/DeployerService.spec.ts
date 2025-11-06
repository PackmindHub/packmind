import { DeployerService } from './DeployerService';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { CodingAgent } from '../../domain/CodingAgents';
import {
  RecipeVersion,
  RecipeVersionId,
  Recipe,
  RecipeId,
} from '@packmind/recipes';
import { recipeFactory } from '@packmind/recipes/test';
import {
  StandardVersion,
  StandardVersionId,
  Standard,
  StandardId,
} from '@packmind/standards';
import { standardFactory } from '@packmind/standards/test';
import { GitRepo, GitRepoId, GitProviderId } from '@packmind/git';
import { FileUpdates } from '../../domain/entities/FileUpdates';
import { UserId } from '@packmind/accounts';
import { PackmindLogger } from '@packmind/logger';
import { Target, TargetId } from '@packmind/types';
import { createSpaceId } from '@packmind/spaces';
import { stubLogger } from '@packmind/test-utils';

// Create test helper functions
const createTestRecipeId = (id: string): RecipeId => id as RecipeId;
const createTestRecipeVersionId = (id: string): RecipeVersionId =>
  id as RecipeVersionId;
const createTestStandardId = (id: string): StandardId => id as StandardId;
const createTestStandardVersionId = (id: string): StandardVersionId =>
  id as StandardVersionId;
const createTestUserId = (id: string): UserId => id as UserId;
const createTestGitRepoId = (id: string): GitRepoId => id as GitRepoId;
const createTestGitProviderId = (id: string): GitProviderId =>
  id as GitProviderId;
const createTestTargetId = (id: string): TargetId => id as TargetId;

// Mock deployer
class MockDeployer implements ICodingAgentDeployer {
  constructor(
    private recipeResult: FileUpdates = { createOrUpdate: [], delete: [] },
    private standardResult: FileUpdates = { createOrUpdate: [], delete: [] },
  ) {}

  async deployRecipes(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recipeVersions: RecipeVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    return this.recipeResult;
  }

  async deployStandards(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    return this.standardResult;
  }

  async generateFileUpdatesForRecipes(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recipeVersions: RecipeVersion[],
  ): Promise<FileUpdates> {
    return this.recipeResult;
  }

  async generateFileUpdatesForStandards(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    standardVersions: StandardVersion[],
  ): Promise<FileUpdates> {
    return this.standardResult;
  }
}

// Mock registry
class MockRegistry implements ICodingAgentDeployerRegistry {
  private deployers = new Map<CodingAgent, ICodingAgentDeployer>();

  getDeployer(agent: CodingAgent): ICodingAgentDeployer {
    return this.deployers.get(agent) || new MockDeployer();
  }

  registerDeployer(agent: CodingAgent, deployer: ICodingAgentDeployer): void {
    this.deployers.set(agent, deployer);
  }

  hasDeployer(): boolean {
    return true;
  }
}

describe('DeployerService', () => {
  let service: DeployerService;
  let registry: MockRegistry;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;
  let mockRecipeVersions: RecipeVersion[];
  let mockStandardVersions: StandardVersion[];
  let mockLogger: PackmindLogger;

  beforeEach(() => {
    mockLogger = stubLogger();
    registry = new MockRegistry();
    service = new DeployerService(registry, mockLogger);

    mockTarget = {
      id: createTestTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createTestGitRepoId('repo-1'),
    };

    mockGitRepo = {
      id: createTestGitRepoId('repo-1'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createTestGitProviderId('provider-1'),
      branch: 'main',
    };

    const mockRecipe: Recipe = recipeFactory({
      id: createTestRecipeId('recipe-1'),
      name: 'Test Recipe',
      slug: 'test-recipe',
      content: 'Original recipe content',
      version: 1,
      userId: createTestUserId('user-1'),
      spaceId: createSpaceId('space-1'),
    });

    mockRecipeVersions = [
      {
        id: createTestRecipeVersionId('recipe-version-1'),
        recipeId: mockRecipe.id,
        name: mockRecipe.name,
        slug: mockRecipe.slug,
        content: 'Recipe content',
        version: 1,
        summary: 'Test recipe summary',
        userId: createTestUserId('user-1'),
      },
    ];

    const mockStandard: Standard = standardFactory({
      id: createTestStandardId('standard-1'),
      name: 'Test Standard',
      slug: 'test-standard',
      description: 'Original standard description',
      version: 1,
      userId: createTestUserId('user-1'),
      scope: 'backend',
      spaceId: createSpaceId('space-1'),
    });

    mockStandardVersions = [
      {
        id: createTestStandardVersionId('standard-version-1'),
        standardId: mockStandard.id,
        name: mockStandard.name,
        slug: mockStandard.slug,
        description: 'Standard description',
        version: 1,
        summary: 'Test standard summary',
        userId: createTestUserId('user-1'),
        scope: 'backend',
      },
    ];
  });

  describe('aggregateRecipeDeployments', () => {
    it('aggregates deployments from single agent', async () => {
      const mockDeployer = new MockDeployer({
        createOrUpdate: [{ path: 'recipe1.md', content: 'content1' }],
        delete: [{ path: 'old-recipe.md' }],
      });

      registry.registerDeployer('packmind', mockDeployer);

      const result = await service.aggregateRecipeDeployments(
        mockRecipeVersions,
        mockGitRepo,
        [mockTarget],
        ['packmind'],
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0]).toEqual({
        path: 'recipe1.md',
        content: 'content1',
      });
      expect(result.delete).toHaveLength(1);
      expect(result.delete[0]).toEqual({ path: 'old-recipe.md' });
    });

    it('aggregates deployments from multiple agents', async () => {
      const deployer1 = new MockDeployer({
        createOrUpdate: [{ path: 'recipe1.md', content: 'content 1' }],
        delete: [],
      });

      const deployer2 = new MockDeployer({
        createOrUpdate: [{ path: 'recipe2.md', content: 'content 2' }],
        delete: [],
      });

      registry.registerDeployer('packmind', deployer1);
      registry.registerDeployer('junie', deployer2);

      const result = await service.aggregateRecipeDeployments(
        mockRecipeVersions,
        mockGitRepo,
        [mockTarget],
        ['packmind', 'junie'],
      );

      expect(result.createOrUpdate).toHaveLength(2);
      expect(result.delete).toHaveLength(0);
    });

    it('merges conflicting paths with later content winning', async () => {
      const deployer1 = new MockDeployer({
        createOrUpdate: [
          { path: 'common.md', content: 'first content' },
          { path: 'unique1.md', content: 'unique1' },
        ],
        delete: [],
      });

      registry.registerDeployer('packmind', deployer1);

      const result = await service.aggregateRecipeDeployments(
        mockRecipeVersions,
        mockGitRepo,
        [mockTarget],
        ['packmind'],
      );

      expect(result.createOrUpdate).toHaveLength(2);
      expect(
        result.createOrUpdate.find((f) => f.path === 'common.md')?.content,
      ).toBe('first content');
    });

    it('deduplicates delete operations', async () => {
      const deployer = new MockDeployer({
        createOrUpdate: [],
        delete: [{ path: 'delete1.md' }, { path: 'delete2.md' }],
      });

      registry.registerDeployer('packmind', deployer);

      const result = await service.aggregateRecipeDeployments(
        mockRecipeVersions,
        mockGitRepo,
        [mockTarget],
        ['packmind'],
      );

      expect(result.delete).toHaveLength(2);
      expect(result.delete.map((d) => d.path).sort()).toEqual([
        'delete1.md',
        'delete2.md',
      ]);
    });

    it('handles empty agents array', async () => {
      const result = await service.aggregateRecipeDeployments(
        mockRecipeVersions,
        mockGitRepo,
        [mockTarget],
        [],
      );

      expect(result.createOrUpdate).toHaveLength(0);
      expect(result.delete).toHaveLength(0);
    });

    it('propagates deployer errors', async () => {
      const errorDeployer = {
        async deployRecipes(): Promise<FileUpdates> {
          throw new Error('Deployment failed');
        },
        async deployStandards(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
        },
        async generateFileUpdatesForRecipes(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
        },
        async generateFileUpdatesForStandards(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
        },
      };

      registry.registerDeployer('packmind', errorDeployer);

      await expect(
        service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        ),
      ).rejects.toThrow('Deployment failed');
    });
  });

  describe('aggregateStandardsDeployments', () => {
    it('aggregates standards deployments from single agent', async () => {
      const mockDeployer = new MockDeployer(
        { createOrUpdate: [], delete: [] }, // recipes result
        {
          createOrUpdate: [
            { path: 'standard1.md', content: 'standard content' },
          ],
          delete: [],
        }, // standards result
      );

      registry.registerDeployer('packmind', mockDeployer);

      const result = await service.aggregateStandardsDeployments(
        mockStandardVersions,
        mockGitRepo,
        [mockTarget],
        ['packmind'],
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0]).toEqual({
        path: 'standard1.md',
        content: 'standard content',
      });
    });

    it('handles empty standards array', async () => {
      const result = await service.aggregateStandardsDeployments(
        [],
        mockGitRepo,
        [mockTarget],
        ['packmind'],
      );

      expect(result.createOrUpdate).toHaveLength(0);
      expect(result.delete).toHaveLength(0);
    });
  });
});
