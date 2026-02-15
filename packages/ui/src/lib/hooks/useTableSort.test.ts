import { renderHook, act } from '@testing-library/react';
import { useTableSort } from './useTableSort';

describe('useTableSort', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with default options', () => {
    it('starts with no active sort', () => {
      const { result } = renderHook(() => useTableSort());
      expect(result.current.sortKey).toBeNull();
    });

    it('returns null for getSortDirection on any column', () => {
      const { result } = renderHook(() => useTableSort());
      expect(result.current.getSortDirection('name')).toBeNull();
    });
  });

  describe('with default sort config', () => {
    it('starts with the specified sort key', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'asc' }),
      );
      expect(result.current.sortKey).toBe('name');
    });

    it('starts with the specified sort direction', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'desc' }),
      );
      expect(result.current.sortDirection).toBe('desc');
    });

    it('returns sort direction for the active column', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'asc' }),
      );
      expect(result.current.getSortDirection('name')).toBe('asc');
    });
  });

  describe('when clicking a new column', () => {
    it('sets the sort key', () => {
      const { result } = renderHook(() => useTableSort());

      act(() => result.current.handleSort('name'));

      expect(result.current.sortKey).toBe('name');
    });

    it('sets ascending direction', () => {
      const { result } = renderHook(() => useTableSort());

      act(() => result.current.handleSort('name'));

      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('when clicking the same column', () => {
    it('toggles to descending', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'asc' }),
      );

      act(() => result.current.handleSort('name'));

      expect(result.current.sortDirection).toBe('desc');
    });

    it('toggles back to ascending on second click', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'asc' }),
      );

      act(() => result.current.handleSort('name'));
      act(() => result.current.handleSort('name'));

      expect(result.current.sortDirection).toBe('asc');
    });
  });

  describe('when switching columns', () => {
    it('sets the new sort key', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'desc' }),
      );

      act(() => result.current.handleSort('email'));

      expect(result.current.sortKey).toBe('email');
    });

    it('resets direction to ascending', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'desc' }),
      );

      act(() => result.current.handleSort('email'));

      expect(result.current.sortDirection).toBe('asc');
    });

    it('returns null for the previously sorted column', () => {
      const { result } = renderHook(() =>
        useTableSort({ defaultSortKey: 'name', defaultSortDirection: 'asc' }),
      );

      act(() => result.current.handleSort('email'));

      expect(result.current.getSortDirection('name')).toBeNull();
    });
  });
});
