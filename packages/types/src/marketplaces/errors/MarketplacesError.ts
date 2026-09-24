import { DomainError, DomainErrorKind } from '../../errors';

export type MarketplacesErrorReason =
  | 'marketplace_already_linked'
  | 'marketplace_plugin_name_conflict'
  | 'vendor_mismatch'
  | 'marketplace_drift_has_pending_changes'
  | 'plugin_distribution_invalid_state'
  | 'marketplace_not_found'
  | 'plugin_distribution_not_found'
  | 'marketplace_descriptor_not_found'
  | 'marketplace_descriptor_bad_format'
  | 'marketplace_descriptor_unparseable'
  | 'unknown_marketplace_descriptor'
  | 'marketplace_url_not_reachable'
  | 'git_provider_token_invalid';

export type MarketplacesErrorContext = {
  gitRepoOwner?: string;
  gitRepoName?: string;
  marketplaceId?: string;
  marketplaceUrl?: string;
  marketplaceName?: string;
  pluginSlug?: string;
  distributionId?: string;
  packageId?: string;
  distributionStatus?: string;
  expectedDistributionStatuses?: string[];
  pendingMergeCount?: number;
  pendingRemovalCount?: number;
  previousVendor?: string;
  currentVendor?: string;
};

/**
 * Base for the marketplaces domain errors, in the same shape as `DeploymentsError`:
 * the `kind` decides the HTTP answer, the literal `reason` is what a client
 * branches on, and `context` carries the ids for the log instead of only
 * being interpolated into the message.
 */
export class MarketplacesError extends Error implements DomainError {
  readonly kind: DomainErrorKind;
  readonly reason: MarketplacesErrorReason;
  readonly context: MarketplacesErrorContext;

  constructor(
    kind: DomainErrorKind,
    reason: MarketplacesErrorReason,
    context: MarketplacesErrorContext,
    message: string,
  ) {
    super(message);
    this.name = 'MarketplacesError';
    this.kind = kind;
    this.reason = reason;
    this.context = context;
  }
}
