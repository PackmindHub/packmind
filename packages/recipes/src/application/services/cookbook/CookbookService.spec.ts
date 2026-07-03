import { CookbookService } from './CookbookService';
import { PackmindLogger } from '@packmind/logger';
import {
  createRecipeId,
  createRecipeVersionId,
  RecipeVersion,
  WithTimestamps,
} from '@packmind/types';
import { stubLogger } from '@packmind/test-utils';
import { recipeVersionFactory } from '../../../../test/recipeVersionFactory';
import { v4 as uuidv4 } from 'uuid';

describe('CookbookService', () => {
  let cookbookService: CookbookService;
  let stubbedLogger: jest.Mocked<PackmindLogger>;

  beforeEach(() => {
    stubbedLogger = stubLogger();
    cookbookService = new CookbookService(stubbedLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildCookbook', () => {
    const createRecipeVersionWithTimestamp = (
      recipeData: Partial<RecipeVersion>,
      createdAt: string,
    ): WithTimestamps<RecipeVersion> => {
      const baseRecipe = recipeVersionFactory(recipeData);
      return {
        ...baseRecipe,
        createdAt: new Date(createdAt),
        updatedAt: new Date(createdAt),
      };
    };

    describe('when given an empty list of recipes', () => {
      it('generates cookbook with no recipes message', () => {
        const result = cookbookService.buildCookbook([]);

        expect(result).toBe(`# Packmind Cookbook

This cookbook contains all available coding recipes that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Recipes

No recipes available.


---

*This cookbook was automatically generated from deployed recipe versions.*`);
      });
    });

    describe('when given recipes', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'TDD Guide',
              slug: 'tdd-guide',
            },
            '2024-01-15T10:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'React Components',
              slug: 'react-components',
            },
            '2024-01-10T09:00:00Z',
          ),
        ];

        result = cookbookService.buildCookbook(recipes);
      });

      it('includes cookbook header', () => {
        expect(result).toContain(`# Packmind Cookbook

This cookbook contains all available coding recipes that can be used by AI agents (like Cursor, Claude Code, GitHub Copilot) to find and use proven patterns in coding tasks.

## Available Recipes`);
      });

      it('sorts recipes alphabetically by name', () => {
        const reactIndex = result.indexOf('React Components');
        const tddIndex = result.indexOf('TDD Guide');

        // React Components should appear before TDD Guide alphabetically
        expect(reactIndex).toBeLessThan(tddIndex);
      });

      it('formats recipe entries with correct links and recipe name as description', () => {
        const expectedList = [
          '- [React Components](recipes/react-components.md) : React Components',
          '- [TDD Guide](recipes/tdd-guide.md) : TDD Guide',
        ].join('\n');
        expect(result).toContain(expectedList);
      });

      it('includes the full footer content', () => {
        expect(result).toContain(`---

*This cookbook was automatically generated from deployed recipe versions.*`);
      });
    });

    describe('when recipes have varied names', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'Git Workflow',
              slug: 'git-workflow',
            },
            '2024-01-15T10:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Debugging Tips',
              slug: 'debugging-tips',
            },
            '2024-01-14T09:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Testing Guide',
              slug: 'testing-guide',
            },
            '2024-01-13T08:00:00Z',
          ),
        ];

        result = cookbookService.buildCookbook(recipes);
      });

      it('uses recipe name as description', () => {
        const expectedList = [
          '- [Debugging Tips](recipes/debugging-tips.md) : Debugging Tips',
          '- [Git Workflow](recipes/git-workflow.md) : Git Workflow',
          '- [Testing Guide](recipes/testing-guide.md) : Testing Guide',
        ].join('\n');
        expect(result).toContain(expectedList);
      });
    });

    describe('when given a large number of recipes', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [];

        for (let i = 0; i < 5; i++) {
          recipes.push(
            createRecipeVersionWithTimestamp(
              {
                id: createRecipeVersionId(uuidv4()),
                recipeId: createRecipeId(uuidv4()),
                name: `Recipe ${i + 1}`,
                slug: `recipe-${i + 1}`,
                content: `Content for recipe ${i + 1}`,
                version: 1,
              },
              `2024-01-${(15 + i).toString().padStart(2, '0')}T10:00:00Z`,
            ),
          );
        }

        result = cookbookService.buildCookbook(recipes);
      });

      it('includes recipe 1 name', () => {
        expect(result).toContain('Recipe 1');
      });

      it('includes recipe 2 name', () => {
        expect(result).toContain('Recipe 2');
      });

      it('includes recipe 3 name', () => {
        expect(result).toContain('Recipe 3');
      });

      it('includes recipe 4 name', () => {
        expect(result).toContain('Recipe 4');
      });

      it('includes recipe 5 name', () => {
        expect(result).toContain('Recipe 5');
      });

      it('includes recipe 1 link', () => {
        expect(result).toContain('recipes/recipe-1.md');
      });

      it('includes recipe 2 link', () => {
        expect(result).toContain('recipes/recipe-2.md');
      });

      it('includes recipe 3 link', () => {
        expect(result).toContain('recipes/recipe-3.md');
      });

      it('includes recipe 4 link', () => {
        expect(result).toContain('recipes/recipe-4.md');
      });

      it('includes recipe 5 link', () => {
        expect(result).toContain('recipes/recipe-5.md');
      });

      it('sorts recipes alphabetically', () => {
        const recipe1Index = result.indexOf('Recipe 1');
        const recipe5Index = result.indexOf('Recipe 5');

        expect(recipe1Index).toBeLessThan(recipe5Index);
      });
    });

    describe('edge cases', () => {
      it('handles recipes with special characters in names and slugs', () => {
        const recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'Recipe with "quotes" and &symbols',
              slug: 'recipe-with-quotes-and-symbols',
            },
            '2024-01-15T10:00:00Z',
          ),
        ];

        const result = cookbookService.buildCookbook(recipes);

        expect(result).toContain(
          '- [Recipe with "quotes" and &symbols](recipes/recipe-with-quotes-and-symbols.md) : Recipe with "quotes" and &symbols',
        );
      });

      describe('when sorting recipes regardless of input order', () => {
        let recipes: WithTimestamps<RecipeVersion>[];
        let result1: string;
        let result2: string;
        let result3: string;

        beforeEach(() => {
          recipes = [
            createRecipeVersionWithTimestamp(
              {
                name: 'C Recipe',
                slug: 'c-recipe',
              },
              '2024-01-15T10:00:00.000Z',
            ),
            createRecipeVersionWithTimestamp(
              {
                name: 'A Recipe',
                slug: 'a-recipe',
              },
              '2024-01-10T10:00:00.000Z',
            ),
            createRecipeVersionWithTimestamp(
              {
                name: 'B Recipe',
                slug: 'b-recipe',
              },
              '2024-01-20T10:00:00.000Z',
            ),
          ];

          result1 = cookbookService.buildCookbook(recipes);
          result2 = cookbookService.buildCookbook([...recipes].reverse());
          result3 = cookbookService.buildCookbook(
            [...recipes].sort(() => Math.random() - 0.5),
          );
        });

        it('produces identical output for original and reversed input order', () => {
          expect(result1).toBe(result2);
        });

        it('produces identical output for reversed and shuffled input order', () => {
          expect(result2).toBe(result3);
        });

        it('places A Recipe before B Recipe alphabetically', () => {
          const aRecipeIndex = result1.indexOf('A Recipe');
          const bRecipeIndex = result1.indexOf('B Recipe');

          expect(aRecipeIndex).toBeLessThan(bRecipeIndex);
        });

        it('places B Recipe before C Recipe alphabetically', () => {
          const bRecipeIndex = result1.indexOf('B Recipe');
          const cRecipeIndex = result1.indexOf('C Recipe');

          expect(bRecipeIndex).toBeLessThan(cRecipeIndex);
        });
      });
    });
  });
});
