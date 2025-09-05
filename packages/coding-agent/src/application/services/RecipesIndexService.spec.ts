import { RecipesIndexService } from './RecipesIndexService';

describe('RecipesIndexService', () => {
  let service: RecipesIndexService;

  beforeEach(() => {
    service = new RecipesIndexService();
  });

  describe('buildRecipesIndex', () => {
    it('generates recipes index with header and footer', () => {
      const recipes = [
        {
          name: 'Test Recipe',
          slug: 'test-recipe',
          summary: 'A test recipe for testing',
        },
      ];

      const result = service.buildRecipesIndex(recipes);

      expect(result).toContain('# Packmind Recipes Index');
      expect(result).toContain('## Available Recipes');
      expect(result).toContain(
        '*This recipes index was automatically generated from deployed recipe versions.*',
      );
    });

    it('lists recipes with summaries', () => {
      const recipes = [
        {
          name: 'Recipe One',
          slug: 'recipe-one',
          summary: 'First recipe summary',
        },
        {
          name: 'Recipe Two',
          slug: 'recipe-two',
          summary: 'Second recipe summary',
        },
      ];

      const result = service.buildRecipesIndex(recipes);

      expect(result).toContain(
        '- [Recipe One](recipes/recipe-one.md) : First recipe summary',
      );
      expect(result).toContain(
        '- [Recipe Two](recipes/recipe-two.md) : Second recipe summary',
      );
    });

    describe('when summary is null', () => {
      it('uses recipe name as summary', () => {
        const recipes = [
          {
            name: 'Recipe Without Summary',
            slug: 'no-summary',
            summary: null,
          },
        ];

        const result = service.buildRecipesIndex(recipes);

        expect(result).toContain(
          '- [Recipe Without Summary](recipes/no-summary.md) : Recipe Without Summary',
        );
      });
    });

    describe('when summary is empty string', () => {
      it('uses recipe name as summary', () => {
        const recipes = [
          {
            name: 'Recipe With Empty Summary',
            slug: 'empty-summary',
            summary: '  ',
          },
        ];

        const result = service.buildRecipesIndex(recipes);

        expect(result).toContain(
          '- [Recipe With Empty Summary](recipes/empty-summary.md) : Recipe With Empty Summary',
        );
      });
    });

    it('sorts recipes alphabetically by name', () => {
      const recipes = [
        {
          name: 'Zebra Recipe',
          slug: 'zebra',
          summary: 'Last alphabetically',
        },
        {
          name: 'Apple Recipe',
          slug: 'apple',
          summary: 'First alphabetically',
        },
        {
          name: 'Middle Recipe',
          slug: 'middle',
          summary: 'Middle alphabetically',
        },
      ];

      const result = service.buildRecipesIndex(recipes);

      const lines = result.split('\n');
      const recipeLines = lines.filter((line) => line.startsWith('- ['));

      expect(recipeLines[0]).toContain('Apple Recipe');
      expect(recipeLines[1]).toContain('Middle Recipe');
      expect(recipeLines[2]).toContain('Zebra Recipe');
    });

    it('handles empty recipe list', () => {
      const result = service.buildRecipesIndex([]);

      expect(result).toContain('No recipes available.');
    });
  });
});
