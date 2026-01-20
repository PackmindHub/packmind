import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';
import {
  createGitProviderId,
  createGitRepoId,
  createRecipeId,
  createRecipeVersionId,
  createRuleId,
  createSpaceId,
  createStandardId,
  createStandardVersionId,
  createTargetId,
  createUserId,
  DeleteItemType,
  FileUpdates,
  GitRepo,
  IStandardsPort,
  Recipe,
  RecipeVersion,
  Rule,
  Standard,
  StandardVersion,
  Target,
} from '@packmind/types';
import { PackmindDeployer } from './PackmindDeployer';

describe('PackmindDeployer', () => {
  let deployer: PackmindDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;

  beforeEach(() => {
    mockStandardsPort = {
      getRulesByStandardId: jest.fn(),
    } as unknown as jest.Mocked<IStandardsPort>;
    deployer = new PackmindDeployer(mockStandardsPort);

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId('test-repo-id'),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  describe('deployRecipes', () => {
    describe('when deploying a single recipe', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const recipe: Recipe = recipeFactory({
          id: createRecipeId('recipe-1'),
          name: 'Test Recipe',
          slug: 'test-recipe',
          content: 'Original recipe content',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        });

        const recipeVersion: RecipeVersion = {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: recipe.id,
          name: recipe.name,
          slug: recipe.slug,
          content: 'This is the recipe content',
          version: 1,
          summary: 'A test recipe summary',
          userId: createUserId('user-1'),
        };

        result = await deployer.deployRecipes(
          [recipeVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates two files', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('deletes legacy recipes-index.md file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/recipes-index.md',
          type: DeleteItemType.File,
        });
      });

      it('creates command file with recipe content', () => {
        const commandFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/commands/test-recipe.md',
        );
        expect(commandFile?.content).toContain('This is the recipe content');
      });

      it('creates commands index with header', () => {
        const commandsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/commands-index.md',
        );
        expect(commandsIndexFile?.content).toContain(
          '# Packmind Commands Index',
        );
      });

      it('creates commands index with available commands section', () => {
        const commandsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/commands-index.md',
        );
        expect(commandsIndexFile?.content).toContain('## Available Commands');
      });

      it('creates commands index with recipe link and summary', () => {
        const commandsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/commands-index.md',
        );
        expect(commandsIndexFile?.content).toContain(
          '- [Test Recipe](commands/test-recipe.md) : A test recipe summary',
        );
      });
    });

    describe('when deploying multiple recipes', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const zebraRecipe: Recipe = recipeFactory({
          id: createRecipeId('recipe-z'),
          name: 'Zebra Recipe',
          slug: 'zebra-recipe',
          content: 'Original zebra content',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        });

        const appleRecipe: Recipe = recipeFactory({
          id: createRecipeId('recipe-a'),
          name: 'Apple Recipe',
          slug: 'apple-recipe',
          content: 'Original apple content',
          version: 2,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
        });

        const recipeVersions: RecipeVersion[] = [
          {
            id: createRecipeVersionId('recipe-version-z'),
            recipeId: zebraRecipe.id,
            name: zebraRecipe.name,
            slug: zebraRecipe.slug,
            content: 'Zebra content',
            version: 1,
            summary: 'Last alphabetically',
            userId: createUserId('user-1'),
          },
          {
            id: createRecipeVersionId('recipe-version-a'),
            recipeId: appleRecipe.id,
            name: appleRecipe.name,
            slug: appleRecipe.slug,
            content: 'Apple content',
            version: 2,
            summary: 'First alphabetically',
            userId: createUserId('user-1'),
          },
        ];

        result = await deployer.deployRecipes(
          recipeVersions,
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates three files', () => {
        expect(result.createOrUpdate).toHaveLength(3);
      });

      it('sorts commands alphabetically in index', () => {
        const commandsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/commands-index.md',
        );
        const commandsIndexContent = commandsIndexFile?.content || '';
        const appleIndex = commandsIndexContent.indexOf('Apple Recipe');
        const zebraIndex = commandsIndexContent.indexOf('Zebra Recipe');
        expect(appleIndex).toBeLessThan(zebraIndex);
      });
    });

    describe('when deploying empty recipe list', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployRecipes([], mockGitRepo, mockTarget);
      });

      it('creates only commands index file', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('deletes legacy recipes-index.md file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/recipes-index.md',
          type: DeleteItemType.File,
        });
      });

      it('includes no commands available message', () => {
        const commandsIndexFile = result.createOrUpdate[0];
        expect(commandsIndexFile.content).toContain('No commands available.');
      });
    });
  });

  describe('deployStandards', () => {
    describe('when deploying a single standard', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const standard: Standard = standardFactory({
          id: createStandardId('standard-1'),
          name: 'Test Standard',
          slug: 'test-standard',
          description: 'Original standard description',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: 'backend',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'This is the standard description',
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        const rules: Rule[] = [
          {
            id: createRuleId('rule-id'),
            standardVersionId: standardVersion.id,
            content: 'My super rule',
          },
        ];
        mockStandardsPort.getRulesByStandardId.mockResolvedValue(rules);

        result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates two files', () => {
        expect(result.createOrUpdate).toHaveLength(2);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });

      it('creates standard file with title', () => {
        const standardFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/test-standard.md',
        );
        expect(standardFile?.content).toContain('# Test Standard');
      });

      it('creates standard file with description', () => {
        const standardFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/test-standard.md',
        );
        expect(standardFile?.content).toContain(
          'This is the standard description',
        );
      });

      it('creates standard file with rules section', () => {
        const standardFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/test-standard.md',
        );
        expect(standardFile?.content).toContain('## Rules');
      });

      it('creates standards index with header', () => {
        const standardsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards-index.md',
        );
        expect(standardsIndexFile?.content).toContain(
          '# Packmind Standards Index',
        );
      });

      it('creates standards index with available standards section', () => {
        const standardsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards-index.md',
        );
        expect(standardsIndexFile?.content).toContain('## Available Standards');
      });

      it('creates standards index with standard link and summary', () => {
        const standardsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards-index.md',
        );
        expect(standardsIndexFile?.content).toContain(
          '- [Test Standard](./standards/test-standard.md) : A test standard summary',
        );
      });
    });

    describe('when deploying standard with rules', () => {
      let standardFile: { path: string; content: string } | undefined;

      beforeEach(async () => {
        const standard: Standard = standardFactory({
          id: createStandardId('standard-with-rules'),
          name: 'Standard With Rules',
          slug: 'standard-with-rules',
          description: 'Original standard with rules',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: 'backend',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-with-rules'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'This standard has rules',
          version: 1,
          summary: 'Standard with rules summary',
          userId: createUserId('user-1'),
          scope: 'backend',
          rules: [
            {
              id: 'rule-1' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
              content: 'Always use const for immutable values',
              standardVersionId: 'standard-version-with-rules' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            },
            {
              id: 'rule-2' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
              content: 'Prefer async/await over promises',
              standardVersionId: 'standard-version-with-rules' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            },
          ],
        };

        const result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        standardFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/standard-with-rules.md',
        );
      });

      it('includes standard title', () => {
        expect(standardFile?.content).toContain('# Standard With Rules');
      });

      it('includes standard description', () => {
        expect(standardFile?.content).toContain('This standard has rules');
      });

      it('includes rules section header', () => {
        expect(standardFile?.content).toContain('## Rules');
      });

      it('includes first rule content', () => {
        expect(standardFile?.content).toContain(
          '* Always use const for immutable values',
        );
      });

      it('includes second rule content', () => {
        expect(standardFile?.content).toContain(
          '* Prefer async/await over promises',
        );
      });
    });

    it('handles standard without scope', async () => {
      const standard: Standard = standardFactory({
        id: createStandardId('standard-no-scope'),
        name: 'No Scope Standard',
        slug: 'no-scope-standard',
        description: 'Original description without scope',
        version: 1,
        userId: createUserId('user-1'),
        spaceId: createSpaceId('space-1'),
        scope: null,
      });

      const standardVersion: StandardVersion = {
        id: createStandardVersionId('standard-version-no-scope'),
        standardId: standard.id,
        name: standard.name,
        slug: standard.slug,
        description: 'Description without scope',
        version: 1,
        summary: null,
        userId: createUserId('user-1'),
        scope: null,
      };

      const result = await deployer.deployStandards(
        [standardVersion],
        mockGitRepo,
        mockTarget,
      );

      const standardFile = result.createOrUpdate.find(
        (f) => f.path === '.packmind/standards/no-scope-standard.md',
      );
      expect(standardFile?.content).toContain('Description without scope');
    });

    describe('when deploying multiple standards', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        const zebraStandard: Standard = standardFactory({
          id: createStandardId('standard-z'),
          name: 'Zebra Standard',
          slug: 'zebra-standard',
          description: 'Original zebra description',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: null,
        });

        const appleStandard: Standard = standardFactory({
          id: createStandardId('standard-a'),
          name: 'Apple Standard',
          slug: 'apple-standard',
          description: 'Original apple description',
          version: 2,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: 'frontend',
        });

        const standardVersions: StandardVersion[] = [
          {
            id: createStandardVersionId('standard-version-z'),
            standardId: zebraStandard.id,
            name: zebraStandard.name,
            slug: zebraStandard.slug,
            description: 'Zebra description',
            version: 1,
            summary: 'Last alphabetically',
            userId: createUserId('user-1'),
            scope: null,
          },
          {
            id: createStandardVersionId('standard-version-a'),
            standardId: appleStandard.id,
            name: appleStandard.name,
            slug: appleStandard.slug,
            description: 'Apple description',
            version: 2,
            summary: 'First alphabetically',
            userId: createUserId('user-1'),
            scope: 'frontend',
          },
        ];

        result = await deployer.deployStandards(
          standardVersions,
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates three files', () => {
        expect(result.createOrUpdate).toHaveLength(3);
      });

      it('sorts standards alphabetically in index', () => {
        const standardsIndexFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards-index.md',
        );
        const indexContent = standardsIndexFile?.content || '';
        const appleIndex = indexContent.indexOf('Apple Standard');
        const zebraIndex = indexContent.indexOf('Zebra Standard');
        expect(appleIndex).toBeLessThan(zebraIndex);
      });
    });

    describe('when deploying empty standards list', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.deployStandards([], mockGitRepo, mockTarget);
      });

      it('creates only standards index file', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });

      it('includes no standards available message', () => {
        const indexFile = result.createOrUpdate[0];
        expect(indexFile.content).toContain('No standards available.');
      });
    });

    describe('when rules are not provided in standard version', () => {
      let localMockStandardsPort: { getRulesByStandardId: jest.Mock };
      let result: FileUpdates;
      let standard: Standard;
      let standardFile: { path: string; content: string } | undefined;

      beforeEach(async () => {
        localMockStandardsPort = {
          getRulesByStandardId: jest.fn().mockResolvedValue([
            {
              id: 'rule-1',
              content: 'Fetched rule 1',
              standardVersionId: 'standard-version-1',
            },
            {
              id: 'rule-2',
              content: 'Fetched rule 2',
              standardVersionId: 'standard-version-1',
            },
          ]),
        };

        const deployerWithHexa = new PackmindDeployer(
          localMockStandardsPort as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        );

        standard = standardFactory({
          id: createStandardId('standard-1'),
          name: 'Standard Without Rules',
          slug: 'standard-without-rules',
          description: 'Original standard description',
          version: 1,
          userId: createUserId('user-1'),
          spaceId: createSpaceId('space-1'),
          scope: 'backend',
        });

        const standardVersion: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'Standard without rules initially',
          version: 1,
          summary: 'Test summary',
          userId: createUserId('user-1'),
          scope: 'backend',
        };

        result = await deployerWithHexa.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );

        standardFile = result.createOrUpdate.find(
          (f) => f.path === '.packmind/standards/standard-without-rules.md',
        );
      });

      it('calls StandardsPort with standardId', () => {
        expect(
          localMockStandardsPort.getRulesByStandardId,
        ).toHaveBeenCalledWith(standard.id);
      });

      it('includes first fetched rule in output', () => {
        expect(standardFile?.content).toContain('* Fetched rule 1');
      });

      it('includes second fetched rule in output', () => {
        expect(standardFile?.content).toContain('* Fetched rule 2');
      });
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when recipes are removed and none remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe',
          slug: 'removed-recipe',
          content: '# Removed Recipe',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates six delete entries', () => {
        expect(result.delete).toHaveLength(6);
      });

      it('deletes the removed command file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/removed-recipe.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the standards index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the standards folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the packmind folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/',
          type: DeleteItemType.Directory,
        });
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when commands are removed but others remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe',
          slug: 'removed-recipe',
          content: '# Removed Recipe',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
        },
      ];

      const installedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: createRecipeId('recipe-2'),
          name: 'Installed Recipe',
          slug: 'installed-recipe',
          content: '# Installed Recipe',
          version: 1,
          summary: 'Installed',
          userId: createUserId('user-1'),
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: installedRecipes,
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates two delete entries', () => {
        expect(result.delete).toHaveLength(2);
      });

      it('deletes the removed command file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/removed-recipe.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the standards index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        });
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when standards are removed and none remain installed', () => {
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates six delete entries', () => {
        expect(result.delete).toHaveLength(6);
      });

      it('deletes the removed standard file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/removed-standard.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the standards index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the standards folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the packmind folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/',
          type: DeleteItemType.Directory,
        });
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when standards are removed but others remain installed', () => {
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      const installedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-2'),
          standardId: createStandardId('standard-2'),
          name: 'Installed Standard',
          slug: 'installed-standard',
          description: 'Installed',
          version: 1,
          summary: 'Installed',
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: installedStandards,
            skillVersions: [],
          },
        );
      });

      it('generates two delete entries', () => {
        expect(result.delete).toHaveLength(2);
      });

      it('deletes the removed standard file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/removed-standard.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands-index.md',
          type: DeleteItemType.File,
        });
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when all commands and standards are removed and none remain installed', () => {
      const removedRecipes: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Removed Recipe 1',
          slug: 'removed-recipe-1',
          content: '# Removed Recipe 1',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
        },
        {
          id: createRecipeVersionId('recipe-version-2'),
          recipeId: createRecipeId('recipe-2'),
          name: 'Removed Recipe 2',
          slug: 'removed-recipe-2',
          content: '# Removed Recipe 2',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
        },
      ];
      const removedStandards: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Removed Standard',
          slug: 'removed-standard',
          description: 'Removed',
          version: 1,
          summary: 'Removed',
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: removedRecipes,
            standardVersions: removedStandards,
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('generates eight delete entries', () => {
        expect(result.delete).toHaveLength(8);
      });

      it('deletes the first removed command file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/removed-recipe-1.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the second removed command file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/removed-recipe-2.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the removed standard file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/removed-standard.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the standards index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the commands folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the standards folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards/',
          type: DeleteItemType.Directory,
        });
      });

      it('deletes the packmind folder', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/',
          type: DeleteItemType.Directory,
        });
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });
    });

    describe('when no artifacts are removed', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
            skillVersions: [],
          },
        );
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('generates two delete entries for index files', () => {
        expect(result.delete).toHaveLength(2);
      });

      it('deletes the commands index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/commands-index.md',
          type: DeleteItemType.File,
        });
      });

      it('deletes the standards index file', () => {
        expect(result.delete).toContainEqual({
          path: '.packmind/standards-index.md',
          type: DeleteItemType.File,
        });
      });
    });
  });
});
