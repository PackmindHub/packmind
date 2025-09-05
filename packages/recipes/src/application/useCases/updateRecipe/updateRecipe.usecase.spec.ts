import { UpdateRecipeUsecase } from './updateRecipe.usecase';
import { RecipeService } from '../../services/RecipeService';
import { RecipeVersionService } from '../../services/RecipeVersionService';
import {
  GitHexa,
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  createGitCommitId,
} from '@packmind/git';
import { Recipe, createRecipeId } from '@packmind/shared';
import { recipeFactory } from '../../../../test/recipeFactory';
import { v4 as uuidv4 } from 'uuid';
import { PackmindLogger } from '@packmind/shared';
import { stubLogger } from '@packmind/shared/test';
import { OrganizationId, createOrganizationId } from '@packmind/accounts';
import { RecipeSummaryService } from '../../services/RecipeSummaryService';

describe('UpdateRecipeUsecase', () => {
  let updateRecipeUsecase: UpdateRecipeUsecase;
  let recipeService: jest.Mocked<RecipeService>;
  let recipeVersionService: jest.Mocked<RecipeVersionService>;
  let gitHexa: jest.Mocked<GitHexa>;
  let stubbedLogger: jest.Mocked<PackmindLogger>;
  let testOrganizationId: OrganizationId;

  beforeEach(() => {
    recipeService = {
      addRecipe: jest.fn(),
      getRecipeById: jest.fn(),
      updateRecipe: jest.fn(),
      findRecipeBySlug: jest.fn(),
    } as unknown as jest.Mocked<RecipeService>;

    recipeVersionService = {
      addRecipeVersion: jest.fn(),
      listRecipeVersions: jest.fn(),
      getRecipeVersion: jest.fn(),
      getLatestRecipeVersion: jest.fn(),
      prepareForGitPublishing: jest.fn(),
    } as unknown as jest.Mocked<RecipeVersionService>;

    gitHexa = {
      getOrganizationRepositories: jest.fn(),
      handleWebHook: jest.fn(),
    } as unknown as jest.Mocked<GitHexa>;

    stubbedLogger = stubLogger();
    testOrganizationId = createOrganizationId('test-org-123');

    const mockRecipeSummaryService: jest.Mocked<RecipeSummaryService> = {
      createRecipeSummary: jest.fn().mockResolvedValue('AI-generated summary'),
    } as unknown as jest.Mocked<RecipeSummaryService>;

    updateRecipeUsecase = new UpdateRecipeUsecase(
      recipeService,
      recipeVersionService,
      gitHexa,
      mockRecipeSummaryService,
      stubbedLogger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRecipesFromGitHub', () => {
    describe('when event is not a push event', () => {
      const headers = { 'x-github-event': 'pull_request' };
      const payload = { test: 'payload' };

      it('skips non-push events and returns empty array', async () => {
        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(result).toEqual([]);
        expect(gitHexa.getOrganizationRepositories).not.toHaveBeenCalled();
        expect(gitHexa.handleWebHook).not.toHaveBeenCalled();
      });
    });

    describe('when event header is missing', () => {
      const headers = {};
      const payload = { test: 'payload' };

      describe('when x-github-event header is missing', () => {
        it('skips and returns empty array', async () => {
          const result = await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
            headers,
          );

          expect(result).toEqual([]);
          expect(gitHexa.getOrganizationRepositories).not.toHaveBeenCalled();
          expect(gitHexa.handleWebHook).not.toHaveBeenCalled();
        });
      });
    });

    describe('when handling different GitHub event types', () => {
      const payload = { test: 'payload' };

      it('skips repository events', async () => {
        const headers = { 'x-github-event': 'repository' };

        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(result).toEqual([]);
        expect(gitHexa.getOrganizationRepositories).not.toHaveBeenCalled();
        expect(gitHexa.handleWebHook).not.toHaveBeenCalled();
      });

      it('skips issues events', async () => {
        const headers = { 'x-github-event': 'issues' };

        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(result).toEqual([]);
        expect(gitHexa.getOrganizationRepositories).not.toHaveBeenCalled();
        expect(gitHexa.handleWebHook).not.toHaveBeenCalled();
      });

      it('skips release events', async () => {
        const headers = { 'x-github-event': 'release' };

        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(result).toEqual([]);
        expect(gitHexa.getOrganizationRepositories).not.toHaveBeenCalled();
        expect(gitHexa.handleWebHook).not.toHaveBeenCalled();
      });
    });

    describe('when webhook payload contains updated recipes with changed content', () => {
      let headers: Record<string, string>;
      let payload: unknown;
      let existingRecipe: Recipe;

      beforeEach(() => {
        headers = { 'x-github-event': 'push' };
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: ['.packmind/recipes/use-tdd.md'],
            },
          ],
        };

        existingRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: 'Use TDD',
          slug: 'use-tdd',
          content: '# Use TDD\n\nOld content', // Different content
          version: 1,
        });

        // Mock GitHexa methods for organization repositories and webhook handling
        const mockGitRepo = {
          id: createGitRepoId('repo-123'),
          owner: 'PackmindHub',
          repo: 'test-webhook',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        };

        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        gitHexa.handleWebHook.mockResolvedValue([
          {
            id: createGitCommitId('commit-123'),
            sha: 'commit123',
            author: 'John Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
            filePath: '.packmind/recipes/use-tdd.md',
            fileContent:
              '# Use TDD\n\nTest-driven development is a great practice.',
          },
        ]);

        // Mock RecipeService.findRecipeBySlug to return existingRecipe
        recipeService.findRecipeBySlug.mockResolvedValue(existingRecipe);

        // Mock RecipeService.updateRecipe to return updated recipe
        recipeService.updateRecipe.mockImplementation(async (id, data) => {
          return {
            ...existingRecipe,
            content: data.content,
            version: existingRecipe.version + 1,
          };
        });
      });

      it('calls GitHexa.handleWebHook with correct parameters', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(gitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          testOrganizationId,
        );
        expect(gitHexa.handleWebHook).toHaveBeenCalledWith(
          expect.objectContaining({
            owner: 'PackmindHub',
            repo: 'test-webhook',
          }),
          payload,
          /.packmind\/recipes\/.*\.md/,
        );
      });

      it('extracts slug from filepath correctly', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(recipeService.findRecipeBySlug).toHaveBeenCalledWith('use-tdd');
      });

      describe('when recipe exists', () => {
        it('calls RecipeService.updateRecipe with correct parameters including GitCommit', async () => {
          await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
            headers,
          );

          expect(recipeService.updateRecipe).toHaveBeenCalledWith(
            existingRecipe.id,
            {
              name: existingRecipe.name,
              slug: existingRecipe.slug,
              content:
                '# Use TDD\n\nTest-driven development is a great practice.',
              version: 2,
              gitCommit: {
                id: createGitCommitId('commit-123'),
                sha: 'commit123',
                author: 'John Developer',
                url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
                message: 'Updated recipe',
              },
              organizationId: existingRecipe.organizationId,
              userId: existingRecipe.userId,
            },
          );
        });

        it('calls RecipeVersionService.addRecipeVersion with correct parameters including GitCommit', async () => {
          await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
            headers,
          );

          expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
            recipeId: existingRecipe.id,
            name: existingRecipe.name,
            slug: existingRecipe.slug,
            content:
              '# Use TDD\n\nTest-driven development is a great practice.',
            version: 2,
            summary: 'AI-generated summary',
            gitCommit: {
              id: createGitCommitId('commit-123'),
              sha: 'commit123',
              author: 'John Developer',
              url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
              message: 'Updated recipe',
            },
            userId: null, // Git commits don't have a specific user
          });
        });
      });

      it('returns the updated recipes', async () => {
        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(result).toHaveLength(1);
        expect(result[0].content).toBe(
          '# Use TDD\n\nTest-driven development is a great practice.',
        );
        expect(result[0].version).toBe(2);
      });

      it('ensures new recipe versions are created with summary generation', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            recipeId: existingRecipe.id,
            name: existingRecipe.name,
            slug: existingRecipe.slug,
            content:
              '# Use TDD\n\nTest-driven development is a great practice.',
            version: 2,
          }),
        );
      });
    });

    describe('when webhook payload contains recipes with identical content', () => {
      let headers: Record<string, string>;
      let payload: unknown;
      let existingRecipe: Recipe;

      beforeEach(() => {
        headers = { 'x-github-event': 'push' };
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: ['.packmind/recipes/use-tdd.md'],
            },
          ],
        };

        const identicalContent =
          '# Use TDD\n\nTest-driven development is a great practice.';

        existingRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: 'Use TDD',
          slug: 'use-tdd',
          content: identicalContent, // Same content as file
          version: 1,
        });

        // Mock GitHexa methods for organization repositories and webhook handling
        const mockGitRepo = {
          id: createGitRepoId('repo-123'),
          owner: 'PackmindHub',
          repo: 'test-webhook',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        };

        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        gitHexa.handleWebHook.mockResolvedValue([
          {
            id: createGitCommitId('commit-123'),
            sha: 'commit123',
            author: 'John Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
            filePath: '.packmind/recipes/use-tdd.md',
            fileContent: identicalContent,
          },
        ]);
        recipeService.findRecipeBySlug.mockResolvedValue(existingRecipe);

        // Mock RecipeService.updateRecipe to return updated recipe
        recipeService.updateRecipe.mockImplementation(async (id, data) => {
          return {
            ...existingRecipe,
            content: data.content,
            version: existingRecipe.version + 1,
          };
        });
      });

      describe('when content is identical', () => {
        it('does not call RecipeService.updateRecipe', async () => {
          await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
            headers,
          );

          expect(recipeService.updateRecipe).not.toHaveBeenCalled();
        });
      });

      describe('when no recipes are updated due to identical content', () => {
        it('returns empty array', async () => {
          const result = await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
            headers,
          );

          expect(result).toEqual([]);
        });
      });

      it('still checks if recipe exists in database', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          headers,
        );

        expect(recipeService.findRecipeBySlug).toHaveBeenCalledWith('use-tdd');
      });
    });

    describe('when webhook payload contains mixed scenarios', () => {
      let payload: unknown;
      let existingRecipe1: Recipe;
      let existingRecipe2: Recipe;
      let identicalContent: string;
      let changedContent: string;

      beforeEach(() => {
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: [
                '.packmind/recipes/use-tdd.md',
                '.packmind/recipes/clean-code.md',
              ],
            },
          ],
        };

        identicalContent = '# Clean Code\n\nWrite clean, readable code.';
        changedContent = '# Use TDD\n\nTest-driven development is essential.';

        existingRecipe1 = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: 'Use TDD',
          slug: 'use-tdd',
          content: '# Use TDD\n\nOld content', // Different content - should update
          version: 1,
        });

        existingRecipe2 = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: 'Clean Code',
          slug: 'clean-code',
          content: identicalContent, // Same content - should skip
          version: 2,
        });

        // Mock GitHexa methods for organization repositories and webhook handling
        const mockGitRepo = {
          id: createGitRepoId('repo-123'),
          owner: 'PackmindHub',
          repo: 'test-webhook',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        };

        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        gitHexa.handleWebHook.mockResolvedValue([
          {
            id: createGitCommitId('commit-123'),
            sha: 'commit123',
            author: 'John Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
            filePath: '.packmind/recipes/use-tdd.md',
            fileContent: changedContent,
          },
          {
            id: createGitCommitId('commit-124'),
            sha: 'commit123',
            author: 'Jane Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
            filePath: '.packmind/recipes/clean-code.md',
            fileContent: identicalContent,
          },
        ]);

        recipeService.findRecipeBySlug.mockImplementation(async (slug) => {
          if (slug === 'use-tdd') return existingRecipe1;
          if (slug === 'clean-code') return existingRecipe2;
          return null;
        });

        recipeService.updateRecipe.mockImplementation(async (id, data) => {
          const recipe =
            id === existingRecipe1.id ? existingRecipe1 : existingRecipe2;
          return {
            ...recipe,
            content: data.content,
            version: recipe.version + 1,
          };
        });
      });

      it('updates only recipes with changed content and includes GitCommit information', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          { 'x-github-event': 'push' },
        );

        expect(recipeService.updateRecipe).toHaveBeenCalledTimes(1);
        expect(recipeService.updateRecipe).toHaveBeenCalledWith(
          existingRecipe1.id,
          {
            name: existingRecipe1.name,
            slug: existingRecipe1.slug,
            content: changedContent,
            version: 2,
            gitCommit: {
              id: createGitCommitId('commit-123'),
              sha: 'commit123',
              author: 'John Developer',
              url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
              message: 'Updated recipe',
            },
            organizationId: existingRecipe1.organizationId,
            userId: existingRecipe1.userId,
          },
        );
      });

      it('calls RecipeVersionService.addRecipeVersion with GitCommit for updated recipes', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          { 'x-github-event': 'push' },
        );

        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledTimes(1);
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith({
          recipeId: existingRecipe1.id,
          name: existingRecipe1.name,
          slug: existingRecipe1.slug,
          content: changedContent,
          version: 2,
          summary: 'AI-generated summary',
          gitCommit: {
            id: createGitCommitId('commit-123'),
            sha: 'commit123',
            author: 'John Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
          },
          userId: null, // Git commits don't have a specific user
        });
      });

      it('returns only updated recipes', async () => {
        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          { 'x-github-event': 'push' },
        );

        expect(result).toHaveLength(1);
        expect(result[0].slug).toBe('use-tdd');
        expect(result[0].version).toBe(2);
      });

      it('checks both recipes in database', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          { 'x-github-event': 'push' },
        );

        expect(recipeService.findRecipeBySlug).toHaveBeenCalledWith('use-tdd');
        expect(recipeService.findRecipeBySlug).toHaveBeenCalledWith(
          'clean-code',
        );
      });

      it('ensures recipe version creation includes summary generation for updated recipes', async () => {
        await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          testOrganizationId,
          { 'x-github-event': 'push' },
        );

        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            recipeId: existingRecipe1.id,
            name: existingRecipe1.name,
            slug: existingRecipe1.slug,
            content: changedContent,
            version: 2,
          }),
        );
      });
    });

    describe('when recipe does not exist in database', () => {
      let payload: unknown;

      beforeEach(() => {
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: ['.packmind/recipes/non-existent.md'],
            },
          ],
        };

        // Mock GitHexa.handleWebHook to return empty array
        gitHexa.handleWebHook.mockResolvedValue([]);

        // Mock RecipeService.findRecipeBySlug to return null (recipe not found)
        recipeService.findRecipeBySlug.mockResolvedValue(null);
      });

      describe('when recipe does not exist', () => {
        it('does not call RecipeService.updateRecipe', async () => {
          await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
          );

          expect(recipeService.updateRecipe).not.toHaveBeenCalled();
        });
      });

      describe('when no recipes are updated', () => {
        it('returns an empty array', async () => {
          const result = await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
          );

          expect(result).toEqual([]);
        });
      });
    });

    describe('when webhook payload contains no updated recipes', () => {
      let payload: unknown;

      beforeEach(() => {
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: ['some-other-file.md'],
            },
          ],
        };

        // Mock GitHexa.handleWebHook to return empty array
        gitHexa.handleWebHook.mockResolvedValue([]);
      });

      describe('when no recipes are updated', () => {
        it('returns an empty array', async () => {
          const result = await updateRecipeUsecase.updateRecipesFromGitHub(
            payload,
            testOrganizationId,
          );

          expect(result).toEqual([]);
        });
      });
    });

    describe('when using organizationId parameter with GitApp', () => {
      let payload: unknown;
      let organizationId: OrganizationId;
      let mockGitRepo: GitRepo;
      let existingRecipe: Recipe;

      beforeEach(() => {
        payload = {
          ref: 'refs/heads/main',
          repository: {
            name: 'test-webhook',
            owner: {
              name: 'PackmindHub',
            },
          },
          commits: [
            {
              id: 'commit123',
              modified: ['.packmind/recipes/use-tdd.md'],
            },
          ],
        };

        organizationId = createOrganizationId('org-123');

        mockGitRepo = {
          id: createGitRepoId('repo-123'),
          owner: 'PackmindHub',
          repo: 'test-webhook',
          branch: 'main',
          providerId: createGitProviderId('provider-123'),
        };

        existingRecipe = recipeFactory({
          id: createRecipeId(uuidv4()),
          name: 'Use TDD',
          slug: 'use-tdd',
          content: '# Use TDD\n\nOld content.',
          version: 1,
          organizationId,
        });
      });

      it('accepts organizationId parameter and uses GitHexa.handleWebHook with GitCommit', async () => {
        // Mock GitHexa methods
        gitHexa.getOrganizationRepositories.mockResolvedValue([mockGitRepo]);
        gitHexa.handleWebHook.mockResolvedValue([
          {
            id: createGitCommitId('commit-123'),
            sha: 'commit123',
            author: 'John Developer',
            url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
            message: 'Updated recipe',
            filePath: '.packmind/recipes/use-tdd.md',
            fileContent:
              '# Use TDD\n\nTest-driven development is a great practice.',
          },
        ]);

        // Mock recipe service
        recipeService.findRecipeBySlug.mockResolvedValue(existingRecipe);
        recipeService.updateRecipe.mockResolvedValue({
          ...existingRecipe,
          content: '# Use TDD\n\nTest-driven development is a great practice.',
          version: 2,
        });

        const result = await updateRecipeUsecase.updateRecipesFromGitHub(
          payload,
          organizationId,
          { 'x-github-event': 'push' },
        );

        expect(gitHexa.getOrganizationRepositories).toHaveBeenCalledWith(
          organizationId,
        );
        expect(gitHexa.handleWebHook).toHaveBeenCalledWith(
          mockGitRepo,
          payload,
          /.packmind\/recipes\/.*\.md/,
        );

        // Verify GitCommit is passed to updateRecipe
        expect(recipeService.updateRecipe).toHaveBeenCalledWith(
          existingRecipe.id,
          expect.objectContaining({
            gitCommit: {
              id: createGitCommitId('commit-123'),
              sha: 'commit123',
              author: 'John Developer',
              url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
              message: 'Updated recipe',
            },
          }),
        );

        // Verify GitCommit is passed to addRecipeVersion
        expect(recipeVersionService.addRecipeVersion).toHaveBeenCalledWith(
          expect.objectContaining({
            gitCommit: {
              id: createGitCommitId('commit-123'),
              sha: 'commit123',
              author: 'John Developer',
              url: 'https://github.com/PackmindHub/test-webhook/commit/commit123',
              message: 'Updated recipe',
            },
          }),
        );

        expect(result).toHaveLength(1);
        expect(result[0].version).toBe(2);
      });
    });
  });
});
