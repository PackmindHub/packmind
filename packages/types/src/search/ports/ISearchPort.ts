import { SpaceId } from '../../spaces/SpaceId';
import { SearchResponse } from '../SearchResult';

/**
 * Port name for the hexagonal search adapter.
 * Follows the DDD port convention (see ISpacesPortName).
 */
export const ISearchPortName = 'ISearchPort' as const;

/**
 * Command handed to the search adapter.
 * The spaces the user belongs to (membership scoping) are resolved upstream
 * by SearchService via ISpacesPort; the adapter only runs the text queries
 * scoped to those space ids and attaches the resolved space slugs.
 */
export type SearchCommand = {
  term: string;
  spaceIds: SpaceId[];
  /** Resolved slug per space id — used to populate `spaceSlug` on each result. */
  spaceSlugById: Map<SpaceId, string>;
};

/**
 * Port interface for cross-domain text search over standards, recipes,
 * skills and packages. Read-only: no domain mutation or business rules.
 */
export interface ISearchPort {
  search(command: SearchCommand): Promise<SearchResponse>;
}
