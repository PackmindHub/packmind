import { useMemo } from 'react';
import { PMTableRow, PMText } from '@packmind/ui';

type RecipeAnalytics = {
  recipeId: string;
  recipeSlug: string;
  recipeName: string;
  totalUsageCount: number;
  lastUsedAt: Date;
};

type AnalyticsData = {
  recipeUsageAnalytics: RecipeAnalytics[];
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};

const formatDate = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 60) {
    if (diffInMinutes <= 1) {
      return 'Just now';
    }
    return `${diffInMinutes} min ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hr ago`;
  } else if (diffInHours < 24 * 7) {
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
};

export const useAnalyticsTableData = (
  data: AnalyticsData | undefined,
  orgSlug: string | undefined,
): PMTableRow[] => {
  return useMemo(() => {
    if (!data?.recipeUsageAnalytics || !orgSlug) {
      return [];
    }

    return data.recipeUsageAnalytics.map((recipeAnalytics) => ({
      id: recipeAnalytics.recipeId,
      recipeName: <PMText>{recipeAnalytics.recipeName}</PMText>,
      totalUsageCount: formatNumber(recipeAnalytics.totalUsageCount),
      lastUsedAt: formatDate(new Date(recipeAnalytics.lastUsedAt)),
    }));
  }, [data, orgSlug]);
};
