import { useMemo } from 'react';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY,
  PMBox,
  PMEmptyState,
  PMFeatureFlag,
  PMHStack,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
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

  return (
    <PMVStack align="stretch" gap={3} width="full">
      <PMHStack justify="space-between" align="center">
        <PMText variant="small" color="secondary">
          {items.length} {items.length === 1 ? 'plugin' : 'plugins'} published
        </PMText>
      </PMHStack>
      <PMBox width="full">
        <DistributionsTableRows
          items={items}
          organizationId={organizationId}
          marketplaceId={marketplaceId}
          marketplaceName={marketplaceName}
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
}

const DistributionsTableRows = ({
  items,
  organizationId,
  marketplaceId,
  marketplaceName,
}: DistributionsTableRowsProps) => {
  const { user } = useAuthContext();
  const markMutation = useMarkPluginForRemovalByDistribution(
    organizationId,
    marketplaceId,
  );
  const cancelMutation = useCancelPluginRemoval(organizationId, marketplaceId);

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
            {formatPublishedAt(item.createdAt)}
          </PMText>
        ),
        status: <DistributionStatusBadge status={item.status} />,
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
    [items, marketplaceName, markMutation, cancelMutation],
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
  if (distribution.status === DistributionStatus.success) {
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

  if (distribution.status === DistributionStatus.to_be_removed) {
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
