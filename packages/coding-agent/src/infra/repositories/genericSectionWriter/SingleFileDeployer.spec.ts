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
  createUserId,
  createGitRepoId,
  createGitProviderId,
} from '@packmind/shared';
import { SingleFileDeployer, DeployerConfig } from './SingleFileDeployer';
import { v4 as uuidv4 } from 'uuid';
import { GitHexa } from '@packmind/git';
import { StandardsHexa } from '@packmind/standards';

// Create a concrete test implementation of the abstract SingleFileDeployer
class TestSingleFileDeployer extends SingleFileDeployer {
  protected readonly config: DeployerConfig = {
    filePath: 'TEST_AGENT.md',
    agentName: 'TestAgent',
  };
}

describe('SingleFileDeployer', () => {
  let deployer: TestSingleFileDeployer;
  let mockGitHexa: jest.Mocked<GitHexa>;
  let mockStandardsHexa: jest.Mocked<StandardsHexa>;
  let mockGitRepo: GitRepo;
  let jetbrainsTarget: Target;
  let vscodeTarget: Target;

  beforeEach(() => {
    mockGitHexa = {
      getFileFromRepo: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;
    mockStandardsHexa = {} as unknown as jest.Mocked<StandardsHexa>;

    deployer = new TestSingleFileDeployer(mockStandardsHexa, mockGitHexa);

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

    it('uses getTargetPrefixedPath for file path in recipe deployment', async () => {
      mockGitHexa.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployRecipes(
        mockRecipeVersions,
        mockGitRepo,
        jetbrainsTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('jetbrains/TEST_AGENT.md');

      // Verify gitHexa was called with the prefixed path
      expect(mockGitHexa.getFileFromRepo).toHaveBeenCalledWith(
        mockGitRepo,
        'jetbrains/TEST_AGENT.md',
      );
    });

    it('handles existing content correctly with target prefixing', async () => {
      const existingContent = 'Existing content in file';
      mockGitHexa.getFileFromRepo.mockResolvedValue({
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
      expect(mockGitHexa.getFileFromRepo).toHaveBeenCalledWith(
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

    it('uses getTargetPrefixedPath for file path in standards deployment', async () => {
      mockGitHexa.getFileFromRepo.mockResolvedValue(null);

      const result = await deployer.deployStandards(
        mockStandardVersions,
        mockGitRepo,
        vscodeTarget,
      );

      expect(result.createOrUpdate).toHaveLength(1);
      expect(result.createOrUpdate[0].path).toBe('vscode/TEST_AGENT.md');

      // Verify gitHexa was called with the prefixed path
      expect(mockGitHexa.getFileFromRepo).toHaveBeenCalledWith(
        mockGitRepo,
        'vscode/TEST_AGENT.md',
      );
    });
  });

  describe('error handling in getExistingContent', () => {
    it('returns empty string on gitHexa error', async () => {
      const mockRecipeVersions: RecipeVersion[] = [];
      mockGitHexa.getFileFromRepo.mockRejectedValue(new Error('Git error'));

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
});
