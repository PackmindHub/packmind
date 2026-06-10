import { useMemo } from 'react';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY,
  PMBadge,
  PMBox,
  PMEmptyState,
  PMFeatureFlag,
  PMHStack,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  DistributionStatus,
  type MarketplaceDistributionId,
  type MarketplaceDistributionListItem,
  type MarketplaceId,
  type OrganizationId,
} from '@packmind/types';
import {
  useCancelPluginRemoval,
  useMarkPluginForRemovalByDistribution,
  useMarketplaceDistributions,
} from '../api/queries';
import { DistributionStatusBadge } from './DistributionStatusBadge';
import { RemovePluginButton } from './RemovePluginButton';
import { CancelRemovalButton } from './CancelRemovalButton';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';

export interface MarketplaceDistributionsTableProps {
  organizationId: OrganizationId | string;
  marketplaceId: MarketplaceId | string;
  marketplaceName?: string;
  /**
   * Plugin slugs (marketplace-level, from `marketplace.outdatedPluginSlugs`)
   * whose served plugin was built from a package that changed upstream since
   * the last publish. Rows whose `pluginSlug` matches render an "Outdated"
   * badge next to their status.
   */
  outdatedPluginSlugs?: string[] | null;
}

const COLUMNS: PMTableColumn[] = [
  { key: 'package', header: 'Package', grow: true },
  { key: 'pluginSlug', header: 'Plugin slug', width: '220px' },
  { key: 'publishedAt', header: 'Published', width: '160px' },
  { key: 'status', header: 'Status', width: '160px', align: 'center' },
  { key: 'actions', header: '', width: '180px', align: 'right' },
];

/**
 * Lists every plugin distribution for a single marketplace, with a
 * `DistributionStatusBadge` per row and per-row remove/cancel actions wired
 * through the marketplace queries factory. Actions are gated behind the
 * `MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY`.
 */
export const MarketplaceDistributionsTable = ({
  organizationId,
  marketplaceId,
  marketplaceName,
  outdatedPluginSlugs,
}: Readonly<MarketplaceDistributionsTableProps>) => {
  const { data: distributions, isLoading } = useMarketplaceDistributions(
    organizationId,
    marketplaceId,
  );

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading distributions"
        description="Fetching the plugins published to this marketplace."
      />
    );
  }

  const items = distributions ?? [];

  if (items.length === 0) {
    return (
      <PMEmptyState
        title="No plugins published yet"
        description="Publish a package from a space to see it appear here."
      />
    );
  }

  // "Published" means live on the marketplace: confirmed-success rows and
  // rows awaiting removal (still live until the deletion merges). A
  // pending_merge publish is NOT live yet — it is counted separately.
  const publishedCount = items.filter(
    (item) =>
      item.status === DistributionStatus.success ||
      item.status === DistributionStatus.to_be_removed,
  ).length;
  const pendingCount = items.filter(
    (item) => item.status === DistributionStatus.pending_merge,
  ).length;
  // Count rows whose plugin was built from a package that changed upstream
  // since last publish — mirrors the per-row "Outdated" badge.
  const outdatedSlugSet = new Set(outdatedPluginSlugs ?? []);
  const outdatedCount = items.filter((item) =>
    outdatedSlugSet.has(item.pluginSlug),
  ).length;

  return (
    <PMVStack align="stretch" gap={3} width="full">
      <PMHStack justify="space-between" align="center">
        <PMText variant="small" color="secondary">
          {`${publishedCount} ${publishedCount === 1 ? 'plugin' : 'plugins'} published${
            pendingCount > 0 ? ` · ${pendingCount} pending review` : ''
          }${outdatedCount > 0 ? ` · ${outdatedCount} outdated` : ''}`}
        </PMText>
      </PMHStack>
      <PMBox width="full">
        <DistributionsTableRows
          items={items}
          organizationId={organizationId}
          marketplaceId={marketplaceId}
          marketplaceName={marketplaceName}
          outdatedPluginSlugs={outdatedPluginSlugs}
        />
      </PMBox>
    </PMVStack>
  );
};

interface DistributionsTableRowsProps {
  items: MarketplaceDistributionListItem[];
  organizationId: OrganizationId | string;
  marketplaceId: MarketplaceId | string;
  marketplaceName?: string;
  outdatedPluginSlugs?: string[] | null;
}

const DistributionsTableRows = ({
  items,
  organizationId,
  marketplaceId,
  marketplaceName,
  outdatedPluginSlugs,
}: DistributionsTableRowsProps) => {
  const { user } = useAuthContext();
  const markMutation = useMarkPluginForRemovalByDistribution(
    organizationId,
    marketplaceId,
  );
  const cancelMutation = useCancelPluginRemoval(organizationId, marketplaceId);

  const outdatedSlugSet = useMemo(
    () => new Set(outdatedPluginSlugs ?? []),
    [outdatedPluginSlugs],
  );

  const rows = useMemo<PMTableRow[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        package: (
          <PMVStack gap={0} align="start">
            <PMText variant="body-important">{item.packageName}</PMText>
            <PMText variant="small" color="faded">
              by {item.authorName}
            </PMText>
          </PMVStack>
        ),
        pluginSlug: (
          <PMText variant="small" fontFamily="mono">
            {item.pluginSlug}
          </PMText>
        ),
        publishedAt: (
          <PMText variant="small" color="secondary">
            {/* The honest go-live date: stamped by reconciliation once the
                sync PR merges. Pending rows show a dash. */}
            {formatPublishedAt(item.publishConfirmedAt)}
          </PMText>
        ),
        status: (
          <PMHStack gap={1} align="center" justify="center">
            <DistributionStatusBadge
              status={item.status}
              removalRequestedAt={item.removalRequestedAt}
            />
            {outdatedSlugSet.has(item.pluginSlug) && (
              <PMTooltip label="Built from a package that changed since it was last published. Republish to update.">
                <PMBadge
                  size="sm"
                  colorPalette="yellow"
                  data-testid={`distribution-outdated-badge-${item.pluginSlug}`}
                >
                  Outdated
                </PMBadge>
              </PMTooltip>
            )}
          </PMHStack>
        ),
        actions: (
          <PMFeatureFlag
            featureKeys={[MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY]}
            featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
            userEmail={user?.email}
          >
            <DistributionActionCell
              distribution={item}
              marketplaceName={marketplaceName}
              isMarking={
                markMutation.isPending &&
                (markMutation.variables as MarketplaceDistributionId) ===
                  item.id
              }
              isCancelling={
                cancelMutation.isPending &&
                (cancelMutation.variables as MarketplaceDistributionId) ===
                  item.id
              }
              onMark={() => markMutation.mutate(item.id)}
              onCancel={() => cancelMutation.mutate(item.id)}
            />
          </PMFeatureFlag>
        ),
      })),
    [items, marketplaceName, markMutation, cancelMutation, outdatedSlugSet],
  );

  return (
    <PMTable
      columns={COLUMNS}
      data={rows}
      striped
      hoverable
      size="md"
      variant="line"
      getRowId={(row) => (row as { id: string }).id}
    />
  );
};

interface DistributionActionCellProps {
  distribution: MarketplaceDistributionListItem;
  marketplaceName?: string;
  isMarking: boolean;
  isCancelling: boolean;
  onMark: () => void;
  onCancel: () => void;
}

const DistributionActionCell = ({
  distribution,
  marketplaceName,
  isMarking,
  isCancelling,
  onMark,
  onCancel,
}: DistributionActionCellProps) => {
  // A removal is pending the moment it is requested (`removalRequestedAt`),
  // which happens while the status is still `success` — the background job
  // only flips it to `to_be_removed` once the deletion lands on the sync
  // branch. Keying off both makes the row react immediately to the request and
  // prevents a second click on a still-`success` row.
  const pendingRemoval =
    !!distribution.removalRequestedAt ||
    distribution.status === DistributionStatus.to_be_removed;

  // Removable while live (success) or while the publish still awaits its
  // sync-PR merge (pending_merge) — the removal simply reverts the unmerged
  // publish off the sync branch.
  const removable =
    distribution.status === DistributionStatus.success ||
    distribution.status === DistributionStatus.pending_merge;

  if (removable && !pendingRemoval) {
    return (
      <RemovePluginButton
        pluginSlug={distribution.pluginSlug}
        packageName={distribution.packageName}
        marketplaceName={marketplaceName}
        onMark={onMark}
        isMarking={isMarking}
      />
    );
  }

  if (pendingRemoval) {
    return (
      <CancelRemovalButton
        pluginSlug={distribution.pluginSlug}
        packageName={distribution.packageName}
        marketplaceName={marketplaceName}
        onCancel={onCancel}
        isCancelling={isCancelling}
      />
    );
  }

  return null;
};

function formatPublishedAt(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}
