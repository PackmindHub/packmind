import { useMutation } from '@tanstack/react-query';
import {
  MarketplaceId,
  OrganizationId,
  PackageId,
  PublishFailureReason,
  PublishPackageOnMarketplaceResponse,
} from '@packmind/types';
import {
  isPackmindError,
  PackmindError,
} from '../../../../services/api/errors/PackmindError';
import { deploymentsGateways } from '../gateways';
import type { IDeploymentsGateway } from '../gateways/IDeploymentsGateway';

/**
 * Variables passed to the marketplace publish mutation. We accept the
 * organization id explicitly rather than reading it from auth context inside
 * the hook, so route loaders and components can both call this without
 * surprises.
 */
export type MarketplacePublishMutationVariables = {
  organizationId: OrganizationId;
  marketplaceId: MarketplaceId;
  packageId: PackageId;
};

/**
 * The verbatim text the spec requires when the Git provider token has
 * expired. Echoed exactly by the toast layer; never echoes the token
 * itself.
 */
export const INVALID_TOKEN_MESSAGE =
  'The package could not be published. Reason: Invalid or expired Git token.';

/**
 * Maps the server failure to a `PublishFailureReason` the UI can branch on.
 *
 * Backend → HTTP mapping:
 *   - `MarketplacePluginNameConflictError`  → 409
 *   - `GitProviderTokenInvalidError`        → 400 + body contains
 *     "Invalid or expired Git token"
 *   - `MarketplaceDescriptorBadFormatError` → 400
 *   - `MarketplaceDescriptorNotFoundError`  → 400
 *   - other 400 / 5xx                       → 'other'
 */
export const mapPublishError = (error: unknown): PublishFailureReason => {
  if (!isPackmindError(error)) {
    return 'other';
  }

  const { status, data } = error.serverError;
  const message = data?.message ?? '';

  if (status === 409) {
    return 'name_conflict_unmanaged';
  }

  if (status === 400) {
    if (message.includes('Invalid or expired Git token')) {
      return 'invalid_token';
    }
    // Both descriptor-not-found and descriptor-bad-format map to the same
    // category from the user's perspective: the marketplace.json is broken.
    return 'descriptor_missing';
  }

  return 'other';
};

/**
 * TanStack mutation hook that publishes a Packmind package as a managed
 * plugin on a linked marketplace.
 *
 * The hook stays gateway-agnostic so tests can inject a stub. Production
 * code uses the default `deploymentsGateways` singleton.
 *
 * Cache invalidation is intentionally limited: the publish endpoint is
 * write-only and the polling helper (`marketplaceDistributionQueries.byId`)
 * is consumed by the modal after success, so we don't blast the
 * marketplaces list on every click. Callers that need to refresh the
 * marketplaces list (e.g. to bump `pluginCount`) can do so once the
 * background job emits `PluginPublishedEvent`.
 */
export const useMarketplacePublishMutation = ({
  gateway = deploymentsGateways,
}: {
  gateway?: Pick<IDeploymentsGateway, 'publishPackageOnMarketplace'>;
} = {}) =>
  useMutation<
    PublishPackageOnMarketplaceResponse,
    PackmindError | Error,
    MarketplacePublishMutationVariables
  >({
    mutationFn: (variables) =>
      gateway.publishPackageOnMarketplace(
        variables,
      ) as Promise<PublishPackageOnMarketplaceResponse>,
  });
