import { Marketplace } from './Marketplace';

/**
 * Presentation DTO returned by `ListMarketplacesUseCase`.
 *
 * Enriches the domain `Marketplace` with the display name of the user who
 * added it. `pluginCount` already lives on the domain entity (denormalized
 * for fast reads), so it is inherited via the intersection — no need to
 * re-declare it here.
 *
 * Per `standard-typescript-good-practices.md`, presentation DTOs that enrich
 * a domain type are expressed as an intersection so structural drift on the
 * domain type is caught at compile time.
 */
export type MarketplaceListItem = Marketplace & {
  addedByUserName: string;
};
