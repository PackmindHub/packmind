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
          },
          {
            name: 'Recipe Two',
            slug: 'recipe-two',
          },
        ];
        result = service.buildCookbook(recipes);
      });

      it('includes first recipe with its name', () => {
        expect(result).toContain(
          '- [Recipe One](recipes/recipe-one.md) : Recipe One',
        );
      });

      it('includes second recipe with its name', () => {
        expect(result).toContain(
          '- [Recipe Two](recipes/recipe-two.md) : Recipe Two',
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
          },
          {
            name: 'Apple Recipe',
            slug: 'apple',
          },
          {
            name: 'Middle Recipe',
            slug: 'middle',
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
