import { GenericRecipeSectionWriter } from './GenericRecipeSectionWriter';

describe('GenericRecipeSectionWriter', () => {
  describe('replace', () => {
    describe('when content has existing comment markers', () => {
      const currentContent = `# Some Document

Some initial content here

<!-- start: packmind-recipes -->
Old content to be replaced
This should all be replaced
<!-- end: packmind-recipes -->

Some content after`;

      const opts = {
        agentName: 'TestAgent',
        repoName: 'test-repo',
        recipesSection: '## Available Recipes\n\n- Recipe 1\n- Recipe 2',
        currentContent,
        commentMarker: 'packmind-recipes',
        target: '/',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.replace(opts);
      });

      it('preserves content before the markers', () => {
        expect(result).toContain(
          '# Some Document\n\nSome initial content here',
        );
      });

      it('includes start marker', () => {
        expect(result).toContain('<!-- start: packmind-recipes -->');
      });

      it('includes end marker', () => {
        expect(result).toContain('<!-- end: packmind-recipes -->');
      });

      it('includes mandatory step content', () => {
        expect(result).toContain('MANDATORY STEP');
      });

      it('removes first line of old content', () => {
        expect(result).not.toContain('Old content to be replaced');
      });

      it('removes second line of old content', () => {
        expect(result).not.toContain('This should all be replaced');
      });

      it('preserves content after the markers', () => {
        expect(result).toContain('Some content after');
      });
    });

    describe('when content has no existing markers', () => {
      const currentContent = `# Document Without Markers

Just regular content here

## Some Section

More content`;

      const opts = {
        agentName: 'NoMarkerAgent',
        repoName: 'no-marker-repo',
        recipesSection: 'New recipes content',
        currentContent,
        commentMarker: 'recipes-section',
        target: '/',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.replace(opts);
      });

      it('preserves all original content', () => {
        expect(result).toContain(currentContent);
      });

      it('appends start marker', () => {
        expect(result).toContain('<!-- start: recipes-section -->');
      });

      it('appends end marker', () => {
        expect(result).toContain('<!-- end: recipes-section -->');
      });

      it('appends at the end of the document', () => {
        const lines = result.split('\n');
        const lastMarkerIndex = lines.findIndex((line) =>
          line.includes('<!-- end: recipes-section -->'),
        );
        const moreContentIndex = lines.findIndex(
          (line) => line === 'More content',
        );
        expect(lastMarkerIndex).toBeGreaterThan(moreContentIndex);
      });
    });

    describe('when content has multiple sections with same marker', () => {
      const currentContent = `# Document

<!-- start: my-marker -->
First occurrence
<!-- end: my-marker -->

Middle content

<!-- start: my-marker -->
Second occurrence
<!-- end: my-marker -->`;

      const opts = {
        agentName: 'MultiAgent',
        repoName: 'multi-repo',
        recipesSection: 'Replacement content',
        currentContent,
        commentMarker: 'my-marker',
        target: '/',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.replace(opts);
      });

      it('removes first occurrence content', () => {
        expect(result).not.toContain('First occurrence');
      });

      it('removes second occurrence content', () => {
        expect(result).not.toContain('Second occurrence');
      });

      it('preserves middle content', () => {
        expect(result).toContain('Middle content');
      });

      it('maintains correct number of start markers', () => {
        const startMatches = (result.match(/<!-- start: my-marker -->/g) || [])
          .length;
        expect(startMatches).toBe(2);
      });

      it('maintains correct number of end markers', () => {
        const endMatches = (result.match(/<!-- end: my-marker -->/g) || [])
          .length;
        expect(endMatches).toBe(2);
      });
    });

    describe('when markers have special characters', () => {
      const currentContent = `Content here`;

      const opts = {
        agentName: 'SpecialAgent',
        repoName: 'special-repo',
        recipesSection: 'Special content',
        currentContent,
        commentMarker: 'recipes.$*+?[]{}()|^',
        target: '/',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.replace(opts);
      });

      it('includes start marker with special characters', () => {
        expect(result).toContain('<!-- start: recipes.$*+?[]{}()|^ -->');
      });

      it('includes end marker with special characters', () => {
        expect(result).toContain('<!-- end: recipes.$*+?[]{}()|^ -->');
      });
    });

    describe('when content is empty', () => {
      const opts = {
        agentName: 'EmptyAgent',
        repoName: 'empty-repo',
        recipesSection: 'Content for empty',
        currentContent: '',
        commentMarker: 'empty-marker',
        target: '/',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.replace(opts);
      });

      it('creates start marker', () => {
        expect(result).toContain('<!-- start: empty-marker -->');
      });

      it('creates end marker', () => {
        expect(result).toContain('<!-- end: empty-marker -->');
      });
    });
  });

  describe('generateRecipesSection', () => {
    describe('when using recipesSection', () => {
      const opts = {
        recipesSection: '## Custom Recipes\n\nRecipe content here',
      };

      let result: string;

      beforeEach(() => {
        result = GenericRecipeSectionWriter.generateRecipesSection(opts);
      });

      it('includes mandatory step warning', () => {
        expect(result).toContain('MANDATORY STEP');
      });

      it('includes custom recipes section', () => {
        expect(result).toContain('## Custom Recipes\n\nRecipe content here');
      });

      it('includes instruction to read available recipes', () => {
        expect(result).toContain(
          '**ALWAYS READ**: the available recipes below',
        );
      });
    });
  });
});
