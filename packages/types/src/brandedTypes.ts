/**
 * Branded type utility for creating strongly-typed IDs
 *
 * @example
 * type UserId = Branded<'UserId'>;
 * const createUserId = brandedIdFactory<UserId>();
 * const userId = createUserId("user-123");
 */
export type Branded<T extends string> = string & { __brand: T };

/**
 * Factory function for creating branded ID constructors
 *
 * @example
 * type UserId = Branded<'UserId'>;
 * const createUserId = brandedIdFactory<UserId>();
 * const userId = createUserId("user-123");
 */
export function brandedIdFactory<T extends Branded<string>>(): (
  id: string,
) => T {
  return (id: string) => id as T;
}
