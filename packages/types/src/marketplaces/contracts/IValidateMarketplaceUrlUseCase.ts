import { IUseCase, PackmindCommand } from '../../UseCase';

/**
 * Admin-only pre-flight check, run before the link form is submitted. It goes
 * through a tokenless `GitProvider` matched on the URL host, so it only works
 * for a publicly readable repository.
 */
export type ValidateMarketplaceUrlCommand = PackmindCommand & {
  url: string;
};

/**
 * The success shape only. Descriptor-missing/unknown/malformed and unreachable
 * URLs are thrown as typed domain errors rather than encoded here, and the
 * client maps those onto its own `not-public | not-found | malformed |
 * not-reachable` categories at the gateway layer.
 */
export type ValidateMarketplaceUrlResponse = {
  kind: 'verified';
  repoPath: string;
  defaultBranch: string;
  pluginCount: number;
};

export type IValidateMarketplaceUrlUseCase = IUseCase<
  ValidateMarketplaceUrlCommand,
  ValidateMarketplaceUrlResponse
>;
