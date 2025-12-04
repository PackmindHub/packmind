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

      const result = GenericRecipeSectionWriter.replace(opts);

      it('preserves content before the markers', () => {
        expect(result).toContain(
          '# Some Document\n\nSome initial content here',
        );
      });

      it('replaces content between markers', () => {
        expect(result).toContain('<!-- start: packmind-recipes -->');
        expect(result).toContain('<!-- end: packmind-recipes -->');
        expect(result).toContain('MANDATORY STEP');
      });

      it('removes old content between markers', () => {
        expect(result).not.toContain('Old content to be replaced');
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

      const result = GenericRecipeSectionWriter.replace(opts);

      it('preserves all original content', () => {
        expect(result).toContain(currentContent);
      });

      it('appends the new section with markers', () => {
        expect(result).toContain('<!-- start: recipes-section -->');
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

      const result = GenericRecipeSectionWriter.replace(opts);

      it('replaces all occurrences', () => {
        expect(result).not.toContain('First occurrence');
        expect(result).not.toContain('Second occurrence');
      });

      it('preserves middle content', () => {
        expect(result).toContain('Middle content');
      });

      it('maintains correct number of marker pairs', () => {
        const startMatches = (result.match(/<!-- start: my-marker -->/g) || [])
          .length;
        const endMatches = (result.match(/<!-- end: my-marker -->/g) || [])
          .length;
        expect(startMatches).toBe(2);
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

      const result = GenericRecipeSectionWriter.replace(opts);

      it('handles special characters in markers correctly', () => {
        expect(result).toContain('<!-- start: recipes.$*+?[]{}()|^ -->');
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

      const result = GenericRecipeSectionWriter.replace(opts);

      it('creates section with markers', () => {
        expect(result).toContain('<!-- start: empty-marker -->');
        expect(result).toContain('<!-- end: empty-marker -->');
      });
    });
  });

  describe('generateRecipesSection', () => {
    describe('when using recipesSection', () => {
      const opts = {
        agentName: 'TestAgent',
        repoName: 'test-repo',
        recipesSection: '## Custom Recipes\n\nRecipe content here',
        target: '/',
      };

      const result = GenericRecipeSectionWriter.generateRecipesSection(opts);

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
