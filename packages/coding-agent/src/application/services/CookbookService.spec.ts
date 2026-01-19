import { CookbookService } from './CookbookService';

describe('CookbookService', () => {
  let service: CookbookService;

  beforeEach(() => {
    service = new CookbookService();
  });

  describe('buildCookbook', () => {
    describe('when generating cookbook structure', () => {
      let result: string;

      beforeEach(() => {
        const recipes = [
          {
            name: 'Test Recipe',
            slug: 'test-recipe',
            summary: 'A test recipe for testing',
          },
        ];
        result = service.buildCookbook(recipes);
      });

      it('includes the main header', () => {
        expect(result).toContain('# Packmind Cookbook');
      });

      it('includes the available recipes section', () => {
        expect(result).toContain('## Available Recipes');
      });

      it('includes the auto-generated footer', () => {
        expect(result).toContain(
          '*This cookbook was automatically generated from deployed recipe versions.*',
        );
      });
    });

    describe('when listing multiple recipes', () => {
      let result: string;

      beforeEach(() => {
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
        result = service.buildCookbook(recipes);
      });

      it('includes first recipe with summary', () => {
        expect(result).toContain(
          '- [Recipe One](recipes/recipe-one.md) : First recipe summary',
        );
      });

      it('includes second recipe with summary', () => {
        expect(result).toContain(
          '- [Recipe Two](recipes/recipe-two.md) : Second recipe summary',
        );
      });
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

        const result = service.buildCookbook(recipes);

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

        const result = service.buildCookbook(recipes);

        expect(result).toContain(
          '- [Recipe With Empty Summary](recipes/empty-summary.md) : Recipe With Empty Summary',
        );
      });
    });

    describe('when sorting recipes alphabetically', () => {
      let recipeLines: string[];

      beforeEach(() => {
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

        const result = service.buildCookbook(recipes);
        const lines = result.split('\n');
        recipeLines = lines.filter((line) => line.startsWith('- ['));
      });

      it('places Apple Recipe first', () => {
        expect(recipeLines[0]).toContain('Apple Recipe');
      });

      it('places Middle Recipe second', () => {
        expect(recipeLines[1]).toContain('Middle Recipe');
      });

      it('places Zebra Recipe last', () => {
        expect(recipeLines[2]).toContain('Zebra Recipe');
      });
    });

    describe('when recipe list is empty', () => {
      it('displays no recipes available message', () => {
        const result = service.buildCookbook([]);

        expect(result).toContain('No recipes available.');
      });
    });
  });
});
