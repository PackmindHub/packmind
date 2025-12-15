import { CodingAgent } from '@packmind/types';
import { ArtifactFilePathService } from './ArtifactFilePathService';

describe('ArtifactFilePathService', () => {
  let service: ArtifactFilePathService;

  beforeEach(() => {
    service = new ArtifactFilePathService();
  });

  describe('getFilePathsForAgent', () => {
    describe('with single-file agents', () => {
      it('returns CLAUDE.md for claude agent', () => {
        const result = service.getFilePathsForAgent('claude');

        expect(result).toEqual(['CLAUDE.md']);
      });

      it('returns AGENTS.md for agents_md agent', () => {
        const result = service.getFilePathsForAgent('agents_md');

        expect(result).toEqual(['AGENTS.md']);
      });

      it('returns .junie/guidelines.md for junie agent', () => {
        const result = service.getFilePathsForAgent('junie');

        expect(result).toEqual(['.junie/guidelines.md']);
      });

      it('returns .gitlab/duo/chat-rules.md for gitlab_duo agent', () => {
        const result = service.getFilePathsForAgent('gitlab_duo');

        expect(result).toEqual(['.gitlab/duo/chat-rules.md']);
      });
    });

    describe('with multi-file agents', () => {
      it('returns recipes index path for cursor agent', () => {
        const result = service.getFilePathsForAgent('cursor');

        expect(result).toEqual(['.cursor/rules/packmind/recipes-index.mdc']);
      });

      it('returns recipes index path for copilot agent', () => {
        const result = service.getFilePathsForAgent('copilot');

        expect(result).toEqual([
          '.github/instructions/packmind-recipes-index.instructions.md',
        ]);
      });

      it('returns empty array for packmind agent', () => {
        const result = service.getFilePathsForAgent('packmind');

        expect(result).toEqual([]);
      });
    });
  });

  describe('getRecipeFilePath', () => {
    describe('with single-file agents', () => {
      it('returns null for claude agent', () => {
        const result = service.getRecipeFilePath('claude', 'my-recipe');

        expect(result).toBeNull();
      });

      it('returns null for agents_md agent', () => {
        const result = service.getRecipeFilePath('agents_md', 'my-recipe');

        expect(result).toBeNull();
      });

      it('returns null for junie agent', () => {
        const result = service.getRecipeFilePath('junie', 'my-recipe');

        expect(result).toBeNull();
      });

      it('returns null for gitlab_duo agent', () => {
        const result = service.getRecipeFilePath('gitlab_duo', 'my-recipe');

        expect(result).toBeNull();
      });
    });

    describe('with multi-file agents', () => {
      it('returns null for cursor agent', () => {
        const result = service.getRecipeFilePath('cursor', 'my-recipe');

        expect(result).toBeNull();
      });

      it('returns null for copilot agent', () => {
        const result = service.getRecipeFilePath('copilot', 'my-recipe');

        expect(result).toBeNull();
      });

      it('returns recipe file path for packmind agent', () => {
        const result = service.getRecipeFilePath('packmind', 'my-recipe');

        expect(result).toBe('.packmind/recipes/my-recipe.md');
      });
    });
  });

  describe('getStandardFilePath', () => {
    describe('with single-file agents', () => {
      it('returns null for claude agent', () => {
        const result = service.getStandardFilePath('claude', 'my-standard');

        expect(result).toBeNull();
      });

      it('returns null for agents_md agent', () => {
        const result = service.getStandardFilePath('agents_md', 'my-standard');

        expect(result).toBeNull();
      });

      it('returns null for junie agent', () => {
        const result = service.getStandardFilePath('junie', 'my-standard');

        expect(result).toBeNull();
      });

      it('returns null for gitlab_duo agent', () => {
        const result = service.getStandardFilePath('gitlab_duo', 'my-standard');

        expect(result).toBeNull();
      });
    });

    describe('with multi-file agents', () => {
      it('returns standard file path for cursor agent', () => {
        const result = service.getStandardFilePath('cursor', 'my-standard');

        expect(result).toBe('.cursor/rules/packmind/standard-my-standard.mdc');
      });

      it('returns standard file path for copilot agent', () => {
        const result = service.getStandardFilePath('copilot', 'my-standard');

        expect(result).toBe(
          '.github/instructions/packmind-my-standard.instructions.md',
        );
      });

      it('returns standard file path for packmind agent', () => {
        const result = service.getStandardFilePath('packmind', 'my-standard');

        expect(result).toBe('.packmind/standards/my-standard.md');
      });
    });
  });

  describe('getAllFilePathsForRecipe', () => {
    describe('with single-file agents', () => {
      it('returns only single file path for claude agent', () => {
        const result = service.getAllFilePathsForRecipe('claude', 'my-recipe');

        expect(result).toEqual(['CLAUDE.md']);
      });

      it('returns only single file path for junie agent', () => {
        const result = service.getAllFilePathsForRecipe('junie', 'my-recipe');

        expect(result).toEqual(['.junie/guidelines.md']);
      });
    });

    describe('with multi-file agents', () => {
      it('returns index and recipe paths for packmind agent', () => {
        const result = service.getAllFilePathsForRecipe(
          'packmind',
          'my-recipe',
        );

        expect(result).toEqual(['.packmind/recipes/my-recipe.md']);
      });

      it('returns only index path for cursor agent', () => {
        const result = service.getAllFilePathsForRecipe('cursor', 'my-recipe');

        expect(result).toEqual(['.cursor/rules/packmind/recipes-index.mdc']);
      });
    });
  });

  describe('getAllFilePathsForStandard', () => {
    describe('with single-file agents', () => {
      it('returns only single file path for claude agent', () => {
        const result = service.getAllFilePathsForStandard(
          'claude',
          'my-standard',
        );

        expect(result).toEqual(['CLAUDE.md']);
      });

      it('returns only single file path for agents_md agent', () => {
        const result = service.getAllFilePathsForStandard(
          'agents_md',
          'my-standard',
        );

        expect(result).toEqual(['AGENTS.md']);
      });
    });

    describe('with multi-file agents', () => {
      it('returns index and standard paths for cursor agent', () => {
        const result = service.getAllFilePathsForStandard(
          'cursor',
          'my-standard',
        );

        expect(result).toEqual([
          '.cursor/rules/packmind/recipes-index.mdc',
          '.cursor/rules/packmind/standard-my-standard.mdc',
        ]);
      });

      it('returns index and standard paths for copilot agent', () => {
        const result = service.getAllFilePathsForStandard(
          'copilot',
          'my-standard',
        );

        expect(result).toEqual([
          '.github/instructions/packmind-recipes-index.instructions.md',
          '.github/instructions/packmind-my-standard.instructions.md',
        ]);
      });

      it('returns only standard path for packmind agent', () => {
        const result = service.getAllFilePathsForStandard(
          'packmind',
          'my-standard',
        );

        expect(result).toEqual(['.packmind/standards/my-standard.md']);
      });
    });
  });

  describe('getPackmindIndexFiles', () => {
    it('returns recipes and standards index paths', () => {
      const result = service.getPackmindIndexFiles();

      expect(result).toEqual([
        '.packmind/recipes-index.md',
        '.packmind/standards-index.md',
      ]);
    });
  });

  describe('isSingleFileAgent', () => {
    describe('with single-file agents', () => {
      const singleFileAgents: CodingAgent[] = [
        'claude',
        'agents_md',
        'junie',
        'gitlab_duo',
      ];

      it.each(singleFileAgents)('returns true for %s agent', (agent) => {
        const result = service.isSingleFileAgent(agent);

        expect(result).toBe(true);
      });
    });

    describe('with multi-file agents', () => {
      const multiFileAgents: CodingAgent[] = ['cursor', 'copilot', 'packmind'];

      it.each(multiFileAgents)('returns false for %s agent', (agent) => {
        const result = service.isSingleFileAgent(agent);

        expect(result).toBe(false);
      });
    });
  });

  describe('isMultiFileAgent', () => {
    describe('with single-file agents', () => {
      const singleFileAgents: CodingAgent[] = [
        'claude',
        'agents_md',
        'junie',
        'gitlab_duo',
      ];

      it.each(singleFileAgents)('returns false for %s agent', (agent) => {
        const result = service.isMultiFileAgent(agent);

        expect(result).toBe(false);
      });
    });

    describe('with multi-file agents', () => {
      const multiFileAgents: CodingAgent[] = ['cursor', 'copilot', 'packmind'];

      it.each(multiFileAgents)('returns true for %s agent', (agent) => {
        const result = service.isMultiFileAgent(agent);

        expect(result).toBe(true);
      });
    });
  });
});
