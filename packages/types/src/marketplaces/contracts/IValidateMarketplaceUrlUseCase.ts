import { IUseCase, PackmindCommand } from '../../UseCase';

/**
 * Command used by an organization admin to pre-flight validate a public
 * marketplace URL before submitting the link form. Pre-flight runs through a
 * tokenless `GitProvider` matching the URL host.
 */
export type ValidateMarketplaceUrlCommand = PackmindCommand & {
  url: string;
};

/**
 * Successful validation response. Marketplace-specific errors (descriptor
 * missing/unknown/malformed, URL unreachable) are thrown as typed domain
 * errors rather than encoded into the response shape — the frontend maps
 * those into the `not-public | not-found | malformed | not-reachable`
 * categories at the gateway layer.
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
