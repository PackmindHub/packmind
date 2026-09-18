/**
 * Nominal-typing utility for entity IDs, so a `UserId` cannot be passed where a
 * `SpaceId` is expected even though both are strings at runtime. Every entity id
 * in the codebase is declared as a pair:
 *
 *     type UserId = Branded<'UserId'>;
 *     const createUserId = brandedIdFactory<UserId>();
 */
export type Branded<T extends string> = string & { __brand: T };

export function brandedIdFactory<T extends Branded<string>>(): (
  id: string,
) => T {
  return (id: string) => id as T;
}
