import { IUseCase, PackmindCommand } from '../../UseCase';
import { GitProviderId } from '../../git/GitProvider';
import { Marketplace } from '../Marketplace';

export type AutoLinkMarketplaceCommand = PackmindCommand & {
  gitProviderId: GitProviderId;
  owner: string;
  repo: string;
  branch: string;
};

// What the auto-detection decided for one repository during a GitHub App
// installation. The API layer maps 'linked' | 'already-linked' |
// 'previously-unlinked' to "this repo is a marketplace, skip standard add".
export type AutoLinkMarketplaceOutcome =
  | 'linked' // a fresh marketplace was created
  | 'already-linked' // an active marketplace already exists for these coords
  | 'already-standard' // an active standard repo already exists for these coords
  | 'previously-unlinked' // a soft-deleted marketplace exists — do NOT resurrect
  | 'not-a-marketplace' // no marketplace descriptor present
  | 'bad-descriptor'; // descriptor present but unparseable / unknown vendor

export type AutoLinkMarketplaceResponse = {
  outcome: AutoLinkMarketplaceOutcome;
  marketplace?: Marketplace;
};

export type IAutoLinkMarketplaceUseCase = IUseCase<
  AutoLinkMarketplaceCommand,
  AutoLinkMarketplaceResponse
>;
