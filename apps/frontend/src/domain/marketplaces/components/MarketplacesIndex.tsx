import {
  PMBox,
  PMEmptyState,
  PMHStack,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuPlug } from 'react-icons/lu';
import type { MarketplaceId, MarketplaceListItem } from '@packmind/types';
import { MarketplaceRow } from './MarketplaceRow';

export interface MarketplacesIndexProps {
  marketplaces: MarketplaceListItem[];
  isLoading: boolean;
  unlinkingMarketplaceId?: MarketplaceId | null;
  refreshingIds?: ReadonlySet<MarketplaceId>;
  onUnlink: (marketplaceId: MarketplaceId) => void;
  /**
   * Unused, kept for parity with the route call site so we don't have to
   * touch the route in this change.
   */
  organizationId?: string;
  orgSlug?: string;
}

/**
 * Lists linked marketplaces for the current organization. The route owns
 * data + mutations; we just render the empty / loading / populated states.
 */
export const MarketplacesIndex = ({
  marketplaces,
  isLoading,
  unlinkingMarketplaceId,
  refreshingIds,
  onUnlink,
  orgSlug,
}: Readonly<MarketplacesIndexProps>) => {
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
      <PMEmptyState
        icon={<LuPlug />}
        title="Link your first marketplace"
        description="Marketplaces are Git repositories Packmind reads to discover plugins your team can install. Link one to make its plugins available to your organization."
      />
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
      <PMBox
        bg="background.primary"
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="md"
        overflow="hidden"
      >
        <ListHeader />
        {marketplaces.map((marketplace, index) => {
          const isLast = index === marketplaces.length - 1;
          return (
            <PMBox
              key={marketplace.id}
              {...(isLast ? { '& > *': { borderBottom: 'none' } } : {})}
            >
              <MarketplaceRow
                marketplace={marketplace}
                onUnlink={onUnlink}
                isUnlinking={unlinkingMarketplaceId === marketplace.id}
                isRefreshing={refreshingIds?.has(marketplace.id) ?? false}
                orgSlug={orgSlug}
              />
            </PMBox>
          );
        })}
      </PMBox>
    </PMVStack>
  );
};

const ListHeader = () => (
  <PMHStack
    gap={5}
    paddingX={4}
    paddingY={2}
    bg="background.secondary"
    borderBottom="1px solid"
    borderColor="border.tertiary"
    fontSize="10px"
    color="text.faded"
    textTransform="uppercase"
    letterSpacing="wider"
    fontWeight="semibold"
  >
    <PMBox flex={1} minW={0}>
      Marketplace
    </PMBox>
    <PMBox width="280px" flexShrink={0}>
      Contents
    </PMBox>
    <PMBox width="180px" flexShrink={0} textAlign="right">
      Coverage
    </PMBox>
    <PMBox width="64px" flexShrink={0} />
  </PMHStack>
);
