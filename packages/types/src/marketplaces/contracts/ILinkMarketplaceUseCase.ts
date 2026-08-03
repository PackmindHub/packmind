import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../../git/GitProvider';
import { Marketplace } from '../Marketplace';

/**
 * Command used by an organization admin to link a Git repository as a
 * marketplace for the organization (private path — repo accessed through a
 * connected `GitProvider`).
 */
export type LinkMarketplaceCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
  name: string;
};

/**
 * Response returned by `ILinkMarketplaceUseCase`. The domain `Marketplace`
 * entity is enriched with the display name of the admin who added it so the
 * frontend can render the "added by" column without a second round-trip.
 *
 * Per `standard-typescript-good-practices.md`, presentation DTOs enriching a
 * domain type use an intersection so structural drift on the domain type is
 * caught at compile time.
 */
export type LinkMarketplaceResponse = Marketplace & {
  addedByUserName: string;
};

export type ILinkMarketplaceUseCase = IUseCase<
  LinkMarketplaceCommand,
  LinkMarketplaceResponse
>;
