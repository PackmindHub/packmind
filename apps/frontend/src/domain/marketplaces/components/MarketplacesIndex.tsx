import { useMemo } from 'react';
import {
  PMBox,
  PMEmptyState,
  PMHStack,
  PMSpinner,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlug } from 'react-icons/lu';
import type { MarketplaceId, MarketplaceListItem } from '@packmind/types';
import { MarketplaceRow } from './MarketplaceRow';

export interface MarketplacesIndexProps {
  marketplaces: MarketplaceListItem[];
  isLoading: boolean;
  /**
   * When set, the unlink button on this marketplace renders the loading
   * state. Caller passes the `MarketplaceId` currently being mutated via
   * `useUnlinkMarketplace`.
   */
  unlinkingMarketplaceId?: MarketplaceId | null;
  onUnlink: (marketplaceId: MarketplaceId) => void;
  /**
   * Kept for parity with the route call site (`organizationId` was passed by
   * the L placeholder). Not used directly here — the route owns the data and
   * action hooks. Optional so consumers do not have to thread it through.
   */
  organizationId?: string;
}

const COLUMNS: PMTableColumn[] = [
  { key: 'name', header: 'Marketplace', grow: true },
  { key: 'repository', header: 'Repository', width: '200px' },
  { key: 'vendor', header: 'Agent', width: '120px' },
  { key: 'state', header: 'State', width: '120px', align: 'center' },
  {
    key: 'pluginCount',
    header: 'Plugins',
    width: '90px',
    align: 'center',
  },
  { key: 'addedBy', header: 'Added by', width: '160px' },
  {
    key: 'lastValidatedAt',
    header: 'Last checked',
    width: '140px',
  },
  { key: 'actions', header: '', width: '110px', align: 'right' },
];

/**
 * Lists linked marketplaces for the current organization.
 *
 * The route owns data + mutations and passes the resolved props in. Empty,
 * loading and populated states are all handled here so the route component
 * stays a thin shell.
 */
export const MarketplacesIndex = ({
  marketplaces,
  isLoading,
  unlinkingMarketplaceId,
  onUnlink,
}: Readonly<MarketplacesIndexProps>) => {
  const rows = useMemo<PMTableRow[]>(
    () =>
      marketplaces.map((marketplace) =>
        MarketplaceRow({
          marketplace,
          onUnlink,
          isUnlinking: unlinkingMarketplaceId === marketplace.id,
        }),
      ),
    [marketplaces, onUnlink, unlinkingMarketplaceId],
  );

  if (isLoading) {
    return (
      <PMEmptyState
        icon={<PMSpinner />}
        title="Loading marketplaces"
        description="Hang tight while we fetch the marketplaces linked to your organization."
      />
    );
  }

  if (marketplaces.length === 0) {
    return (
      <PMVStack align="stretch" gap={4}>
        <PMEmptyState
          icon={<LuPlug />}
          title="Link your first marketplace"
          description="Marketplaces are Git repositories Packmind reads to discover plugins your team can install. Link one to make its plugins available to your organization."
        />
      </PMVStack>
    );
  }

  return (
    <PMVStack align="stretch" gap={3} width="full">
      <PMHStack justify="space-between" align="center">
        <PMText variant="small" color="secondary">
          {marketplaces.length}{' '}
          {marketplaces.length === 1 ? 'marketplace' : 'marketplaces'} linked
        </PMText>
      </PMHStack>
      <PMBox width="full">
        <PMTable
          columns={COLUMNS}
          data={rows}
          striped
          hoverable
          size="md"
          variant="line"
          getRowId={(row) => (row as { id: string }).id}
        />
      </PMBox>
    </PMVStack>
  );
};
