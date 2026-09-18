import type { UseQueryResult } from '@tanstack/react-query';

// `UseQueryResult` is a discriminated union over `status`, the same shape problem
// `mutationResultMocks.ts` describes: a stub assembled from a loose bag of
// overrides - `{ data, isLoading: false }` - belongs to no member of the union,
// so it only ever went in behind an `as` cast. That cast is what let a fixture
// drift from the query's own data type without anyone noticing. These factories
// build one valid member each, so the stub is assignable on its own merits and
// the payload is checked against TData.

/** Bookkeeping a component-level stub never reads. */
const inertQueryState = {
  dataUpdatedAt: 0,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isInitialLoading: false,
  isPaused: false,
  isRefetching: false,
  isStale: false,
  isEnabled: true,
};

const noRefetch = <TData, TError>(): UseQueryResult<TData, TError>['refetch'] =>
  (() => Promise.reject(new Error('refetch is not stubbed'))) as UseQueryResult<
    TData,
    TError
  >['refetch'];

/**
 * A query that has resolved. `refetch` defaults to a rejecting stub: a test that
 * needs the component to refetch should pass its own and assert on it.
 */
export const createSuccessQueryResult = <TData, TError = Error>(
  data: TData,
  refetch: UseQueryResult<TData, TError>['refetch'] = noRefetch<TData, TError>(),
): UseQueryResult<TData, TError> => ({
  ...inertQueryState,
  status: 'success',
  data,
  error: null,
  isError: false,
  isPending: false,
  isLoading: false,
  isLoadingError: false,
  isRefetchError: false,
  isSuccess: true,
  isPlaceholderData: false,
  refetch,
});

/**
 * A query still in flight on first paint - no data yet, and nothing failed.
 */
export const createPendingQueryResult = <TData, TError = Error>(
  refetch: UseQueryResult<TData, TError>['refetch'] = noRefetch<TData, TError>(),
): UseQueryResult<TData, TError> => ({
  ...inertQueryState,
  status: 'pending',
  data: undefined,
  error: null,
  isError: false,
  isPending: true,
  isLoading: true,
  isFetching: true,
  isFetched: false,
  isFetchedAfterMount: false,
  isLoadingError: false,
  isRefetchError: false,
  isSuccess: false,
  isPlaceholderData: false,
  refetch,
});

/**
 * A query whose first load failed.
 */
export const createFailedQueryResult = <TData, TError = Error>(
  error: NoInfer<TError>,
  refetch: UseQueryResult<TData, TError>['refetch'] = noRefetch<TData, TError>(),
): UseQueryResult<TData, TError> => ({
  ...inertQueryState,
  status: 'error',
  data: undefined,
  error,
  failureReason: error,
  failureCount: 1,
  errorUpdateCount: 1,
  isError: true,
  isPending: false,
  isLoading: false,
  isLoadingError: true,
  isRefetchError: false,
  isSuccess: false,
  isPlaceholderData: false,
  refetch,
});
