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
      const content = result.createOrUpdate[0].content;

      // Should not contain the string "null" as a value
      expect(content).not.toMatch(/:\s*null\s*$/m);
      expect(content).not.toMatch(/:\s*null\n/);

      // Should contain only the link without colon and description
      expect(content).toContain(
        '* [Recipe Without Summary](.packmind/recipes/recipe-without-summary.md)',
      );
      expect(content).not.toMatch(
        /Recipe Without Summary\].*:\s+Recipe Without Summary/,
      );
    });

    it('uses getTargetPrefixedPath for file path in recipe deployment', async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');

      // Verify gitHexa was called with the prefixed path
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        mockGitRepo,
        'jetbrains/TEST_AGENT.md',
      );
    });

    it('handles existing content correctly with target prefixing', async () => {
      const existingContent = 'Existing content in file';
      mockGitPort.getFileFromRepo.mockResolvedValue({
        sha: 'mock-sha-123',
        content: existingContent,
      });

      const result = await deployer.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      // Should create update since content will be different after section writer processes it
      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');

      // Verify the existing content was retrieved from the correct prefixed path
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        mockGitRepo,
        'jetbrains/TEST_AGENT.md',
      );
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
      const content = result.createOrUpdate[0].content;

      // Should not contain the string "null" as a value
      expect(content).not.toMatch(/:\s*null\s*$/m);
      expect(content).not.toMatch(/:\s*null\n/);

      // Should use description as fallback (only first line)
      expect(content).toContain('This is the description :');
      expect(content).toContain('* No rules defined yet.');
      expect(content).toContain(
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
      const content = result.createOrUpdate[0].content;

      // Should truncate description at 200 characters and add ellipsis
      expect(content).toContain(`${'A'.repeat(200)}... :`);
      expect(content).toContain('* No rules defined yet.');
      expect(content).toContain(
        'Full standard is available here for further request: [Standard With Long Description](.packmind/standards/standard-long-description.md)',
      );
      expect(content).not.toContain('A'.repeat(250));
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
      const content = result.createOrUpdate[0].content;

      // Should NOT truncate summary even if long
      expect(content).toContain(`${'B'.repeat(250)} :`);
      expect(content).toContain('* No rules defined yet.');
      expect(content).toContain(
        'Full standard is available here for further request: [Standard With Long Summary](.packmind/standards/standard-long-summary.md)',
      );
      expect(content).not.toContain('...');
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
      const content = result.createOrUpdate[0].content;

      // Should only contain first line
      expect(content).toContain('First line of description :');
      expect(content).toContain('* No rules defined yet.');
      expect(content).toContain(
        'Full standard is available here for further request: [Standard With Multiline](.packmind/standards/standard-multiline.md)',
      );
      expect(content).not.toContain('Second line');
      expect(content).not.toContain('Third line');
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
      const content = result.createOrUpdate[0].content;

      // Should not contain the string "null" as a value
      expect(content).not.toMatch(/:\s*null\s*$/m);
      expect(content).not.toMatch(/:\s*null\n/);

      expect(content).toContain('Summary unavailable :');
      expect(content).toContain('* No rules defined yet.');
      expect(content).toContain(
        'Full standard is available here for further request: [Standard Name Only](.packmind/standards/standard-name-only.md)',
      );
    });

    it('uses getTargetPrefixedPath for file path in standards deployment', async () => {
      mockGitPort.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        mockStandardVersions,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('vscode/TEST_AGENT.md');

      // Verify gitHexa was called with the prefixed path
      expect(mockGitPort.getFileFromRepo).toHaveBeenCalledWith(
        mockGitRepo,
        'vscode/TEST_AGENT.md',
      );
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
      // Even with empty recipes, the section writer will generate template content, so we expect 1 file
      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');
      expect(result.createOrUpdate[0].content).toContain('Packmind recipes');
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
      // Even with empty recipes, the section writer will generate template content, so we expect 1 file
      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.delete).toHaveLength(0);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');
      expect(result.createOrUpdate[0].content).toContain('Packmind recipes');
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

    it('generates file with both recipe and standard sections', async () => {
      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        '',
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- end: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain('<!-- end: Packmind standards -->');
      expect(content).toContain(
        '[Test Recipe](.packmind/recipes/test-recipe.md)',
      );
      expect(content).toContain('## Standard: Test Standard');
    });

    it('returns base file path without target prefixing', async () => {
      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        '',
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('TEST_AGENT.md');
      expect(result.createOrUpdate[0].path).not.toContain('jetbrains');
      expect(result.createOrUpdate[0].path).not.toContain('vscode');
    });

    it('preserves existing content outside markers', async () => {
      const existingContent = `# My Custom Configuration

This is my custom setup.

<!-- start: Packmind recipes -->
Old recipe content
<!-- end: Packmind recipes -->

Some text between sections.

<!-- start: Packmind standards -->
Old standard content
<!-- end: Packmind standards -->

Footer content.`;

      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        existingContent,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('# My Custom Configuration');
      expect(content).toContain('This is my custom setup.');
      expect(content).toContain('Some text between sections.');
      expect(content).toContain('Footer content.');
      expect(content).not.toContain('Old recipe content');
      expect(content).not.toContain('Old standard content');
    });

    it('returns empty arrays when content unchanged', async () => {
      const content1 = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        '',
      );

      const generatedContent = content1.createOrUpdate[0].content;

      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        generatedContent,
      );

      expect(result.createOrUpdate).toHaveLength(0);
      expect(result.delete).toHaveLength(0);
    });

    it('handles empty recipe versions', async () => {
      const result = await deployer.deployArtifacts(
        [],
        mockStandardVersions,
        '',
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain('## Standard: Test Standard');
    });

    it('handles empty standard versions', async () => {
      const result = await deployer.deployArtifacts(mockRecipeVersions, [], '');

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain(
        '[Test Recipe](.packmind/recipes/test-recipe.md)',
      );
    });

    it('handles both empty arrays', async () => {
      const result = await deployer.deployArtifacts([], [], '');

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- end: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain('<!-- end: Packmind standards -->');
    });

    it('handles existing content with only recipe section', async () => {
      const existingContent = `# Configuration

<!-- start: Packmind recipes -->
Old recipes
<!-- end: Packmind recipes -->

Custom content.`;

      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        existingContent,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('# Configuration');
      expect(content).toContain('Custom content.');
      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain(
        '[Test Recipe](.packmind/recipes/test-recipe.md)',
      );
      expect(content).toContain('## Standard: Test Standard');
    });

    it('handles existing content with only standard section', async () => {
      const existingContent = `# Configuration

<!-- start: Packmind standards -->
Old standards
<!-- end: Packmind standards -->

Custom content.`;

      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        existingContent,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('# Configuration');
      expect(content).toContain('Custom content.');
      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
      expect(content).toContain(
        '[Test Recipe](.packmind/recipes/test-recipe.md)',
      );
      expect(content).toContain('## Standard: Test Standard');
    });

    it('handles existing content with neither section', async () => {
      const existingContent = `# My Configuration

Custom setup here.

More custom content.`;

      const result = await deployer.deployArtifacts(
        mockRecipeVersions,
        mockStandardVersions,
        existingContent,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).toContain('# My Configuration');
      expect(content).toContain('Custom setup here.');
      expect(content).toContain('More custom content.');
      expect(content).toContain('<!-- start: Packmind recipes -->');
      expect(content).toContain('<!-- start: Packmind standards -->');
    });

    it('fetches rules for standards when not present', async () => {
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

      const result = await deployer.deployArtifacts(
        [],
        standardWithoutRules,
        '',
      );

      expect(mockStandardsPort.getRulesByStandardId).toHaveBeenCalledWith(
        mockStandardVersions[0].standardId,
      );
      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].content).toContain('Test rule content');
    });

    it('uses existing rules when present on standard version', async () => {
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

      const result = await deployer.deployArtifacts([], standardWithRules, '');

      expect(mockStandardsPort.getRulesByStandardId).not.toHaveBeenCalled();
      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].content).toContain('Existing rule');
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
        '',
      );

      expect(result.createOrUpdate).toHaveLength(1);
      const content = result.createOrUpdate[0].content;

      expect(content).not.toMatch(/:\s*null\s*$/m);
      expect(content).not.toMatch(/:\s*null\n/);
    });
  });
});
