import type {
  UseMutateAsyncFunction,
  UseMutateFunction,
  UseMutationResult,
} from '@tanstack/react-query';

// `UseMutationResult` is a discriminated union over `status`, so a stub cannot be
// assembled from a loose bag of overrides: flipping `isPending` without moving
// `status` produces a shape no member of the union accepts. These factories build
// one valid member each, which keeps the mock assignable to the hook's return
// type without a type assertion.

/**
 * The callbacks a component may reach for on a mutation result. `mutateAsync` is
 * required because there is no honest default for it — only the test knows what
 * the mutation should resolve to.
 */
export type MutationResultCallbacks<TData, TError, TVariables> = {
  mutateAsync: UseMutateAsyncFunction<TData, TError, TVariables>;
  mutate?: UseMutateFunction<TData, TError, TVariables>;
  reset?: () => void;
};

const noop = () => undefined;

/**
 * Retry and pause bookkeeping that component-level stubs never exercise.
 */
const inertMutationState = {
  context: undefined,
  failureCount: 0,
  isPaused: false,
  submittedAt: 0,
};

/**
 * A mutation that has not been triggered yet — the state a component renders on
 * first paint.
 */
export const createIdleMutationResult = <TData, TError, TVariables>(
  callbacks: MutationResultCallbacks<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> => ({
  ...inertMutationState,
  status: 'idle',
  data: undefined,
  variables: undefined,
  error: null,
  failureReason: null,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  isError: false,
  mutate: callbacks.mutate ?? noop,
  mutateAsync: callbacks.mutateAsync,
  reset: callbacks.reset ?? noop,
});

/**
 * A mutation whose last attempt rejected. `variables` is the payload that
 * failed, which the union requires to be present in this state.
 *
 * `error` and `variables` are wrapped in `NoInfer` so the type arguments are
 * pinned by the hook the mock is fed to rather than by these two literals —
 * otherwise `variables: { gitProviderId: undefined }` would infer a `TVariables`
 * narrower than the hook's own, and the stub would no longer be assignable.
 */
export const createFailedMutationResult = <TData, TError, TVariables>({
  error,
  variables,
  ...callbacks
}: MutationResultCallbacks<TData, TError, TVariables> & {
  error: NoInfer<TError>;
  variables: NoInfer<TVariables>;
}): UseMutationResult<TData, TError, TVariables> => ({
  ...inertMutationState,
  status: 'error',
  data: undefined,
  variables,
  error,
  failureReason: error,
  failureCount: 1,
  isIdle: false,
  isPending: false,
  isSuccess: false,
  isError: true,
  mutate: callbacks.mutate ?? noop,
  mutateAsync: callbacks.mutateAsync,
  reset: callbacks.reset ?? noop,
});
