import { Injectable } from '@nestjs/common';
import { LogLevel, PackmindLogger } from '@packmind/logger';
import {
  ISearchPort,
  ISpacesPort,
  OrganizationId,
  SearchCommand,
  SearchResponse,
  SpaceId,
  UserId,
} from '@packmind/types';
import { InjectSearchAdapter } from './search.tokens';
import { InjectSpacesAdapter } from '../../shared/HexaInjection';

/**
 * Command accepted by SearchService (typed object per the NestJS module
 * hierarchy standard).
 */
export type SearchServiceCommand = {
  organizationId: OrganizationId;
  userId: UserId;
  query: string;
};

/**
 * Orchestrates global search across the spaces the user belongs to.
 *
 * Membership scoping is resolved here via ISpacesPort: the user's member space
 * ids + their slugs are gathered, then handed to the read-only ISearchPort
 * adapter which runs the ILIKE text queries. SearchService performs no text
 * query and no domain mutation.
 */
@Injectable()
export class SearchService {
  private readonly logger = new PackmindLogger('SearchService', LogLevel.INFO);

  constructor(
    @InjectSearchAdapter() private readonly searchAdapter: ISearchPort,
    @InjectSpacesAdapter() private readonly spacesAdapter: ISpacesPort,
  ) {}

  async search(command: SearchServiceCommand): Promise<SearchResponse> {
    const { organizationId, userId, query } = command;

    const memberships =
      await this.spacesAdapter.findMembershipsByUserAndOrganization(
        userId,
        organizationId,
      );
    const spaceIds = memberships.map((membership) => membership.spaceId);

    // No member spaces → nothing to search. Also guards the adapter against
    // TypeORM's empty `IN (:...)` expansion (throws on empty list).
    if (spaceIds.length === 0) {
      return { results: [], total: 0 };
    }

    // Resolve a slug per member space (listSpacesByOrganization returns all
    // org spaces; filter down to the user's member spaces).
    const orgSpaces =
      await this.spacesAdapter.listSpacesByOrganization(organizationId);
    const memberSpaceIdSet = new Set(spaceIds.map(String));
    const spaceSlugById = new Map<SpaceId, string>();
    for (const space of orgSpaces) {
      if (memberSpaceIdSet.has(String(space.id))) {
        spaceSlugById.set(space.id, space.slug);
      }
    }

    const searchCommand: SearchCommand = {
      term: query,
      spaceIds,
      spaceSlugById,
    };

    return this.searchAdapter.search(searchCommand);
  }
}
