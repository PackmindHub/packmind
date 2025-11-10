import { recipeFactory } from '@packmind/recipes/test';
import { stubLogger } from '@packmind/test-utils';
import {
  createGitRepoId,
  createOrganizationId,
  createRecipeId,
  createTargetId,
  IRecipesPort,
} from '@packmind/types';
import { recipeUsageFactory } from '../../../test/recipeUsageFactory';
import { TimePeriods } from '../../domain/entities/RecipeUsageAnalytics';
import { RecipeUsageAnalyticsService } from './RecipeUsageAnalyticsService';

describe('RecipeUsageAnalyticsService', () => {
  let service: RecipeUsageAnalyticsService;
  let mockRecipesPort: jest.Mocked<IRecipesPort>;

  beforeEach(() => {
    mockRecipesPort = {
      getRecipeByIdInternal: jest.fn(),
    } as unknown as jest.Mocked<IRecipesPort>;

    service = new RecipeUsageAnalyticsService(mockRecipesPort, stubLogger());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('filterByTimePeriod', () => {
    const now = new Date('2023-12-15T10:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('filters records for last 7 days', () => {
      const usageRecords = [
        recipeUsageFactory({ usedAt: new Date('2023-12-10T10:00:00Z') }), // 5 days ago - should be included
        recipeUsageFactory({ usedAt: new Date('2023-12-05T10:00:00Z') }), // 10 days ago - should be excluded
        recipeUsageFactory({ usedAt: new Date('2023-12-14T10:00:00Z') }), // 1 day ago - should be included
      ];

      const result = service.filterByTimePeriod(
        usageRecords,
        TimePeriods.LAST_7_DAYS,
      );

      expect(result).toHaveLength(2);
      expect(result[0].usedAt).toEqual(new Date('2023-12-10T10:00:00Z'));
      expect(result[1].usedAt).toEqual(new Date('2023-12-14T10:00:00Z'));
    });

    it('filters records for last month', () => {
      const usageRecords = [
        recipeUsageFactory({ usedAt: new Date('2023-11-20T10:00:00Z') }), // Within last month
        recipeUsageFactory({ usedAt: new Date('2023-10-10T10:00:00Z') }), // Older than month
        recipeUsageFactory({ usedAt: new Date('2023-12-01T10:00:00Z') }), // Within last month
      ];

      const result = service.filterByTimePeriod(
        usageRecords,
        TimePeriods.LAST_MONTH,
      );

      expect(result).toHaveLength(2);
    });

    it('filters records for last 3 months', () => {
      const usageRecords = [
        recipeUsageFactory({ usedAt: new Date('2023-10-01T10:00:00Z') }), // Within 3 months
        recipeUsageFactory({ usedAt: new Date('2023-08-01T10:00:00Z') }), // Older than 3 months
        recipeUsageFactory({ usedAt: new Date('2023-11-01T10:00:00Z') }), // Within 3 months
      ];

      const result = service.filterByTimePeriod(
        usageRecords,
        TimePeriods.LAST_3_MONTHS,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('aggregateOrganizationUsage', () => {
    const now = new Date('2023-12-15T10:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('aggregates usage records by recipe with sorting', async () => {
      const organizationId = createOrganizationId('org-1');
      const recipe1 = recipeFactory({
        id: createRecipeId('recipe-1'),
        slug: 'test-recipe-1',
      });
      const recipe2 = recipeFactory({
        id: createRecipeId('recipe-2'),
        slug: 'test-recipe-2',
      });

      const usageRecords = [
        // Recipe 1 used 3 times
        recipeUsageFactory({
          recipeId: recipe1.id,
          usedAt: new Date('2023-12-10T10:00:00Z'),
          aiAgent: 'Cursor',
        }),
        recipeUsageFactory({
          recipeId: recipe1.id,
          usedAt: new Date('2023-12-11T10:00:00Z'),
          aiAgent: 'Cursor',
        }),
        recipeUsageFactory({
          recipeId: recipe1.id,
          usedAt: new Date('2023-12-12T10:00:00Z'),
          aiAgent: 'Claude Code',
        }),
        // Recipe 2 used 1 time
        recipeUsageFactory({
          recipeId: recipe2.id,
          usedAt: new Date('2023-12-13T10:00:00Z'),
          aiAgent: 'Cursor',
        }),
      ];

      mockRecipesPort.getRecipeByIdInternal
        .mockResolvedValueOnce(recipe1)
        .mockResolvedValueOnce(recipe2);

      const result = await service.aggregateOrganizationUsage(
        usageRecords,
        organizationId,
        TimePeriods.LAST_3_MONTHS,
      );

      expect(result.organizationId).toBe(organizationId);
      expect(result.timePeriod).toBe(TimePeriods.LAST_3_MONTHS);
      expect(result.totalUsage).toBe(4);
      expect(result.totalRecipes).toBe(2);
      expect(result.recipeUsageAnalytics).toHaveLength(2);

      // Should be sorted by usage count (highest first)
      expect(result.recipeUsageAnalytics[0].recipeSlug).toBe('test-recipe-1');
      expect(result.recipeUsageAnalytics[0].totalUsageCount).toBe(3);
      expect(result.recipeUsageAnalytics[1].recipeSlug).toBe('test-recipe-2');
      expect(result.recipeUsageAnalytics[1].totalUsageCount).toBe(1);
    });

    describe('when usage counts are equal', () => {
      it('sorts by recipe name alphabetically', async () => {
        const organizationId = createOrganizationId('org-1');
        const recipeA = recipeFactory({
          id: createRecipeId('recipe-a'),
          slug: 'recipe-a',
          name: 'Z Recipe (Last alphabetically)',
        });
        const recipeB = recipeFactory({
          id: createRecipeId('recipe-b'),
          slug: 'recipe-b',
          name: 'A Recipe (First alphabetically)',
        });
        const recipeC = recipeFactory({
          id: createRecipeId('recipe-c'),
          slug: 'recipe-c',
          name: 'M Recipe (Middle alphabetically)',
        });

        const usageRecords = [
          // Recipe A used 2 times
          recipeUsageFactory({
            recipeId: recipeA.id,
            usedAt: new Date('2023-12-10T10:00:00Z'),
            aiAgent: 'Cursor',
          }),
          recipeUsageFactory({
            recipeId: recipeA.id,
            usedAt: new Date('2023-12-11T10:00:00Z'),
            aiAgent: 'Cursor',
          }),
          // Recipe B used 2 times (same as A)
          recipeUsageFactory({
            recipeId: recipeB.id,
            usedAt: new Date('2023-12-12T10:00:00Z'),
            aiAgent: 'Cursor',
          }),
          recipeUsageFactory({
            recipeId: recipeB.id,
            usedAt: new Date('2023-12-13T10:00:00Z'),
            aiAgent: 'Claude Code',
          }),
          // Recipe C used 1 time (different count, should come last)
          recipeUsageFactory({
            recipeId: recipeC.id,
            usedAt: new Date('2023-12-14T10:00:00Z'),
            aiAgent: 'Cursor',
          }),
        ];

        mockRecipesPort.getRecipeByIdInternal
          .mockResolvedValueOnce(recipeA)
          .mockResolvedValueOnce(recipeB)
          .mockResolvedValueOnce(recipeC);

        const result = await service.aggregateOrganizationUsage(
          usageRecords,
          organizationId,
          TimePeriods.LAST_3_MONTHS,
        );

        expect(result.recipeUsageAnalytics).toHaveLength(3);

        // Should be sorted by usage count first (highest first), then by name (alphabetical)
        // Both A and Z have 2 usages, but A should come first alphabetically
        expect(result.recipeUsageAnalytics[0].recipeName).toBe(
          'A Recipe (First alphabetically)',
        );
        expect(result.recipeUsageAnalytics[0].totalUsageCount).toBe(2);

        expect(result.recipeUsageAnalytics[1].recipeName).toBe(
          'Z Recipe (Last alphabetically)',
        );
        expect(result.recipeUsageAnalytics[1].totalUsageCount).toBe(2);

        // M has only 1 usage, so it comes last regardless of alphabetical order
        expect(result.recipeUsageAnalytics[2].recipeName).toBe(
          'M Recipe (Middle alphabetically)',
        );
        expect(result.recipeUsageAnalytics[2].totalUsageCount).toBe(1);
      });
    });

    it('handles missing recipes gracefully', async () => {
      const organizationId = createOrganizationId('org-1');
      const usageRecords = [
        recipeUsageFactory({
          recipeId: createRecipeId('nonexistent-recipe'),
          usedAt: new Date('2023-12-10T10:00:00Z'),
        }),
      ];

      mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(null);

      const result = await service.aggregateOrganizationUsage(
        usageRecords,
        organizationId,
        TimePeriods.LAST_3_MONTHS,
      );

      expect(result.totalUsage).toBe(1);
      expect(result.totalRecipes).toBe(0);
      expect(result.recipeUsageAnalytics).toHaveLength(0);
    });
  });

  describe('aggregateRepositoryUsage', () => {
    const now = new Date('2023-12-15T10:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('aggregates usage records for repository', async () => {
      const repositoryId = createGitRepoId('repo-1');
      const recipe = recipeFactory({
        id: createRecipeId('recipe-1'),
        slug: 'test-recipe',
      });

      const usageRecords = [
        recipeUsageFactory({
          recipeId: recipe.id,
          gitRepoId: repositoryId,
          aiAgent: 'Cursor',
          usedAt: new Date('2023-12-10T10:00:00Z'),
        }),
        recipeUsageFactory({
          recipeId: recipe.id,
          gitRepoId: repositoryId,
          aiAgent: 'Claude Code',
          usedAt: new Date('2023-12-11T10:00:00Z'),
        }),
      ];

      mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);

      const result = await service.aggregateRepositoryUsage(
        usageRecords,
        repositoryId,
        TimePeriods.LAST_MONTH,
      );

      expect(result.repositoryId).toBe(repositoryId);
      expect(result.timePeriod).toBe(TimePeriods.LAST_MONTH);
      expect(result.totalUsage).toBe(2);
      expect(result.totalRecipes).toBe(1);
      expect(result.recipeUsageAnalytics[0].totalUsageCount).toBe(2);
    });
  });

  describe('aggregateTargetUsage', () => {
    const now = new Date('2023-12-15T10:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('aggregates usage records for target', async () => {
      const targetId = createTargetId('target-1');
      const recipe = recipeFactory({
        id: createRecipeId('recipe-1'),
        slug: 'test-recipe',
      });

      const usageRecords = [
        recipeUsageFactory({
          recipeId: recipe.id,
          targetId: targetId,
          aiAgent: 'Cursor',
          usedAt: new Date('2023-12-10T10:00:00Z'),
        }),
        recipeUsageFactory({
          recipeId: recipe.id,
          targetId: targetId,
          aiAgent: 'Claude Code',
          usedAt: new Date('2023-12-11T10:00:00Z'),
        }),
      ];

      mockRecipesPort.getRecipeByIdInternal.mockResolvedValue(recipe);

      const result = await service.aggregateTargetUsage(
        usageRecords,
        targetId,
        TimePeriods.LAST_MONTH,
      );

      expect(result.targetId).toBe(targetId);
      expect(result.timePeriod).toBe(TimePeriods.LAST_MONTH);
      expect(result.totalUsage).toBe(2);
      expect(result.totalRecipes).toBe(1);
      expect(result.recipeUsageAnalytics[0].totalUsageCount).toBe(2);
    });
  });

  describe('createAnalyticsFilters', () => {
    it('creates filters with correct date range for last 7 days', () => {
      const now = new Date('2023-12-15T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const filters = service.createAnalyticsFilters(TimePeriods.LAST_7_DAYS);

      expect(filters.timePeriod).toBe(TimePeriods.LAST_7_DAYS);
      expect(filters.startDate).toEqual(new Date('2023-12-08T10:00:00Z'));
      expect(filters.endDate).toEqual(now);

      jest.useRealTimers();
    });

    it('creates filters with correct date range for last 3 months', () => {
      const now = new Date('2023-12-15T10:00:00Z');
      jest.useFakeTimers().setSystemTime(now);

      const filters = service.createAnalyticsFilters(TimePeriods.LAST_3_MONTHS);

      expect(filters.timePeriod).toBe(TimePeriods.LAST_3_MONTHS);
      // Date calculation might adjust for timezone changes, so we check the actual result
      const expectedStart = new Date(now);
      expectedStart.setMonth(now.getMonth() - 3);
      expect(filters.startDate).toEqual(expectedStart);
      expect(filters.endDate).toEqual(now);

      jest.useRealTimers();
    });
  });
});
