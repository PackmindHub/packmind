import { IUseCase, PackmindCommand } from '../../UseCase';
import { MarketplaceFaceId } from '../MarketplaceFaceId';
import { MarketplaceId } from '../MarketplaceId';

/**
 * Changes which assistants a marketplace serves.
 *
 * `faces` is the complete desired set, not a delta, so the call is idempotent:
 * submitting the current set writes nothing. Enabling and disabling in one call
 * lands as a single commit on the rolling sync PR.
 *
 * Enabling a face backfills its catalogue with every plugin Packmind already
 * serves, because the publish job only ever appends one entry at a time — a new
 * face left to the next publish would advertise a single plugin while the others
 * kept serving all of them. Plugin payloads are shared across faces, so nothing
 * is re-rendered.
 *
 * Disabling a face deletes its catalogue file. The shared `plugins/<slug>/`
 * payloads stay: the other faces still serve them.
 *
 * Admin-scoped, matching who may link a marketplace in the first place.
 */
export type UpdateMarketplaceFacesCommand = PackmindCommand & {
  marketplaceId: MarketplaceId;
  faces: MarketplaceFaceId[];
};

export type UpdateMarketplaceFacesResponse = {
  faces: MarketplaceFaceId[];
  /** Faces enabled by this call, whose catalogue was backfilled. */
  addedFaces: MarketplaceFaceId[];
  /** Faces disabled by this call, whose catalogue file was deleted. */
  removedFaces: MarketplaceFaceId[];
  /**
   * URL of the rolling "Packmind sync" PR carrying the catalogue changes, or
   * `null` when nothing had to be written or the PR could not be surfaced.
   */
  pendingPrUrl: string | null;
};

export type IUpdateMarketplaceFacesUseCase = IUseCase<
  UpdateMarketplaceFacesCommand,
  UpdateMarketplaceFacesResponse
>;
