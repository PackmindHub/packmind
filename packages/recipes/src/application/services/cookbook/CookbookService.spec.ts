import { CookbookService } from './CookbookService';
import { PackmindLogger } from '@packmind/logger';
import { WithTimestamps } from '@packmind/shared';
import { stubLogger } from '@packmind/test-utils';
import {
  RecipeVersion,
  createRecipeVersionId,
} from '../../../domain/entities/RecipeVersion';
import { createRecipeId } from '../../../domain/entities/Recipe';
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

    describe('when given recipes with summaries', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'TDD Guide',
              slug: 'tdd-guide',
              summary: 'Complete TDD workflow for quality development.',
            },
            '2024-01-15T10:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'React Components',
              slug: 'react-components',
              summary: 'Step-by-step guide for React components.',
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

      it('formats recipe entries with correct links and summaries', () => {
        const expectedList = [
          '- [React Components](recipes/react-components.md) : Step-by-step guide for React components.',
          '- [TDD Guide](recipes/tdd-guide.md) : Complete TDD workflow for quality development.',
        ].join('\n');
        expect(result).toContain(expectedList);
      });

      it('includes the full footer content', () => {
        expect(result).toContain(`---

*This cookbook was automatically generated from deployed recipe versions.*`);
      });
    });

    describe('when recipes have null or empty summaries', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'Git Workflow',
              slug: 'git-workflow',
              summary: null, // No summary
            },
            '2024-01-15T10:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Debugging Tips',
              slug: 'debugging-tips',
              summary: '', // Empty summary
            },
            '2024-01-14T09:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Testing Guide',
              slug: 'testing-guide',
              summary: '   ', // Whitespace only summary
            },
            '2024-01-13T08:00:00Z',
          ),
        ];

        result = cookbookService.buildCookbook(recipes);
      });

      it('uses recipe name as description for null, empty, or whitespace-only summary', () => {
        const expectedList = [
          '- [Debugging Tips](recipes/debugging-tips.md) : Debugging Tips',
          '- [Git Workflow](recipes/git-workflow.md) : Git Workflow',
          '- [Testing Guide](recipes/testing-guide.md) : Testing Guide',
        ].join('\n');
        expect(result).toContain(expectedList);
      });
    });

    describe('when recipes have mixed summary states', () => {
      let recipes: WithTimestamps<RecipeVersion>[];
      let result: string;

      beforeEach(() => {
        recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'Complete Recipe',
              slug: 'complete-recipe',
              summary: 'This recipe has a proper summary.',
            },
            '2024-01-20T10:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Incomplete Recipe',
              slug: 'incomplete-recipe',
              summary: null,
            },
            '2024-01-19T09:00:00Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'Trimmed Recipe',
              slug: 'trimmed-recipe',
              summary: '  Summary with extra spaces  ',
            },
            '2024-01-18T08:00:00Z',
          ),
        ];

        result = cookbookService.buildCookbook(recipes);
      });

      it('handles mixed summary states correctly', () => {
        const expectedList = [
          '- [Complete Recipe](recipes/complete-recipe.md) : This recipe has a proper summary.',
          '- [Incomplete Recipe](recipes/incomplete-recipe.md) : Incomplete Recipe',
          '- [Trimmed Recipe](recipes/trimmed-recipe.md) : Summary with extra spaces',
        ].join('\n');
        expect(result).toContain(expectedList);
      });
    });

    describe('when given a large number of recipes', () => {
      it('handles multiple recipes with proper formatting', () => {
        const recipes: WithTimestamps<RecipeVersion>[] = [];

        // Create 5 recipes with different dates
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
                summary: `Summary for recipe ${i + 1}`,
              },
              `2024-01-${(15 + i).toString().padStart(2, '0')}T10:00:00Z`,
            ),
          );
        }

        const result = cookbookService.buildCookbook(recipes);

        // Verify all recipes are included
        for (let i = 0; i < 5; i++) {
          expect(result).toContain(`Recipe ${i + 1}`);
          expect(result).toContain(`recipes/recipe-${i + 1}.md`);
          expect(result).toContain(`Summary for recipe ${i + 1}`);
        }

        // Verify alphabetical sorting (Recipe 1 should come before Recipe 5)
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
              summary: 'A recipe with special characters.',
            },
            '2024-01-15T10:00:00Z',
          ),
        ];

        const result = cookbookService.buildCookbook(recipes);

        expect(result).toContain(
          '- [Recipe with "quotes" and &symbols](recipes/recipe-with-quotes-and-symbols.md) : A recipe with special characters.',
        );
      });

      it('handles very long summaries correctly', () => {
        const longSummary =
          'This is a very long summary that goes on and on and contains lots of text to test how the cookbook handles lengthy descriptions without breaking the formatting or causing any issues with the generated markdown content.';

        const recipes = [
          createRecipeVersionWithTimestamp(
            {
              name: 'Long Summary Recipe',
              slug: 'long-summary-recipe',
              summary: longSummary,
            },
            '2024-01-15T10:00:00Z',
          ),
        ];

        const result = cookbookService.buildCookbook(recipes);

        expect(result).toContain(
          `- [Long Summary Recipe](recipes/long-summary-recipe.md) : ${longSummary}`,
        );
      });

      it('sorts consistently regardless of input order', () => {
        // Test that alphabetical sorting is stable and consistent
        const recipes: WithTimestamps<RecipeVersion>[] = [
          createRecipeVersionWithTimestamp(
            {
              name: 'C Recipe',
              slug: 'c-recipe',
              summary: null,
            },
            '2024-01-15T10:00:00.000Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'A Recipe',
              slug: 'a-recipe',
              summary: null,
            },
            '2024-01-10T10:00:00.000Z',
          ),
          createRecipeVersionWithTimestamp(
            {
              name: 'B Recipe',
              slug: 'b-recipe',
              summary: null,
            },
            '2024-01-20T10:00:00.000Z',
          ),
        ];

        // Run the sorting multiple times with different input orders to ensure consistency
        const result1 = cookbookService.buildCookbook(recipes);
        const result2 = cookbookService.buildCookbook([...recipes].reverse());
        const result3 = cookbookService.buildCookbook(
          [...recipes].sort(() => Math.random() - 0.5),
        );

        // All results should be identical regardless of input order
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);

        // Should be sorted alphabetically by name (ignoring creation dates)
        const aRecipeIndex = result1.indexOf('A Recipe');
        const bRecipeIndex = result1.indexOf('B Recipe');
        const cRecipeIndex = result1.indexOf('C Recipe');

        expect(aRecipeIndex).toBeLessThan(bRecipeIndex);
        expect(bRecipeIndex).toBeLessThan(cRecipeIndex);
      });
    });
  });
});
