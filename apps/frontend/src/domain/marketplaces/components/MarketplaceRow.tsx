import { useState } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMConfirmationModal,
  PMHStack,
  PMLink,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { MarketplaceId, MarketplaceListItem } from '@packmind/types';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';

export interface MarketplaceRowProps {
  marketplace: MarketplaceListItem;
  onUnlink: (marketplaceId: MarketplaceId) => void;
  isUnlinking: boolean;
  /**
   * When true, the row's state cell shows an inline spinner indicating its
   * live state is being refreshed on page open.
   */
  isRefreshing?: boolean;
  /**
   * Organization slug used to build the link to the marketplace details
   * sub-route. When omitted, the marketplace name renders as plain text.
   */
  orgSlug?: string;
}

/**
 * Renders the row content for one linked marketplace as a `PMTable` row map.
 *
 * Composition mirrors `apps/playground/src/prototypes/marketplaces/components/MarketplaceRow.tsx`
 * but adapted to the data shape `ListMarketplacesUseCase` actually returns:
 * `name`, `vendor`, `state`, `pluginCount`, `addedByUserName`,
 * `lastValidatedAt`, and the backing `repository` (owner/repo, provider and a
 * web URL) — the descriptor name is shown as a secondary line when it differs
 * from the display name.
 *
 * Returns a plain object rather than JSX so it can drop straight into
 * `PMTable`'s `data` array.
 */
export function MarketplaceRow({
  marketplace,
  onUnlink,
  isUnlinking,
  isRefreshing = false,
  orgSlug,
}: Readonly<MarketplaceRowProps>): Record<string, React.ReactNode> {
  return {
    id: marketplace.id,
    name: <MarketplaceNameCell marketplace={marketplace} orgSlug={orgSlug} />,
    repository: <MarketplaceRepositoryCell marketplace={marketplace} />,
    vendor: <PMText variant="small">{vendorLabel(marketplace.vendor)}</PMText>,
    state: (
      <PMHStack gap={2} align="center" justify="center">
        <MarketplaceStateBadge state={marketplace.state} />
        {isRefreshing && (
          <PMSpinner size="xs" aria-label="Checking marketplace" />
        )}
      </PMHStack>
    ),
    pluginCount: (
      <PMText variant="small" fontVariantNumeric="tabular-nums">
        {marketplace.pluginCount}
      </PMText>
    ),
    addedBy: (
      <PMText variant="small">
        {marketplace.addedByUserName || 'Unknown'}
      </PMText>
    ),
    lastValidatedAt: (
      <PMText variant="small" color="secondary">
        {formatLastValidated(marketplace.lastValidatedAt)}
      </PMText>
    ),
    actions: (
      <UnlinkMarketplaceButton
        marketplace={marketplace}
        onUnlink={onUnlink}
        isUnlinking={isUnlinking}
      />
    ),
  };
}

const MarketplaceNameCell = ({
  marketplace,
  orgSlug,
}: Readonly<{ marketplace: MarketplaceListItem; orgSlug?: string }>) => {
  const detailsHref = orgSlug
    ? `/org/${orgSlug}/marketplaces/${marketplace.id}`
    : undefined;

  return (
    <PMVStack gap={0} align="start">
      {detailsHref ? (
        <PMLink asChild>
          <Link to={detailsHref}>
            <PMText variant="body-important">{marketplace.name}</PMText>
          </Link>
        </PMLink>
      ) : (
        <PMText variant="body-important">{marketplace.name}</PMText>
      )}
      {marketplace.descriptor?.name &&
        marketplace.descriptor.name !== marketplace.name && (
          <PMText variant="small" color="faded">
            {marketplace.descriptor.name}
          </PMText>
        )}
    </PMVStack>
  );
};

/**
 * Shows the backing repository as `owner/repo`, linking out to the provider's
 * web URL when one is known, with the provider name on a secondary line. Falls
 * back to a dash when the backing `GitRepo` could not be resolved.
 */
const MarketplaceRepositoryCell = ({
  marketplace,
}: Readonly<{ marketplace: MarketplaceListItem }>) => {
  const repository = marketplace.repository;
  if (!repository) {
    return (
      <PMText variant="small" color="faded">
        —
      </PMText>
    );
  }

  const label = `${repository.owner}/${repository.repo}`;

  return (
    <PMVStack gap={0} align="start">
      {repository.url ? (
        <PMLink
          href={repository.url}
          target="_blank"
          rel="noopener noreferrer"
          variant="underline"
          aria-label={`Open ${label} on ${providerLabel(repository.providerSource)}`}
        >
          {label}
        </PMLink>
      ) : (
        <PMText variant="small">{label}</PMText>
      )}
      <PMText variant="small" color="faded">
        {providerLabel(repository.providerSource)}
      </PMText>
    </PMVStack>
  );
};

/**
 * Inline button + confirmation modal used to unlink a marketplace. Owns its
 * own open/close state so the modal can be torn down once the optimistic
 * mutation kicks in.
 */
export const UnlinkMarketplaceButton = ({
  marketplace,
  onUnlink,
  isUnlinking,
}: Readonly<MarketplaceRowProps>) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    onUnlink(marketplace.id);
    setConfirmOpen(false);
  };

  return (
    <PMConfirmationModal
      trigger={
        <PMButton
          variant="danger"
          size="sm"
          loading={isUnlinking}
          aria-label={`Unlink ${marketplace.name}`}
        >
          Unlink
        </PMButton>
      }
      title="Unlink marketplace"
      message={`Unlink "${marketplace.name}" from this organization? The underlying Git repository will not be touched.`}
      confirmText="Unlink"
      confirmColorScheme="red"
      open={confirmOpen}
      onOpenChange={({ open }) => setConfirmOpen(open)}
      onConfirm={handleConfirm}
      isLoading={isUnlinking}
    />
  );
};

function vendorLabel(vendor: string): string {
  switch (vendor) {
    case 'anthropic':
      return 'Claude Code';
    default:
      return vendor;
  }
}

function providerLabel(source: string): string {
  switch (source) {
    case 'github':
      return 'GitHub';
    case 'gitlab':
      return 'GitLab';
    default:
      return 'Unknown provider';
  }
}

/**
 * Short human-readable representation of the last reconciliation timestamp.
 * Falls back to `'Pending'` while the first reconciliation job is queued.
 */
function formatLastValidated(lastValidatedAt: Date | null): string {
  if (!lastValidatedAt) {
    return 'Pending';
  }

  const date =
    lastValidatedAt instanceof Date
      ? lastValidatedAt
      : new Date(lastValidatedAt);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) {
    return 'Pending';
  }

  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export const __testables__ = {
  formatLastValidated,
  vendorLabel,
  providerLabel,
};
