import { createUserId } from '@packmind/types';
import {
  createRecipeId,
  createRecipeVersionId,
  RecipeVersion,
  createStandardId,
  createStandardVersionId,
  StandardVersion,
  GitRepo,
  Target,
  createTargetId,
  createGitRepoId,
  createGitProviderId,
  RuleId,
} from '@packmind/types';
import { SingleFileDeployer, DeployerConfig } from './SingleFileDeployer';
import { v4 as uuidv4 } from 'uuid';
import { IStandardsPort, IGitPort } from '@packmind/types';

// Create a concrete test implementation of the abstract SingleFileDeployer
class TestSingleFileDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: 'TEST_AGENT.md',
    agentName: 'TestAgent',
  };
}

describe('SingleFileDeployer', () => {
  let deployer: TestSingleFileDeployer;
  let mockGitPort: jest.Mocked<IGitPort>;
  let mockStandardsPort: jest.Mocked<IStandardsPort>;
  let mockGitRepo: GitRepo;
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;

  beforeEach(() => {
    mockGitPort = {
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<IGitPort>;
    mockStandardsPort = {} as unknown as jest.Mocked<IStandardsPort>;

    deployer = new TestSingleFileDeployer(mockStandardsPort, mockGitPort);

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'testowner',
      repo: 'testrepo',
      branch: 'main',
      providerId: createGitProviderId('test-provider-id'),
    };

    jetbrainsTarget = {
      id: createTargetId(uuidv4()),
      name: 'jetbrains',
      path: '/jetbrains/',
      gitRepoId: mockGitRepo.id,
    };

    vscodeTarget = {
      id: createTargetId(uuidv4()),
      name: 'vscode',
      path: '/vscode/',
      gitRepoId: mockGitRepo.id,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deployRecipes', () => {
    const mockRecipeVersions: RecipeVersion[] = [
      {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: createRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: '# Test Recipe Content',
        version: 1,
        summary: 'Test recipe summary',
        userId: createUserId('user-1'),
      },
    ];

    it('never outputs "null" for recipe with null summary', async () => {
      const recipeWithNullSummary: RecipeVersion[] = [
        {
          id: createRecipeVersionId('recipe-version-1'),
          recipeId: createRecipeId('recipe-1'),
          name: 'Recipe Without Summary',
          slug: 'recipe-without-summary',
          content: '# Recipe Content',
          version: 1,
          summary: null,
          userId: createUserId('user-1'),
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployRecipes(
        recipeWithNullSummary,
        mockGitRepo,
        jetbrainsTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should not contain the string "null" as a value
      expect(sectionContent).not.toMatch(/:\s*null\s*$/m);
      expect(sectionContent).not.toMatch(/:\s*null\n/);

      // Should contain only the link without colon and description
      expect(sectionContent).toContain(
        '* [Recipe Without Summary](.packmind/recipes/recipe-without-summary.md)',
      );
      expect(sectionContent).not.toMatch(
        /Recipe Without Summary\].*:\s+Recipe Without Summary/,
      );
    });

    it('uses getTargetPrefixedPath for file path in recipe deployment', async () => {
      const result = await deployer.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');
    });
  });

  describe('deployStandards', () => {
    const mockStandardVersions: StandardVersion[] = [
      {
        id: createStandardVersionId('standard-version-1'),
        standardId: createStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test standard description',
        version: 1,
        summary: 'Test standard summary',
        userId: createUserId('user-1'),
        scope: 'test',
      },
    ];

    it('never outputs "null" for standard with null summary but existing description', async () => {
      const standardWithNullSummary: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Standard Without Summary',
          slug: 'standard-without-summary',
          description: 'This is the description',
          version: 1,
          summary: null,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        standardWithNullSummary,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should not contain the string "null" as a value
      expect(sectionContent).not.toMatch(/:\s*null\s*$/m);
      expect(sectionContent).not.toMatch(/:\s*null\n/);

      // Should use description as fallback (only first line)
      expect(sectionContent).toContain('This is the description :');
      expect(sectionContent).toContain('* No rules defined yet.');
      expect(sectionContent).toContain(
        'Full standard is available here for further request: [Standard Without Summary](.packmind/standards/standard-without-summary.md)',
      );
    });

    it('truncates long descriptions (not summaries) to 200 characters', async () => {
      const standardWithLongDescription: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Standard With Long Description',
          slug: 'standard-long-description',
          description: 'A'.repeat(250),
          version: 1,
          summary: null, // Using description fallback, should truncate
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        standardWithLongDescription,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should truncate description at 200 characters and add ellipsis
      expect(sectionContent).toContain(`${'A'.repeat(200)}... :`);
      expect(sectionContent).toContain('* No rules defined yet.');
      expect(sectionContent).toContain(
        'Full standard is available here for further request: [Standard With Long Description](.packmind/standards/standard-long-description.md)',
      );
      expect(sectionContent).not.toContain('A'.repeat(250));
    });

    it('does not truncate long summaries', async () => {
      const standardWithLongSummary: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Standard With Long Summary',
          slug: 'standard-long-summary',
          description: 'Short description',
          version: 1,
          summary: 'B'.repeat(250), // Using summary, should NOT truncate
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        standardWithLongSummary,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should NOT truncate summary even if long
      expect(sectionContent).toContain(`${'B'.repeat(250)} :`);
      expect(sectionContent).toContain('* No rules defined yet.');
      expect(sectionContent).toContain(
        'Full standard is available here for further request: [Standard With Long Summary](.packmind/standards/standard-long-summary.md)',
      );
      expect(sectionContent).not.toContain('...');
    });

    it('only uses first line of multiline descriptions', async () => {
      const standardWithMultilineDescription: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Standard With Multiline',
          slug: 'standard-multiline',
          description:
            'First line of description\nSecond line should not appear\nThird line also not',
          version: 1,
          summary: null,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        standardWithMultilineDescription,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should only contain first line
      expect(sectionContent).toContain('First line of description :');
      expect(sectionContent).toContain('* No rules defined yet.');
      expect(sectionContent).toContain(
        'Full standard is available here for further request: [Standard With Multiline](.packmind/standards/standard-multiline.md)',
      );
      expect(sectionContent).not.toContain('Second line');
      expect(sectionContent).not.toContain('Third line');
    });

    it('never outputs "null" for standard with both null summary and description', async () => {
      const standardWithNullEverything: StandardVersion[] = [
        {
          id: createStandardVersionId('standard-version-1'),
          standardId: createStandardId('standard-1'),
          name: 'Standard Name Only',
          slug: 'standard-name-only',
          description: null as unknown as string,
          version: 1,
          summary: null,
          userId: createUserId('user-1'),
          scope: 'test',
        },
      ];

      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        standardWithNullEverything,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const sectionContent = result.createOrUpdate[0].sections![0].content;

      // Should not contain the string "null" as a value
      expect(sectionContent).not.toMatch(/:\s*null\s*$/m);
      expect(sectionContent).not.toMatch(/:\s*null\n/);

      expect(sectionContent).toContain('Summary unavailable :');
      expect(sectionContent).toContain('* No rules defined yet.');
      expect(sectionContent).toContain(
        'Full standard is available here for further request: [Standard Name Only](.packmind/standards/standard-name-only.md)',
      );
    });

    it('uses getTargetPrefixedPath for file path in standards deployment', async () => {
      const result = await deployer.deployStandards(
        mockStandardVersions,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('vscode/TEST_AGENT.md');
    });
  });

  describe('error handling in getExistingContent', () => {
    it('returns empty string on gitHexa error', async () => {
      const mockRecipeVersions: RecipeVersion[] = [];
      mockGitPort.getFileFromRepo.mockRejectedValue(new Error('Git error'));

      const result = await deployer.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      // Should not throw error and should handle gracefully
      // With empty recipes, no file updates should be generated
      expect(result.createOrUpdate).toHaveLength(0);
      expect(result.delete).toHaveLength(0);
    });

    it('handles missing gitHexa gracefully', async () => {
      const deployerWithoutGit = new TestSingleFileDeployer(); // No gitHexa
      const mockRecipeVersions: RecipeVersion[] = [];

      const result = await deployerWithoutGit.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      // Should not throw error and should handle gracefully
      // With empty recipes, no file updates should be generated
      expect(result.createOrUpdate).toHaveLength(0);
      expect(result.delete).toHaveLength(0);
    });
  });

  describe('deployArtifacts', () => {
    const mockRecipeVersions: RecipeVersion[] = [
      {
        id: createRecipeVersionId('recipe-version-1'),
        recipeId: createRecipeId('recipe-1'),
        name: 'Test Recipe',
        slug: 'test-recipe',
        content: '# Test Recipe Content',
        version: 1,
        summary: 'Test recipe summary',
        userId: createUserId('user-1'),
      },
    ];

    const mockStandardVersions: StandardVersion[] = [
      {
        id: createStandardVersionId('standard-version-1'),
        standardId: createStandardId('standard-1'),
        name: 'Test Standard',
        slug: 'test-standard',
        description: 'Test standard description',
        version: 1,
        summary: 'Test standard summary',
        userId: createUserId('user-1'),
        scope: 'test',
      },
    ];

    it('generates sections for both recipes and standards', async () => {
      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const file = result.createOrUpdate[0];

      expect(file.path).toBe('TEST_AGENT.md');
      expect(file.sections).toHaveLength(2);

      const recipesSection = file.sections!.find(
        (s) => s.key === 'Packmind recipes',
      );
      expect(recipesSection).toBeDefined();
      expect(recipesSection!.content).toContain(
        '[Test Recipe](.packmind/recipes/test-recipe.md)',
      );

      const standardsSection = file.sections!.find(
        (s) => s.key === 'Packmind standards',
      );
      expect(standardsSection).toBeDefined();
      expect(standardsSection!.content).toContain('## Standard: Test Standard');
    });

    it('returns base file path without target prefixing', async () => {
      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('TEST_AGENT.md');
      expect(result.createOrUpdate[0].path).not.toContain('jetbrains');
      expect(result.createOrUpdate[0].path).not.toContain('vscode');
    });

    describe('when recipes are empty', () => {
      it('generates only standards section', async () => {
        const result = await deployer.deployArtifacts([], mockStandardVersions);

        expect(result.createOrUpdate).toHaveLength(1);
        const file = result.createOrUpdate[0];

        expect(file.sections).toHaveLength(1);
        expect(file.sections![0].key).toBe('Packmind standards');
        expect(file.sections![0].content).toContain(
          '## Standard: Test Standard',
        );
      });
    });

    describe('when standards are empty', () => {
      it('generates only recipes section', async () => {
        const result = await deployer.deployArtifacts(mockRecipeVersions, []);

        expect(result.createOrUpdate).toHaveLength(1);
        const file = result.createOrUpdate[0];

        expect(file.sections).toHaveLength(1);
        expect(file.sections![0].key).toBe('Packmind recipes');
        expect(file.sections![0].content).toContain(
          '[Test Recipe](.packmind/recipes/test-recipe.md)',
        );
      });
    });

    describe('when both recipes and standards are empty', () => {
      it('returns empty array', async () => {
        const result = await deployer.deployArtifacts([], []);

        expect(result.createOrUpdate).toHaveLength(0);
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when rules not present on standards', () => {
      it('fetches rules for standards', async () => {
        const mockRules = [
          {
            id: 'rule-1',
            standardId: mockStandardVersions[0].standardId,
            content: 'Test rule content',
            order: 1,
          },
        ];

        mockStandardsPort.getRulesByStandardId = jest
          .fn()
          .mockResolvedValue(mockRules);

        const standardWithoutRules = [
          {
            ...mockStandardVersions[0],
            rules: undefined,
          },
        ];

        const result = await deployer.deployArtifacts([], standardWithoutRules);

        expect(mockStandardsPort.getRulesByStandardId).toHaveBeenCalledWith(
          mockStandardVersions[0].standardId,
        );
        expect(result.createOrUpdate).toHaveLength(1);
        const file = result.createOrUpdate[0];
        expect(file.sections![0].content).toContain('Test rule content');
      });
    });

    describe('when rules present on standard version', () => {
      it('uses existing rules', async () => {
        mockStandardsPort.getRulesByStandardId = jest.fn();

        const standardWithRules = [
          {
            ...mockStandardVersions[0],
            rules: [
              {
                id: 'rule-1' as RuleId,
                standardVersionId: mockStandardVersions[0].id,
                content: 'Existing rule',
              },
            ],
          },
        ];

        const result = await deployer.deployArtifacts([], standardWithRules);

        expect(mockStandardsPort.getRulesByStandardId).not.toHaveBeenCalled();
        expect(result.createOrUpdate).toHaveLength(1);
        const file = result.createOrUpdate[0];
        expect(file.sections![0].content).toContain('Existing rule');
      });
    });

    it('handles null/undefined summaries gracefully', async () => {
      const recipeWithNullSummary = [
        {
          ...mockRecipeVersions[0],
          summary: null,
        },
      ];

      const standardWithNullSummary = [
        {
          ...mockStandardVersions[0],
          summary: null,
        },
      ];

      const result = await deployer.deployArtifacts(
        recipeWithNullSummary,
        standardWithNullSummary,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const file = result.createOrUpdate[0];
      const recipesSection = file.sections!.find(
        (s) => s.key === 'Packmind recipes',
      );
      const standardsSection = file.sections!.find(
        (s) => s.key === 'Packmind standards',
      );

      expect(recipesSection!.content).not.toMatch(/:\s*null\s*$/m);
      expect(recipesSection!.content).not.toMatch(/:\s*null\n/);
      expect(standardsSection!.content).not.toMatch(/:\s*null\s*$/m);
      expect(standardsSection!.content).not.toMatch(/:\s*null\n/);
    });
  });

  describe('generateRemovalFileUpdates', () => {
    describe('when all recipes are removed and none remain installed', () => {
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
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets the correct agent file', () => {
        expect(result.createOrUpdate[0].path).toBe('TEST_AGENT.md');
      });

      it('generates one section update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('targets the Packmind recipes section', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets the section content to empty', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when recipes are removed but others remain installed', () => {
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
          },
          {
            recipeVersions: installedRecipes,
            standardVersions: [],
          },
        );
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all standards are removed and none remain installed', () => {
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
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets the correct agent file', () => {
        expect(result.createOrUpdate[0].path).toBe('TEST_AGENT.md');
      });

      it('generates one section update', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(1);
      });

      it('targets the Packmind standards section', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind standards',
        );
      });

      it('sets the section content to empty', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
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
          },
          {
            recipeVersions: [],
            standardVersions: installedStandards,
          },
        );
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when all recipes and standards are removed and none remain installed', () => {
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
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
        );
      });

      it('generates one createOrUpdate entry', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('generates two section updates', () => {
        expect(result.createOrUpdate[0].sections).toHaveLength(2);
      });

      it('targets the Packmind recipes section first', () => {
        expect(result.createOrUpdate[0].sections![0].key).toBe(
          'Packmind recipes',
        );
      });

      it('sets the recipes section content to empty', () => {
        expect(result.createOrUpdate[0].sections![0].content).toBe('');
      });

      it('targets the Packmind standards section second', () => {
        expect(result.createOrUpdate[0].sections![1].key).toBe(
          'Packmind standards',
        );
      });

      it('sets the standards section content to empty', () => {
        expect(result.createOrUpdate[0].sections![1].content).toBe('');
      });
    });

    describe('when no artifacts are removed', () => {
      let result: FileUpdates;

      beforeEach(async () => {
        result = await deployer.generateRemovalFileUpdates(
          {
            recipeVersions: [],
            standardVersions: [],
          },
          {
            recipeVersions: [],
            standardVersions: [],
          },
        );
      });

      it('does not generate createOrUpdate entries', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('does not generate delete entries', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });
});
