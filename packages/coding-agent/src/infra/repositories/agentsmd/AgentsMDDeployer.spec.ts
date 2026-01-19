import { AgentsMDDeployer } from './AgentsMDDeployer';
import { createUserId } from '@packmind/types';
import {
  GitRepo,
  createGitRepoId,
  createGitProviderId,
  StandardVersion,
  createStandardVersionId,
  RecipeVersion,
  createRecipeVersionId,
  Target,
  createTargetId,
} from '@packmind/types';
import { v4 as uuidv4 } from 'uuid';
import { GenericStandardSectionWriter } from '../genericSectionWriter/GenericStandardSectionWriter';
import { recipeFactory } from '@packmind/recipes/test';
import { standardFactory } from '@packmind/standards/test';

describe('AgentsMDDeployer', () => {
  let deployer: AgentsMDDeployer;
  let mockGitRepo: GitRepo;
  let mockTarget: Target;

  beforeEach(() => {
    // Create deployer without StandardsHexa or GitHexa for basic tests
    deployer = new AgentsMDDeployer();

    mockTarget = {
      id: createTargetId('test-target-id'),
      name: 'Test Target',
      path: '/',
      gitRepoId: createGitRepoId(uuidv4()),
    };

    mockGitRepo = {
      id: createGitRepoId('test-repo-id'),
      owner: 'test-owner',
      repo: 'test-repo',
      providerId: createGitProviderId('provider-id'),
      branch: 'main',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deployRecipes', () => {
    describe('with a single recipe', () => {
      let result: Awaited<ReturnType<AgentsMDDeployer['deployRecipes']>>;

      beforeEach(async () => {
        const recipe = recipeFactory({
          name: 'Test Recipe',
          slug: 'test-recipe',
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

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets AGENTS.md file', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('clears recipes section for single-file deployers', () => {
        expect(result.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('when recipe list is empty', () => {
      let result: Awaited<ReturnType<AgentsMDDeployer['deployRecipes']>>;

      beforeEach(async () => {
        result = await deployer.deployRecipes([], mockGitRepo, mockTarget);
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('targets AGENTS.md file', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('clears recipes section', () => {
        expect(result.createOrUpdate[0].sections).toEqual([
          { key: 'Packmind recipes', content: '' },
        ]);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });
  });

  describe('deployStandards', () => {
    describe('with a single standard', () => {
      let result: Awaited<ReturnType<AgentsMDDeployer['deployStandards']>>;
      let standardVersion: StandardVersion;

      beforeEach(async () => {
        const standard = standardFactory({
          name: 'Test Standard',
          slug: 'test-standard',
          scope: 'frontend',
        });

        standardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard.id,
          name: standard.name,
          slug: standard.slug,
          description: 'Test standard description',
          scope: 'frontend',
          version: 1,
          summary: 'A test standard summary',
          userId: createUserId('user-1'),
          rules: [],
        };

        result = await deployer.deployStandards(
          [standardVersion],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });

      it('targets AGENTS.md file', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('includes Packmind Standards header in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });

      it('includes standard name in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(standardVersion.name);
      });
    });

    describe('when standards list is empty', () => {
      let result: Awaited<ReturnType<AgentsMDDeployer['deployStandards']>>;

      beforeEach(async () => {
        result = await deployer.deployStandards([], mockGitRepo, mockTarget);
      });

      it('does not create any files', () => {
        expect(result.createOrUpdate).toHaveLength(0);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });
    });

    describe('with multiple standards', () => {
      let result: Awaited<ReturnType<AgentsMDDeployer['deployStandards']>>;

      beforeEach(async () => {
        const standard1 = standardFactory({
          name: 'Frontend Standard',
          slug: 'frontend-standard',
          scope: 'frontend',
        });

        const standard2 = standardFactory({
          name: 'Backend Standard',
          slug: 'backend-standard',
          scope: 'backend',
        });

        const standardVersion1: StandardVersion = {
          id: createStandardVersionId('standard-version-1'),
          standardId: standard1.id,
          name: standard1.name,
          slug: standard1.slug,
          description: 'Frontend standard description',
          scope: 'frontend',
          version: 1,
          summary: 'Frontend standard summary',
          userId: createUserId('user-1'),
          rules: [],
        };

        const standardVersion2: StandardVersion = {
          id: createStandardVersionId('standard-version-2'),
          standardId: standard2.id,
          name: standard2.name,
          slug: standard2.slug,
          description: 'Backend standard description',
          scope: 'backend',
          version: 1,
          summary: 'Backend standard summary',
          userId: createUserId('user-1'),
          rules: [],
        };

        result = await deployer.deployStandards(
          [standardVersion1, standardVersion2],
          mockGitRepo,
          mockTarget,
        );
      });

      it('creates one file to update', () => {
        expect(result.createOrUpdate).toHaveLength(1);
      });

      it('does not delete any files', () => {
        expect(result.delete).toHaveLength(0);
      });

      it('targets AGENTS.md file', () => {
        expect(result.createOrUpdate[0].path).toBe('AGENTS.md');
      });

      it('includes Packmind Standards header in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain('# Packmind Standards');
      });

      it('includes standards introduction in section content', () => {
        const sectionContent = result.createOrUpdate[0].sections![0].content;
        expect(sectionContent).toContain(
          GenericStandardSectionWriter.standardsIntroduction,
        );
      });
    });
  });
});
