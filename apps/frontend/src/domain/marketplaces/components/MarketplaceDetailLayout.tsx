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
  PMStatus,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  DistributionStatus,
  type MarketplaceArtifactKind,
  type MarketplaceDistributionId,
  type MarketplaceDistributionListItem,
  type MarketplaceListItem,
  type OrganizationId,
  type SourcePackageChange,
} from '@packmind/types';
import {
  LuChevronRight,
  LuEllipsis,
  LuExternalLink,
  LuInbox,
  LuMinus,
  LuPencil,
  LuPencilLine,
  LuPlug,
  LuPlus,
  LuRotateCw,
  LuSearch,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import {
  useMarketplaceDistributionChanges,
  useMarkPluginForRemovalByDistribution,
  useMarketplaceDistributions,
  useSyncMarketplaceNow,
} from '../api/queries';
import { marketplaceQueryKeys } from '../api/queries/MarketplaceQueries';
import { useQueryClient } from '@tanstack/react-query';
import {
  INVALID_TOKEN_MESSAGE,
  mapPublishError,
  useMarketplacePublishMutation,
} from '../../deployments/api/queries/useMarketplacePublishMutation';
import { useAuthContext } from '../../accounts/hooks/useAuthContext';
import { pmToaster } from '@packmind/ui';
import { RemovePluginButton } from './RemovePluginButton';
import { MarketplaceStateBadge } from './MarketplaceStateBadge';
import { PluginAdoptionTab } from './PluginAdoptionTab';
import { PluginOverviewTab } from './PluginOverviewTab';

const PUBLISH_FAILURE_MESSAGES: Record<string, string> = {
  invalid_token: INVALID_TOKEN_MESSAGE,
  name_conflict_unmanaged:
    'The package could not be published. Reason: another plugin with the same name already exists on this marketplace.',
  descriptor_missing:
    'The package could not be published. Reason: the marketplace descriptor (marketplace.json) is missing or malformed.',
  other:
    'The package could not be published. Please try again — if the problem persists, contact an organization admin.',
};

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
  // `version` lives on each PluginRef inside the descriptor, keyed by slug.
  // Older descriptors may omit it — callers default to '—' when missing.
  const versionBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const plugin of marketplace.descriptor?.plugins ?? []) {
      if (plugin.version) {
        map.set(plugin.slug, plugin.version);
      }
    }
    return map;
  }, [marketplace.descriptor?.plugins]);

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
            versionBySlug={versionBySlug}
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
  versionBySlug: Map<string, string>;
}

function PluginsSurface({
  organizationId,
  marketplace,
  distributions,
  isLoading,
  outdatedSlugSet,
  versionBySlug,
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
        versionBySlug={versionBySlug}
      />
      <PMBox flex="1" minW={0} bg="background.primary">
        <PluginDetailPane
          key={selectedDistribution.id}
          distribution={selectedDistribution}
          marketplaceName={marketplace.name}
          organizationId={organizationId}
          marketplaceId={marketplace.id}
          isOutdated={outdatedSlugSet.has(selectedDistribution.pluginSlug)}
          version={versionBySlug.get(selectedDistribution.pluginSlug) ?? null}
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
  versionBySlug: Map<string, string>;
}

function PluginMasterRail({
  distributions,
  selectedId,
  onSelect,
  outdatedSlugSet,
  versionBySlug,
}: Readonly<PluginMasterRailProps>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return distributions;
    return distributions.filter(
      (d) =>
        d.packageName.toLowerCase().includes(q) ||
        d.pluginSlug.toLowerCase().includes(q) ||
        d.authorName.toLowerCase().includes(q) ||
        (d.space?.name.toLowerCase().includes(q) ?? false),
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
              version={versionBySlug.get(d.pluginSlug) ?? null}
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
  version: string | null;
  onSelect: () => void;
}

function PluginRailRow({
  distribution,
  selected,
  outdated,
  version,
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
      aria-label={
        version
          ? `Plugin ${distribution.packageName} version ${version}`
          : `Plugin ${distribution.packageName}`
      }
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
          <PMHStack gap={1.5} align="center" flexShrink={0}>
            {outdated && (
              <PMTooltip label="Built from a package that changed since it was last published. Republish to update.">
                <PMBox
                  width="6px"
                  height="6px"
                  borderRadius="full"
                  bg="orange.500"
                  cursor="help"
                  aria-label="Update available"
                  flexShrink={0}
                />
              </PMTooltip>
            )}
            <PMText
              fontSize="xs"
              color="faded"
              fontVariantNumeric="tabular-nums"
            >
              {version ? `v${version}` : 'v—'}
            </PMText>
          </PMHStack>
        </PMHStack>
        <PMHStack gap={2} align="center">
          {distribution.space ? (
            <PMBadge size="sm" maxW="100%" minW={0}>
              <PMStatus.Root
                colorPalette={distribution.space.color}
                flexShrink={0}
              >
                <PMStatus.Indicator />
              </PMStatus.Root>
              <PMBox as="span" truncate>
                {distribution.space.name}
              </PMBox>
            </PMBadge>
          ) : (
            <PMText fontSize="xs" color="faded">
              space removed
            </PMText>
          )}
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
  version: string | null;
}

type DetailTabId = 'overview' | 'changes' | 'adoption';

function PluginDetailPane({
  distribution,
  marketplaceName,
  organizationId,
  marketplaceId,
  isOutdated,
  version,
}: Readonly<PluginDetailPaneProps>) {
  const [tab, setTab] = useState<DetailTabId>('overview');
  const tabsAnchorId = `plugin-detail-tabs-${distribution.id}`;

  // Eager fetch when the plugin is outdated so the connector pill can show
  // the change count (e.g. "3 changes ready") and the "View N changes" CTA
  // without waiting on the user to open the Changes tab. The Changes tab
  // reuses the same query under the hood — TanStack Query dedupes by key.
  const changesQuery = useMarketplaceDistributionChanges(
    organizationId,
    marketplaceId,
    distribution.id,
    isOutdated,
  );
  const changesCount = changesQuery.data?.length ?? 0;

  const handleViewChanges = () => {
    setTab('changes');
    document
      .getElementById(tabsAnchorId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PMBox paddingX={8} paddingY={6} maxW="960px">
      <PMVStack gap={5} align="stretch">
        <PMVStack gap={2} align="start">
          <PMHeading size="lg" color="primary">
            {distribution.packageName || distribution.pluginSlug}
          </PMHeading>
          <PMHStack gap={2} align="center" wrap="wrap">
            {distribution.space ? (
              <PMBadge size="md">
                <PMStatus.Root
                  colorPalette={distribution.space.color}
                  flexShrink={0}
                >
                  <PMStatus.Indicator />
                </PMStatus.Root>
                {distribution.space.name}
              </PMBadge>
            ) : (
              <PMText fontSize="xs" color="faded">
                space removed
              </PMText>
            )}
            <PMText fontSize="xs" color="faded" aria-hidden>
              &middot;
            </PMText>
            <PMText fontSize="xs" color="faded">
              last published{' '}
              {formatPublishedAt(distribution.publishConfirmedAt)}
            </PMText>
          </PMHStack>
        </PMVStack>

        <VersionTrail
          version={version}
          isOutdated={isOutdated}
          changesCount={changesCount}
          onViewChanges={handleViewChanges}
        />

        <PMBox id={tabsAnchorId} scrollMarginTop="16px">
          <DetailTabs active={tab} onChange={setTab} />
        </PMBox>

        {tab === 'overview' && (
          <PluginOverviewTab
            organizationId={organizationId}
            packageSlug={distribution.packageSlug}
          />
        )}

        {tab === 'changes' && (
          <ChangesTab
            organizationId={organizationId}
            marketplaceId={marketplaceId}
            distribution={distribution}
            marketplaceName={marketplaceName}
            isOutdated={isOutdated}
            active={tab === 'changes'}
          />
        )}

        {tab === 'adoption' && (
          <PluginAdoptionTab
            organizationId={organizationId}
            marketplaceId={marketplaceId}
            pluginSlug={distribution.pluginSlug}
            publishedVersion={version}
            active={tab === 'adoption'}
          />
        )}
      </PMVStack>
    </PMBox>
  );
}

interface ChangesTabProps {
  organizationId: OrganizationId | string;
  marketplaceId: MarketplaceListItem['id'];
  distribution: MarketplaceDistributionListItem;
  marketplaceName: string;
  isOutdated: boolean;
  active: boolean;
}

function ChangesTab({
  organizationId,
  marketplaceId,
  distribution,
  marketplaceName,
  isOutdated,
  active,
}: Readonly<ChangesTabProps>) {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useMarketplaceDistributionChanges(
    organizationId,
    marketplaceId,
    distribution.id,
    active && isOutdated,
  );
  const markMutation = useMarkPluginForRemovalByDistribution(
    organizationId,
    marketplaceId,
  );
  const publishMutation = useMarketplacePublishMutation();

  const pendingRemoval =
    !!distribution.removalRequestedAt ||
    distribution.status === DistributionStatus.to_be_removed;
  const removable =
    distribution.status === DistributionStatus.success ||
    distribution.status === DistributionStatus.pending_merge;

  const changes = data ?? [];
  const canPublish = isOutdated && changes.length > 0;

  const handlePublish = async () => {
    try {
      const response = await publishMutation.mutateAsync({
        organizationId: organizationId as OrganizationId,
        marketplaceId,
        packageId: distribution.packageId,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.distributions(),
        }),
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.list(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: marketplaceQueryKeys.distributionChangesAll(),
        }),
      ]);
      pmToaster.success({
        title: 'Publish started',
        description: `Packmind is publishing "${distribution.packageName}" as "${response.pluginSlug}". You'll see the pull request on the marketplace repository shortly.`,
      });
    } catch (error) {
      const reason = mapPublishError(error);
      pmToaster.error({
        title: 'Publish failed',
        description:
          PUBLISH_FAILURE_MESSAGES[reason] ?? PUBLISH_FAILURE_MESSAGES.other,
      });
    }
  };

  const footer = (
    <PMHStack gap={2} align="center">
      {canPublish && (
        <PMButton
          variant="primary"
          size="sm"
          loading={publishMutation.isPending}
          onClick={handlePublish}
        >
          <PMIcon fontSize="sm">
            <LuRotateCw />
          </PMIcon>
          Publish
        </PMButton>
      )}
      <PMFeatureFlag
        featureKeys={[MARKETPLACE_PLUGIN_REMOVAL_FEATURE_KEY]}
        featureDomainMap={DEFAULT_FEATURE_DOMAIN_MAP}
        userEmail={user?.email}
      >
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
      </PMFeatureFlag>
    </PMHStack>
  );

  const body = (() => {
    if (!isOutdated) {
      return <ChangesInSync />;
    }
    if (isLoading) {
      return (
        <PMHStack gap={2} align="center">
          <PMSpinner size="sm" />
          <PMText fontSize="sm" color="secondary">
            Loading changes…
          </PMText>
        </PMHStack>
      );
    }
    if (isError) {
      return (
        <PMText fontSize="sm" color="error">
          Could not load changes. Refresh the page and try again.
        </PMText>
      );
    }
    if (changes.length === 0) {
      return <ChangesInSync />;
    }
    const countLabel =
      changes.length === 1 ? '1 change' : `${changes.length} changes`;
    return (
      <PMVStack gap={4} align="stretch">
        <PMText fontSize="md" color="primary" fontWeight="medium">
          {countLabel} ready to publish
        </PMText>
        <PMVStack gap={2.5} align="stretch">
          {changes.map((change) => (
            <ChangeRow
              key={`${change.artifactKind}-${change.slug}-${change.kind}`}
              change={change}
            />
          ))}
        </PMVStack>
      </PMVStack>
    );
  })();

  return (
    <PMVStack gap={5} align="stretch">
      {body}
      {footer}
    </PMVStack>
  );
}

function ChangesInSync() {
  return (
    <PMHStack gap={2} align="center">
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg="green.500"
        aria-hidden
      />
      <PMText fontSize="sm" color="secondary">
        In sync with the marketplace.
      </PMText>
    </PMHStack>
  );
}

const CHANGE_STYLE: Record<
  SourcePackageChange['kind'],
  { Icon: IconType; color: string; verb: string }
> = {
  added: { Icon: LuPlus, color: 'green.500', verb: 'Added' },
  removed: { Icon: LuMinus, color: 'red.500', verb: 'Removed' },
  updated: { Icon: LuPencil, color: 'text.secondary', verb: 'Updated' },
};

const ARTIFACT_KIND_LABEL: Record<MarketplaceArtifactKind, string> = {
  command: 'Command',
  standard: 'Standard',
  skill: 'Skill',
};

const MONO_ARTIFACT_KINDS: ReadonlySet<MarketplaceArtifactKind> = new Set([
  'command',
]);

function ChangeRow({ change }: Readonly<{ change: SourcePackageChange }>) {
  const { Icon, color, verb } = CHANGE_STYLE[change.kind];
  const mono = MONO_ARTIFACT_KINDS.has(change.artifactKind);
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="16px 96px 1fr auto"
      alignItems="center"
      columnGap={3}
    >
      <PMBox
        as="span"
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        color={color}
        aria-label={verb}
      >
        <PMIcon fontSize="sm">
          <Icon />
        </PMIcon>
      </PMBox>
      <PMBox>
        <PMBadge size="sm" colorPalette="gray">
          {ARTIFACT_KIND_LABEL[change.artifactKind]}
        </PMBadge>
      </PMBox>
      <PMText
        fontSize="sm"
        color="primary"
        fontWeight="medium"
        truncate
        fontFamily={mono ? 'mono' : undefined}
      >
        {change.name}
      </PMText>
      <ChangeVersionBadge change={change} />
    </PMBox>
  );
}

function ChangeVersionBadge({
  change,
}: Readonly<{ change: SourcePackageChange }>) {
  if (change.kind === 'added') {
    return (
      <PMBadge size="sm" colorPalette="green">
        v{change.currentVersion}
      </PMBadge>
    );
  }
  if (change.kind === 'removed') {
    return (
      <PMBadge size="sm" colorPalette="red">
        v{change.publishedVersion}
      </PMBadge>
    );
  }
  return (
    <PMHStack gap={2} align="center">
      <PMBadge size="sm" colorPalette="gray">
        v{change.publishedVersion}
      </PMBadge>
      <PMText fontSize="xs" color="faded" aria-hidden>
        →
      </PMText>
      <PMBadge size="sm" colorPalette="orange">
        v{change.currentVersion}
      </PMBadge>
    </PMHStack>
  );
}

interface DetailTabsProps {
  active: DetailTabId;
  onChange: (next: DetailTabId) => void;
}

/**
 * Tab strip inside the plugin detail pane. Overview, Changes and Adoption are
 * wired today; Settings from the prototype will join once the backend exposes
 * the data it needs.
 */
function DetailTabs({ active, onChange }: Readonly<DetailTabsProps>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      borderBottom="1px solid"
      borderColor="border.tertiary"
    >
      <DetailTabButton
        active={active === 'overview'}
        onClick={() => onChange('overview')}
      >
        Overview
      </DetailTabButton>
      <DetailTabButton
        active={active === 'changes'}
        onClick={() => onChange('changes')}
      >
        Changes
      </DetailTabButton>
      <DetailTabButton
        active={active === 'adoption'}
        onClick={() => onChange('adoption')}
      >
        Adoption
      </DetailTabButton>
    </PMHStack>
  );
}

interface DetailTabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function DetailTabButton({
  active,
  onClick,
  children,
}: Readonly<DetailTabButtonProps>) {
  return (
    <PMBox
      as="button"
      onClick={onClick}
      bg="transparent"
      border="none"
      cursor="pointer"
      paddingY={3}
      paddingX={0}
      fontSize="sm"
      fontWeight="medium"
      color={active ? 'text.primary' : 'text.faded'}
      borderBottom="2px solid"
      borderColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active ? undefined : { color: 'text.primary' }}
      aria-pressed={active}
    >
      {children}
    </PMBox>
  );
}

interface VersionTrailProps {
  version: string | null;
  isOutdated: boolean;
  changesCount: number;
  onViewChanges: () => void;
}

/**
 * Simplified version trail: a "changes ready" drift indicator on the left and
 * the marketplace-published tier on the right. The prototype also ships a
 * Curated tier (source-package version) and an Installed tier (repo adoption)
 * with a second connector; both are gated on backend data we do not have yet
 * and will join the trail later.
 */
function VersionTrail({
  version,
  isOutdated,
  changesCount,
  onViewChanges,
}: Readonly<VersionTrailProps>) {
  return (
    <PMBox
      display="grid"
      gridTemplateColumns="minmax(140px, auto) 1fr"
      alignItems="start"
      columnGap={4}
      paddingY={5}
      borderTopWidth="1px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <TrailConnector
        isOutdated={isOutdated}
        changesCount={changesCount}
        onViewChanges={onViewChanges}
      />
      <TrailTier
        label="Published"
        value={version ? `v${version}` : 'v—'}
        sub="in marketplace"
      />
    </PMBox>
  );
}

interface TrailTierProps {
  label: string;
  value: string;
  sub: string;
}

function TrailTier({ label, value, sub }: Readonly<TrailTierProps>) {
  return (
    <PMVStack gap={1} align="start" minW="100px">
      <PMText
        fontSize="11px"
        color="faded"
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="semibold"
      >
        {label}
      </PMText>
      <PMText
        fontSize="md"
        color="primary"
        fontWeight="medium"
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </PMText>
      <PMText fontSize="11px" color="faded">
        {sub}
      </PMText>
    </PMVStack>
  );
}

interface TrailConnectorProps {
  isOutdated: boolean;
  changesCount: number;
  onViewChanges: () => void;
}

function TrailConnector({
  isOutdated,
  changesCount,
  onViewChanges,
}: Readonly<TrailConnectorProps>) {
  const driftLabel =
    changesCount === 0
      ? 'Changes ready'
      : changesCount === 1
        ? '1 change ready'
        : `${changesCount} changes ready`;
  const linkLabel =
    changesCount === 0
      ? 'View changes'
      : changesCount === 1
        ? 'View 1 change'
        : `View ${changesCount} changes`;

  return (
    <PMVStack gap={2} align="center" minW="120px" paddingTop="18px">
      <PMIcon
        fontSize="lg"
        color={isOutdated ? 'orange.500' : 'text.faded'}
        aria-hidden
      >
        <LuChevronRight />
      </PMIcon>
      {isOutdated ? (
        <PMVStack gap={1} align="center">
          <PMHStack gap={1.5} align="center">
            <PMIcon fontSize="xs" color="orange.500">
              <LuTriangleAlert />
            </PMIcon>
            <PMText
              fontSize="xs"
              color="primary"
              fontWeight="medium"
              fontVariantNumeric="tabular-nums"
            >
              {driftLabel}
            </PMText>
          </PMHStack>
          <PMBox
            as="button"
            fontSize="11px"
            color="branding.primary"
            bg="transparent"
            border="none"
            cursor="pointer"
            padding={0}
            onClick={onViewChanges}
            transition="color 120ms ease-out"
            _hover={{ color: 'blue.300' }}
            _focusVisible={{
              outline: '2px solid',
              outlineColor: 'branding.primary',
              outlineOffset: '2px',
              borderRadius: 'sm',
            }}
          >
            {linkLabel} →
          </PMBox>
        </PMVStack>
      ) : (
        <PMHStack gap={1.5} align="center">
          <PMBox
            width="6px"
            height="6px"
            borderRadius="full"
            bg="green.500"
            aria-hidden
          />
          <PMText fontSize="xs" color="faded">
            in sync
          </PMText>
        </PMHStack>
      )}
    </PMVStack>
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
