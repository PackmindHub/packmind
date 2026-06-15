import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  DEFAULT_FEATURE_DOMAIN_MAP,
  MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY,
  PMBadge,
  PMBox,
  PMButton,
  PMEmptyState,
  PMFeatureFlag,
  PMHStack,
  PMHeading,
  PMIcon,
  PMInput,
  PMLink,
  PMMenu,
  PMPortal,
  PMSpinner,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  DistributionStatus,
  type MarketplaceDistributionId,
  type MarketplaceDistributionListItem,
  type MarketplaceListItem,
  type OrganizationId,
} from '@packmind/types';
import {
  LuChevronRight,
  LuEllipsis,
  LuExternalLink,
  LuInbox,
  LuPencilLine,
  LuPlug,
  LuRotateCw,
  LuSearch,
  LuTrash2,
} from 'react-icons/lu';
import {
  useCancelPluginRemoval,
  useMarkPluginForRemovalByDistribution,
  useMarketplaceDistributions,
  useSyncMarketplaceNow,
} from '../api/queries';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { DistributionStatusBadge } from './DistributionStatusBadge';
import { RemovePluginButton } from './RemovePluginButton';
import { CancelRemovalButton } from './CancelRemovalButton';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';

export interface MarketplaceDetailLayoutProps {
  organizationId: OrganizationId | string;
  marketplace: MarketplaceListItem;
}

type ActiveTab = 'plugins' | 'suggestions';

/**
 * Marketplace detail body, redesigned around the plugin-centric layout from
 * `apps/playground/src/prototypes/marketplace-detail/`. Renders the section
 * tabs (Plugins / Suggestions) plus a master-detail surface fed by the
 * existing `useMarketplaceDistributions` query — one distribution row per
 * package, which the backend already collapses to its latest status.
 *
 * The Suggestions tab is a placeholder until the backend exposes proposals.
 */
export const MarketplaceDetailLayout = ({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailLayoutProps>) => {
  const { data: distributions, isLoading } = useMarketplaceDistributions(
    organizationId,
    marketplace.id,
  );
  const [tab, setTab] = useState<ActiveTab>('plugins');

  const items = useMemo(() => distributions ?? [], [distributions]);
  const outdatedSlugSet = useMemo(
    () => new Set(marketplace.outdatedPluginSlugs ?? []),
    [marketplace.outdatedPluginSlugs],
  );

  return (
    <PMVStack gap={4} align="stretch">
      <SectionTabs
        active={tab}
        onChange={setTab}
        pluginCount={items.length}
        suggestionsTotal={0}
        pendingCount={0}
      />
      <ContainerFrame>
        {tab === 'plugins' ? (
          <PluginsSurface
            organizationId={organizationId}
            marketplace={marketplace}
            distributions={items}
            isLoading={isLoading}
            outdatedSlugSet={outdatedSlugSet}
          />
        ) : (
          <SuggestionsPlaceholder />
        )}
      </ContainerFrame>
    </PMVStack>
  );
};

interface PluginsSurfaceProps {
  organizationId: OrganizationId | string;
  marketplace: MarketplaceListItem;
  distributions: MarketplaceDistributionListItem[];
  isLoading: boolean;
  outdatedSlugSet: Set<string>;
}

function PluginsSurface({
  organizationId,
  marketplace,
  distributions,
  isLoading,
  outdatedSlugSet,
}: Readonly<PluginsSurfaceProps>) {
  const [selectedId, setSelectedId] =
    useState<MarketplaceDistributionId | null>(null);

  useEffect(() => {
    if (distributions.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillExists = distributions.some((d) => d.id === selectedId);
    if (!stillExists) {
      setSelectedId(distributions[0].id);
    }
  }, [distributions, selectedId]);

  if (isLoading) {
    return (
      <PMBox paddingX={6} paddingY={10}>
        <PMEmptyState
          icon={<PMSpinner />}
          title="Loading distributions"
          description="Fetching the plugins published to this marketplace."
        />
      </PMBox>
    );
  }

  if (distributions.length === 0) {
    return <EmptyMarketplaceState />;
  }

  const selectedDistribution =
    distributions.find((d) => d.id === selectedId) ?? distributions[0];

  return (
    <PMHStack gap={0} align="stretch" minH="640px">
      <PluginMasterRail
        distributions={distributions}
        selectedId={selectedDistribution.id}
        onSelect={setSelectedId}
        outdatedSlugSet={outdatedSlugSet}
      />
      <PMBox flex="1" minW={0} bg="background.primary">
        <PluginDetailPane
          key={selectedDistribution.id}
          distribution={selectedDistribution}
          marketplaceName={marketplace.name}
          organizationId={organizationId}
          marketplaceId={marketplace.id}
          isOutdated={outdatedSlugSet.has(selectedDistribution.pluginSlug)}
        />
      </PMBox>
    </PMHStack>
  );
}

interface PluginMasterRailProps {
  distributions: MarketplaceDistributionListItem[];
  selectedId: MarketplaceDistributionId;
  onSelect: (id: MarketplaceDistributionId) => void;
  outdatedSlugSet: Set<string>;
}

function PluginMasterRail({
  distributions,
  selectedId,
  onSelect,
  outdatedSlugSet,
}: Readonly<PluginMasterRailProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return distributions;
    return distributions.filter(
      (d) =>
        d.packageName.toLowerCase().includes(q) ||
        d.pluginSlug.toLowerCase().includes(q) ||
        d.authorName.toLowerCase().includes(q),
    );
  }, [distributions, query]);

  return (
    <PMBox
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMVStack
        gap={2}
        paddingX={3}
        paddingY={3}
        align="stretch"
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMHStack justify="space-between" align="center">
          <PMText
            fontSize="11px"
            color="faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Plugins
          </PMText>
          <PMText
            fontSize="11px"
            color="faded"
            fontVariantNumeric="tabular-nums"
          >
            {distributions.length}
          </PMText>
        </PMHStack>
        <PMBox position="relative">
          <PMBox
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            color="text.faded"
            pointerEvents="none"
            display="flex"
            alignItems="center"
          >
            <PMIcon fontSize="sm">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            placeholder="Filter plugins"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="sm"
            paddingLeft="32px"
          />
        </PMBox>
      </PMVStack>

      <PMBox flex="1" overflow="auto" minH={0}>
        {filtered.length === 0 ? (
          <PMVStack gap={2} align="start" padding={4}>
            <PMText fontSize="xs" color="secondary">
              No plugins match &ldquo;{query}&rdquo;.
            </PMText>
            <PMBox
              as="button"
              fontSize="xs"
              color="branding.primary"
              bg="transparent"
              border="none"
              cursor="pointer"
              padding={0}
              onClick={() => setQuery('')}
            >
              Clear filter
            </PMBox>
          </PMVStack>
        ) : (
          filtered.map((d) => (
            <PluginRailRow
              key={d.id}
              distribution={d}
              selected={d.id === selectedId}
              outdated={outdatedSlugSet.has(d.pluginSlug)}
              onSelect={() => onSelect(d.id)}
            />
          ))
        )}
      </PMBox>
    </PMBox>
  );
}

interface PluginRailRowProps {
  distribution: MarketplaceDistributionListItem;
  selected: boolean;
  outdated: boolean;
  onSelect: () => void;
}

function PluginRailRow({
  distribution,
  selected,
  outdated,
  onSelect,
}: Readonly<PluginRailRowProps>) {
  return (
    <PMBox
      as="button"
      onClick={onSelect}
      width="100%"
      textAlign="left"
      bg={selected ? 'background.secondary' : 'transparent'}
      border="none"
      cursor="pointer"
      paddingY={2.5}
      paddingLeft={3}
      paddingRight={3}
      position="relative"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      transition="background-color 120ms ease-out"
      _hover={selected ? undefined : { bg: 'background.tertiary' }}
      aria-pressed={selected}
      aria-label={`Plugin ${distribution.packageName}`}
    >
      {selected && (
        <PMBox
          position="absolute"
          left={0}
          top={0}
          bottom={0}
          width="2px"
          bg="branding.primary"
          aria-hidden
        />
      )}
      <PMVStack gap={1} align="stretch">
        <PMHStack gap={2} align="center" justify="space-between">
          <PMText
            fontSize="sm"
            fontWeight={selected ? 'semibold' : 'medium'}
            color="primary"
            truncate
          >
            {distribution.packageName || distribution.pluginSlug}
          </PMText>
          {outdated && (
            <PMTooltip label="Built from a package that changed since it was last published. Republish to update.">
              <PMBox
                width="6px"
                height="6px"
                borderRadius="full"
                bg="orange.500"
                cursor="help"
                aria-label="Outdated"
                flexShrink={0}
              />
            </PMTooltip>
          )}
        </PMHStack>
        <PMHStack gap={2} align="center" justify="space-between">
          <PMText
            fontSize="xs"
            color="faded"
            fontFamily="mono"
            truncate
            flex={1}
            minW={0}
          >
            {distribution.pluginSlug}
          </PMText>
          <DistributionStatusBadge
            status={distribution.status}
            removalRequestedAt={distribution.removalRequestedAt}
          />
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

interface PluginDetailPaneProps {
  distribution: MarketplaceDistributionListItem;
  marketplaceName: string;
  organizationId: OrganizationId | string;
  marketplaceId: MarketplaceListItem['id'];
  isOutdated: boolean;
}

function PluginDetailPane({
  distribution,
  marketplaceName,
  organizationId,
  marketplaceId,
  isOutdated,
}: Readonly<PluginDetailPaneProps>) {
  const { user } = useAuthContext();
  const markMutation = useMarkPluginForRemovalByDistribution(
    organizationId,
    marketplaceId,
  );
  const cancelMutation = useCancelPluginRemoval(organizationId, marketplaceId);

  const pendingRemoval =
    !!distribution.removalRequestedAt ||
    distribution.status === DistributionStatus.to_be_removed;
  const removable =
    distribution.status === DistributionStatus.success ||
    distribution.status === DistributionStatus.pending_merge;

  return (
    <PMBox paddingX={8} paddingY={6} maxW="960px">
      <PMVStack gap={5} align="stretch">
        <PMVStack gap={2} align="start">
          <PMHStack gap={3} align="center" wrap="wrap">
            <PMHeading size="lg" color="primary">
              {distribution.packageName || distribution.pluginSlug}
            </PMHeading>
            <DistributionStatusBadge
              status={distribution.status}
              removalRequestedAt={distribution.removalRequestedAt}
            />
            {isOutdated && (
              <PMTooltip label="Built from a package that changed since it was last published. Republish to update.">
                <PMBadge
                  size="sm"
                  colorPalette="yellow"
                  data-testid={`distribution-outdated-badge-${distribution.pluginSlug}`}
                >
                  Outdated
                </PMBadge>
              </PMTooltip>
            )}
          </PMHStack>
          <PMHStack gap={2} align="center" wrap="wrap">
            <PMText fontSize="xs" color="faded" fontFamily="mono">
              {distribution.pluginSlug}
            </PMText>
            <PMText fontSize="xs" color="faded" aria-hidden>
              &middot;
            </PMText>
            <PMText fontSize="xs" color="faded">
              by {distribution.authorName}
            </PMText>
            <PMText fontSize="xs" color="faded" aria-hidden>
              &middot;
            </PMText>
            <PMText fontSize="xs" color="faded">
              published {formatPublishedAt(distribution.publishConfirmedAt)}
            </PMText>
          </PMHStack>
        </PMVStack>

        <PMFeatureFlag
          featureKeys={[MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY]}
          featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
          userEmail={user?.email}
        >
          <PMBox>
            {removable && !pendingRemoval && (
              <RemovePluginButton
                pluginSlug={distribution.pluginSlug}
                packageName={distribution.packageName}
                marketplaceName={marketplaceName}
                onMark={() => markMutation.mutate(distribution.id)}
                isMarking={
                  markMutation.isPending &&
                  (markMutation.variables as MarketplaceDistributionId) ===
                    distribution.id
                }
              />
            )}
            {pendingRemoval && (
              <CancelRemovalButton
                pluginSlug={distribution.pluginSlug}
                packageName={distribution.packageName}
                marketplaceName={marketplaceName}
                onCancel={() => cancelMutation.mutate(distribution.id)}
                isCancelling={
                  cancelMutation.isPending &&
                  (cancelMutation.variables as MarketplaceDistributionId) ===
                    distribution.id
                }
              />
            )}
          </PMBox>
        </PMFeatureFlag>

        <PlaceholderBlock>
          Plugin version, curated-vs-published drift, repo adoption, and bundled
          artifacts will land here as the backend exposes them.
        </PlaceholderBlock>
      </PMVStack>
    </PMBox>
  );
}

function EmptyMarketplaceState() {
  return (
    <PMBox paddingX={10} paddingY={12}>
      <PMVStack gap={5} align="start" maxW="560px">
        <PMBox
          width="44px"
          height="44px"
          borderRadius="md"
          bg="background.tertiary"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="branding.primary"
        >
          <PMIcon fontSize="lg">
            <LuPlug />
          </PMIcon>
        </PMBox>
        <PMVStack gap={2} align="start">
          <PMText fontSize="md" fontWeight="semibold" color="primary">
            No plugins yet
          </PMText>
          <PMText fontSize="sm" color="secondary" lineHeight={1.55}>
            A plugin bundles the standards, commands, and skills this
            marketplace publishes to consuming repos. Publish a package from a
            space to see it appear here.
          </PMText>
        </PMVStack>
      </PMVStack>
    </PMBox>
  );
}

function SuggestionsPlaceholder() {
  return (
    <PMHStack gap={0} align="stretch" minH="640px">
      <PMBox
        width="320px"
        flexShrink={0}
        bg="background.primary"
        borderRightWidth="1px"
        borderColor="border.tertiary"
        display="flex"
        flexDirection="column"
      >
        <PMVStack
          gap={2}
          paddingX={3}
          paddingY={3}
          align="stretch"
          borderBottomWidth="1px"
          borderColor="border.tertiary"
        >
          <PMText
            fontSize="11px"
            color="faded"
            textTransform="uppercase"
            letterSpacing="wider"
            fontWeight="semibold"
          >
            Suggestions
          </PMText>
        </PMVStack>
      </PMBox>
      <PMBox flex="1" minW={0} paddingX={10} paddingY={12}>
        <PMVStack gap={5} align="start" maxW="560px">
          <PMBox
            width="44px"
            height="44px"
            borderRadius="md"
            bg="background.tertiary"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="branding.primary"
          >
            <PMIcon fontSize="lg">
              <LuInbox />
            </PMIcon>
          </PMBox>
          <PMVStack gap={2} align="start">
            <PMText fontSize="md" fontWeight="semibold" color="primary">
              No suggestions yet
            </PMText>
            <PMText fontSize="sm" color="secondary" lineHeight={1.55}>
              When a space member proposes a plugin for this marketplace, it
              appears here for your review. Backend support for this flow is not
              in place yet — this surface is a placeholder.
            </PMText>
          </PMVStack>
        </PMVStack>
      </PMBox>
    </PMHStack>
  );
}

interface SectionTabsProps {
  active: ActiveTab;
  onChange: (next: ActiveTab) => void;
  pluginCount: number;
  suggestionsTotal: number;
  pendingCount: number;
}

function SectionTabs({
  active,
  onChange,
  pluginCount,
  suggestionsTotal,
  pendingCount,
}: Readonly<SectionTabsProps>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
      paddingX={1}
    >
      <TabButton
        active={active === 'plugins'}
        onClick={() => onChange('plugins')}
        label="Plugins"
        count={pluginCount}
        countAccent={false}
      />
      <TabButton
        active={active === 'suggestions'}
        onClick={() => onChange('suggestions')}
        label="Suggestions"
        count={suggestionsTotal}
        countAccent={pendingCount > 0}
        countLabel={pendingCount > 0 ? `${pendingCount} pending` : undefined}
      />
    </PMHStack>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  countAccent: boolean;
  countLabel?: string;
}

function TabButton({
  active,
  onClick,
  label,
  count,
  countAccent,
  countLabel,
}: Readonly<TabButtonProps>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      bg="transparent"
      border="none"
      cursor="pointer"
      paddingY={3}
      paddingX={0}
      borderBottom="2px solid"
      borderColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active ? undefined : { color: 'text.primary' }}
      aria-pressed={active}
      aria-label={countLabel ? `${label}, ${countLabel}` : label}
    >
      <PMHStack gap={2} align="center">
        <PMText
          fontSize="sm"
          fontWeight="medium"
          color={active ? 'primary' : 'secondary'}
        >
          {label}
        </PMText>
        <PMBox
          paddingX="6px"
          paddingY="1px"
          borderRadius="sm"
          bg={countAccent ? 'branding.primary' : 'background.tertiary'}
          color={countAccent ? 'beige.1000' : 'text.faded'}
          fontSize="11px"
          fontWeight="semibold"
          fontVariantNumeric="tabular-nums"
          lineHeight="1.4"
        >
          {count}
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}

function ContainerFrame({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
    >
      {children}
    </PMBox>
  );
}

function PlaceholderBlock({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PMBox
      bg="background.secondary"
      borderRadius="sm"
      paddingX={4}
      paddingY={3}
    >
      <PMText fontSize="xs" color="faded">
        {children}
      </PMText>
    </PMBox>
  );
}

function formatPublishedAt(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export interface MarketplaceDetailBacklinkProps {
  to: string;
}

export function MarketplaceDetailBacklink({
  to,
}: Readonly<MarketplaceDetailBacklinkProps>) {
  return (
    <PMLink
      asChild
      variant="plain"
      aria-label="Back to marketplaces"
      color="text.faded"
      _hover={{ color: 'text.primary' }}
    >
      <RouterLink to={to}>
        <PMHStack gap="6px" align="center">
          <PMIcon fontSize="sm">
            <LuChevronRight style={{ transform: 'rotate(180deg)' }} />
          </PMIcon>
          <PMText fontSize="sm" color="faded">
            Marketplaces
          </PMText>
        </PMHStack>
      </RouterLink>
    </PMLink>
  );
}

export interface MarketplaceDetailHeaderActionsProps {
  organizationId: OrganizationId | string;
  marketplace: MarketplaceListItem;
}

/**
 * Page-level actions for the marketplace detail route. Sync is wired to the
 * existing `useSyncMarketplaceNow` mutation; "Open on GitHub" links to the
 * backing repo when known; rename/delete are placeholders pending dedicated
 * use cases.
 */
export function MarketplaceDetailHeaderActions({
  organizationId,
  marketplace,
}: Readonly<MarketplaceDetailHeaderActionsProps>) {
  const syncMarketplace = useSyncMarketplaceNow(organizationId, marketplace.id);
  const repoUrl = marketplace.repository?.url ?? null;

  // State chip surfaces only when the marketplace needs attention. The healthy
  // case is the default and adds no information; outdated/drift duplicate the
  // per-row rail indicators, so we omit `outdatedPluginSlugs` here to keep the
  // chip single-purpose.
  return (
    <PMHStack gap={3} align="center">
      {marketplace.state !== 'healthy' && (
        <MarketplaceStateBadge
          state={marketplace.state}
          errorKind={marketplace.errorKind}
          errorDetail={marketplace.errorDetail}
          driftedPluginSlugs={marketplace.descriptor?.driftedPluginSlugs ?? []}
        />
      )}
      <PMButton
        variant="primary"
        size="sm"
        loading={syncMarketplace.isPending}
        onClick={() => syncMarketplace.mutate()}
        data-testid="marketplace-sync-now"
      >
        <PMIcon fontSize="sm">
          <LuRotateCw />
        </PMIcon>
        Sync
      </PMButton>
      <PMButton
        variant="secondary"
        size="sm"
        disabled={!repoUrl}
        onClick={() => {
          if (repoUrl) {
            window.open(repoUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        <PMIcon fontSize="sm">
          <LuExternalLink />
        </PMIcon>
        Open on GitHub
      </PMButton>
      <OverflowMenu />
    </PMHStack>
  );
}

function OverflowMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'bottom-end' }}>
      <PMMenu.Trigger asChild>
        <PMBox
          as="button"
          width="32px"
          height="32px"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          bg="transparent"
          border="1px solid"
          borderColor="border.tertiary"
          borderRadius="sm"
          color="text.secondary"
          cursor="pointer"
          aria-label="More actions"
        >
          <PMIcon fontSize="sm">
            <LuEllipsis />
          </PMIcon>
        </PMBox>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minWidth="220px">
            <PMMenu.Item value="rename" cursor="not-allowed" disabled>
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="text.faded">
                  <LuPencilLine />
                </PMIcon>
                <PMText fontSize="xs" color="primary">
                  Rename marketplace
                </PMText>
              </PMHStack>
            </PMMenu.Item>
            <PMMenu.Item value="delete" cursor="not-allowed" disabled>
              <PMHStack gap={2} flex={1} align="center">
                <PMIcon fontSize="sm" color="red.500">
                  <LuTrash2 />
                </PMIcon>
                <PMText fontSize="xs" color="error">
                  Delete marketplace
                </PMText>
              </PMHStack>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
