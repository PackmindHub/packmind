import { useState, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface UseTableSortOptions {
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
}

export interface UseTableSortResult {
  sortKey: string | null;
  sortDirection: SortDirection;
  handleSort: (columnKey: string) => void;
  getSortDirection: (columnKey: string) => 'asc' | 'desc' | null;
}

export function useTableSort(
  options: UseTableSortOptions = {},
): UseTableSortResult {
  const { defaultSortKey = null, defaultSortDirection = 'asc' } = options;

  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDirection, setSortDirection] =
    useState<SortDirection>(defaultSortDirection);

  const handleSort = useCallback(
    (columnKey: string) => {
      if (columnKey === sortKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(columnKey);
        setSortDirection('asc');
      }
    },
    [sortKey],
  );

  const getSortDirection = useCallback(
    (columnKey: string): 'asc' | 'desc' | null => {
      return columnKey === sortKey ? sortDirection : null;
    },
    [sortKey, sortDirection],
  );

  return { sortKey, sortDirection, handleSort, getSortDirection };
}
