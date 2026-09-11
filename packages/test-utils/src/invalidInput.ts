/**
 * A value that breaks the contract of the parameter it is given to, for the
 * tests that exercise what the code does when a caller sends one anyway: an
 * untyped JavaScript caller, a wire payload, an older client, a route with no
 * runtime validation behind it.
 *
 * ```ts
 * await useCase.execute({
 *   gitProviderId: invalidInput<GitProviderId>(undefined),
 *   ...command,
 * });
 * ```
 *
 * The cast such a test needs lives here, once and under a name, rather than as
 * an `as unknown as` in each spec. It buys no type safety - nothing can, since
 * the whole point is a value the type forbids - but it tells a reader which
 * casts are deliberate, so the ones that are merely a mock that stopped
 * matching its port stand out instead of blending in.
 */
export function invalidInput<T>(value: unknown): T {
  return value as T;
}
