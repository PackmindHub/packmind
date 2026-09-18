import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../../git/GitProvider';
import { Marketplace } from '../Marketplace';

/**
 * Admin-only. This is the private path: the repo is reached through a connected
 * `GitProvider`, unlike the tokenless public-URL validation flow.
 */
export type LinkMarketplaceCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  name: string;
};

/**
 * Carries `addedByUserName` so the frontend can render the "added by" column
 * without a second round-trip. An intersection, per
 * `standard-typescript-good-practices.md`, so structural drift on the domain
 * type is caught at compile time.
 */
export type LinkMarketplaceResponse = Marketplace & {
  addedByUserName: string;
};

export type ILinkMarketplaceUseCase = IUseCase<
  LinkMarketplaceCommand,
  LinkMarketplaceResponse
>;
