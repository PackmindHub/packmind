import { PackmindLogger } from '@packmind/logger';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';
import { stubLogger } from '@packmind/test-utils';
import {
  createSpaceId,
  FileUpdates,
  GitProviderId,
  GitRepo,
  GitRepoId,
  Recipe,
  RecipeId,
  RecipeVersion,
  RecipeVersionId,
  SkillVersion,
  Standard,
  StandardId,
  StandardVersion,
  StandardVersionId,
  Target,
  TargetId,
  UserId,
  CodingAgent,
} from '@packmind/types';
import { ICodingAgentRepositories } from '../../domain/repositories/ICodingAgentRepositories';
import { ICodingAgentDeployer } from '../../domain/repository/ICodingAgentDeployer';
import { ICodingAgentDeployerRegistry } from '../../domain/repository/ICodingAgentDeployerRegistry';
import { DeployerService } from './DeployerService';

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
    private skillResult: FileUpdates = { createOrUpdate: [], delete: [] },
    private artifactsResult: FileUpdates = { createOrUpdate: [], delete: [] },
    private removalResult: FileUpdates = { createOrUpdate: [], delete: [] },
    private cleanupResult: FileUpdates = { createOrUpdate: [], delete: [] },
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

  async deploySkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    gitRepo: GitRepo,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: Target,
  ): Promise<FileUpdates> {
    return this.skillResult;
  }

  async generateFileUpdatesForSkills(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[],
  ): Promise<FileUpdates> {
    return this.skillResult;
  }

  async generateRemovalFileUpdates(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    installed: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
  ): Promise<FileUpdates> {
    return this.removalResult;
  }

  async generateAgentCleanupFileUpdates(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    artifacts: {
      recipeVersions: RecipeVersion[];
      standardVersions: StandardVersion[];
      skillVersions: SkillVersion[];
    },
  ): Promise<FileUpdates> {
    return this.cleanupResult;
  }

  getSkillsFolderPath(): string | undefined {
    return undefined;
  }

  async deployArtifacts(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recipeVersions: RecipeVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    standardVersions: StandardVersion[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skillVersions: SkillVersion[] = [],
  ): Promise<FileUpdates> {
    return this.artifactsResult;
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

// Mock repositories
class MockRepositories implements ICodingAgentRepositories {
  constructor(private readonly registry: MockRegistry) {}

  getDeployerRegistry(): ICodingAgentDeployerRegistry {
    return this.registry;
  }
}

describe('DeployerService', () => {
  let service: DeployerService;
  let registry: MockRegistry;
  let repositories: MockRepositories;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;
  let mockRecipeVersions: RecipeVersion[];
  let mockStandardVersions: StandardVersion[];
  let mockLogger: PackmindLogger;

  beforeEach(() => {
    mockLogger = stubLogger();
    registry = new MockRegistry();
    repositories = new MockRepositories(registry);
    service = new DeployerService(repositories, mockLogger);

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
    describe('when aggregating deployments from single agent', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const mockDeployer = new MockDeployer({
          createOrUpdate: [{ path: 'recipe1.md', content: 'content1' }],
          delete: [{ path: 'old-recipe.md' }],
        });

        registry.registerDeployer('packmind', mockDeployer);

        result = await service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        );
      });

      it('returns one file to create or update', () => {
        expect(result.createOrUpdate).toEqual([
          { path: 'recipe1.md', content: 'content1' },
        ]);
      });

      it('returns one file to delete', () => {
        expect(result.delete).toEqual([{ path: 'old-recipe.md' }]);
      });
    });

    describe('when aggregating deployments from multiple agents', () => {
      let result: FileUpdates;

      beforeEach(async () => {
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

        result = await service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind', 'junie'],
        );
      });

      it('returns files from all agents', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('returns empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when merging conflicting paths', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const deployer1 = new MockDeployer({
          createOrUpdate: [
            { path: 'common.md', content: 'first content' },
            { path: 'unique1.md', content: 'unique1' },
          ],
          delete: [],
        });

        registry.registerDeployer('packmind', deployer1);

        result = await service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        );
      });

      it('returns all files', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('preserves content for common path', () => {
        expect(
          result.createOrUpdate.find((f) => f.path === 'common.md')?.content,
        ).toBe('first content');
      });
    });

    describe('when deduplicating delete operations', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const deployer = new MockDeployer({
          createOrUpdate: [],
          delete: [{ path: 'delete1.md' }, { path: 'delete2.md' }],
        });

        registry.registerDeployer('packmind', deployer);

        result = await service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        );
      });

      it('returns correct number of files to delete', () => {
        expect(result.delete).toHaveLength(2);
      });

      it('returns correct file paths to delete', () => {
        expect(result.delete.map((d) => d.path).sort()).toEqual([
          'delete1.md',
          'delete2.md',
        ]);
      });
    });

    describe('when agents array is empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await service.aggregateRecipeDeployments(
          mockRecipeVersions,
          mockGitRepo,
          [mockTarget],
          [],
        );
      });

      it('returns empty createOrUpdate array', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('returns empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
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
        async deployArtifacts(): Promise<FileUpdates> {
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
    describe('when aggregating standards deployments from single agent', () => {
      let result: FileUpdates;

      beforeEach(async () => {
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

        result = await service.aggregateStandardsDeployments(
          mockStandardVersions,
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        );
      });

      it('returns one file to create or update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('returns correct file content', () => {
        expect(result.createOrUpdate[0]).toEqual({
          path: 'standard1.md',
          content: 'standard content',
        });
      });
    });

    describe('when standards array is empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await service.aggregateStandardsDeployments(
          [],
          mockGitRepo,
          [mockTarget],
          ['packmind'],
        );
      });

      it('returns empty createOrUpdate array', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('returns empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('aggregateArtifactRendering', () => {
    describe('when aggregating file updates from multiple coding agents', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const claudeDeployer = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [{ path: 'CLAUDE.md', content: 'claude content' }],
            delete: [],
          },
        );

        const cursorDeployer = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [
              { path: '.cursorrules', content: 'cursor content' },
            ],
            delete: [],
          },
        );

        registry.registerDeployer('claude', claudeDeployer);
        registry.registerDeployer('cursor', cursorDeployer);

        const existingFiles = new Map<string, string>();
        existingFiles.set('CLAUDE.md', '');
        existingFiles.set('.cursorrules', '');

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          ['claude', 'cursor'],
          existingFiles,
        );
      });

      it('returns files from all agents', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('includes CLAUDE.md file', () => {
        expect(result.createOrUpdate).toContainEqual({
          path: 'CLAUDE.md',
          content: 'claude content',
        });
      });

      it('includes cursorrules file', () => {
        expect(result.createOrUpdate).toContainEqual({
          path: '.cursorrules',
          content: 'cursor content',
        });
      });
    });

    it('uses correct existing content for each agent', async () => {
      const deployArtifactsSpy = jest.fn().mockResolvedValue({
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'new content' }],
        delete: [],
      });

      const claudeDeployer = {
        async deployRecipes(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
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
        deployArtifacts: deployArtifactsSpy,
      };

      registry.registerDeployer('claude', claudeDeployer);

      const existingFiles = new Map<string, string>();
      existingFiles.set('CLAUDE.md', 'existing claude content');

      await service.aggregateArtifactRendering(
        mockRecipeVersions,
        mockStandardVersions,
        [],
        ['claude'],
        existingFiles,
      );

      expect(deployArtifactsSpy).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
        [],
      );
    });

    describe('when merging file updates with later entries overriding earlier', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const deployer1 = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [
              { path: 'AGENTS.md', content: 'first content' },
              { path: 'file1.md', content: 'content1' },
            ],
            delete: [],
          },
        );

        const deployer2 = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [
              { path: 'AGENTS.md', content: 'second content' },
              { path: 'file2.md', content: 'content2' },
            ],
            delete: [],
          },
        );

        registry.registerDeployer('agents_md', deployer1);
        registry.registerDeployer('claude', deployer2);

        const existingFiles = new Map<string, string>();

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          ['agents_md', 'claude'],
          existingFiles,
        );
      });

      it('returns merged files from both deployers', () => {
        expect(result.createOrUpdate).toHaveLength(3);
      });

      it('uses later content for conflicting paths', () => {
        const agentsMdFile = result.createOrUpdate.find(
          (f) => f.path === 'AGENTS.md',
        );
        expect(agentsMdFile?.content).toBe('second content');
      });
    });

    describe('when codingAgents array is empty', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const existingFiles = new Map<string, string>();

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          [],
          existingFiles,
        );
      });

      it('returns empty createOrUpdate array', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('returns empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when deployer returns empty FileUpdates', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const emptyDeployer = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
        );

        registry.registerDeployer('claude', emptyDeployer);

        const existingFiles = new Map<string, string>();

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          ['claude'],
          existingFiles,
        );
      });

      it('returns empty createOrUpdate array', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('returns empty delete array', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when deduplicating files from multiple agents updating same file', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const deployer1 = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [{ path: 'same.md', content: 'first' }],
            delete: [],
          },
        );

        const deployer2 = new MockDeployer(
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          { createOrUpdate: [], delete: [] },
          {
            createOrUpdate: [{ path: 'same.md', content: 'second' }],
            delete: [],
          },
        );

        registry.registerDeployer('claude', deployer1);
        registry.registerDeployer('cursor', deployer2);

        const existingFiles = new Map<string, string>();

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          ['claude', 'cursor'],
          existingFiles,
        );
      });

      it('returns single file', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('uses content from last agent', () => {
        expect(result.createOrUpdate[0]).toEqual({
          path: 'same.md',
          content: 'second',
        });
      });
    });

    it('handles missing existing content for new files', async () => {
      const deployArtifactsSpy = jest.fn().mockResolvedValue({
        createOrUpdate: [{ path: 'CLAUDE.md', content: 'new file content' }],
        delete: [],
      });

      const claudeDeployer = {
        async deployRecipes(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
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
        deployArtifacts: deployArtifactsSpy,
      };

      registry.registerDeployer('claude', claudeDeployer);

      const existingFiles = new Map<string, string>();

      await service.aggregateArtifactRendering(
        mockRecipeVersions,
        mockStandardVersions,
        [],
        ['claude'],
        existingFiles,
      );

      expect(deployArtifactsSpy).toHaveBeenCalledWith(
        mockRecipeVersions,
        mockStandardVersions,
        [],
      );
    });

    it('propagates deployer errors', async () => {
      const errorDeployer = {
        async deployRecipes(): Promise<FileUpdates> {
          return { createOrUpdate: [], delete: [] };
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
        async deployArtifacts(): Promise<FileUpdates> {
          throw new Error('Artifact deployment failed');
        },
      };

      registry.registerDeployer('claude', errorDeployer);

      const existingFiles = new Map<string, string>();

      await expect(
        service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          ['claude'],
          existingFiles,
        ),
      ).rejects.toThrow('Artifact deployment failed');
    });

    describe('when handling all supported coding agents', () => {
      const agents: CodingAgent[] = [
        'claude',
        'agents_md',
        'cursor',
        'copilot',
        'junie',
        'packmind',
        'gitlab_duo',
      ];

      const expectedFiles = [
        'CLAUDE.md',
        'AGENTS.md',
        '.cursorrules',
        '.github/copilot-instructions.md',
        '.junie.md',
        '.packmind.md',
        '.gitlab/duo_chat.yml',
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        agents.forEach((agent, index) => {
          const deployer = new MockDeployer(
            { createOrUpdate: [], delete: [] },
            { createOrUpdate: [], delete: [] },
            { createOrUpdate: [], delete: [] },
            {
              createOrUpdate: [
                { path: expectedFiles[index], content: `${agent} content` },
              ],
              delete: [],
            },
          );
          registry.registerDeployer(agent, deployer);
        });

        const existingFiles = new Map<string, string>();

        result = await service.aggregateArtifactRendering(
          mockRecipeVersions,
          mockStandardVersions,
          [],
          agents,
          existingFiles,
        );
      });

      it('returns files from all agents', () => {
        expect(result.createOrUpdate).toHaveLength(7);
      });

      it.each([
        'CLAUDE.md',
        'AGENTS.md',
        '.cursorrules',
        '.github/copilot-instructions.md',
        '.junie.md',
        '.packmind.md',
        '.gitlab/duo_chat.yml',
      ])('includes %s file', (expectedFile) => {
        expect(
          result.createOrUpdate.find((f) => f.path === expectedFile),
        ).toBeDefined();
      });
    });
  });
});
