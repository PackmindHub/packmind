import { useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMStatus,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuExternalLink, LuRotateCw, LuTriangleAlert } from 'react-icons/lu';
import {
  NO_FILTERS,
  type AdoptionFilters,
  type DetailTabId,
  type GroupMode,
  type Plugin,
} from '../types';
import { shortRevision, summarize } from '../utils/adoption';
import { AdoptionPanel } from './adoption/AdoptionPanel';
import { ChangesPanel } from './ChangesPanel';
import { OverviewPanel } from './OverviewPanel';

// The one remaining tab level. Overview / Changes / Adoption are three different
// subjects about one plugin, which is what tabs are for. Everything that used to
// nest below Adoption — the axis switch and the behind-only pill — became
// controls over a single list instead of two more levels of navigation.

type PluginDetailPaneProps = {
  plugin: Plugin;
  isLoading: boolean;
};

export function PluginDetailPane({
  plugin,
  isLoading,
}: Readonly<PluginDetailPaneProps>) {
  const [tab, setTab] = useState<DetailTabId>('adoption');
  const [filters, setFilters] = useState<AdoptionFilters>(NO_FILTERS);
  const [groupMode, setGroupMode] = useState<GroupMode>('repository');

  const summary = useMemo(
    () => summarize(plugin.installs, plugin.publishedRevision),
    [plugin.installs, plugin.publishedRevision],
  );

  // The header's "behind" count and the Adoption table below it are the same
  // question at two zoom levels, so the CTA sets the filter rather than just
  // switching tab — the click that reads "View 6 behind" now shows six rows.
  const showBehind = () => {
    setFilters({ ...NO_FILTERS, status: 'behind' });
    setGroupMode('repository');
    setTab('adoption');
  };

  return (
    <PMBox paddingX={8} paddingY={6} maxW="1100px">
      <PMVStack gap={5} align="stretch">
        <PMHStack gap={4} align="start" justify="space-between" wrap="wrap">
          <PMVStack gap={2} align="start" flex="1" minW={0}>
            <PMHeading size="lg" color="primary">
              {plugin.name}
            </PMHeading>
            <PMHStack gap={2} align="center" wrap="wrap">
              <PMBadge size="md">
                <PMStatus.Root colorPalette={plugin.spaceColor} flexShrink={0}>
                  <PMStatus.Indicator />
                </PMStatus.Root>
                {plugin.spaceName}
              </PMBadge>
              <PMText fontSize="xs" color="faded" aria-hidden>
                ·
              </PMText>
              <PMText fontSize="xs" color="faded">
                v{plugin.version} · revision{' '}
                {shortRevision(plugin.publishedRevision)} · published{' '}
                {plugin.publishedRelative}
              </PMText>
            </PMHStack>
          </PMVStack>
          <PMHStack gap={2} align="center">
            {plugin.isOutdated && (
              <PMButton variant="primary" size="sm">
                <PMIcon fontSize="sm">
                  <LuRotateCw />
                </PMIcon>
                Publish changes
              </PMButton>
            )}
            <PMButton variant="secondary" size="sm">
              <PMIcon fontSize="sm">
                <LuExternalLink />
              </PMIcon>
              Open package
            </PMButton>
          </PMHStack>
        </PMHStack>

        {summary.behind > 0 && plugin.publishedRevision !== null && (
          <BehindNotice
            behind={summary.behind}
            installs={summary.installs}
            onShowBehind={showBehind}
            // Only outside Adoption: on that tab the coverage line says it
            // already, and a banner echoing the headline under it is noise.
            visible={tab !== 'adoption'}
          />
        )}

        <DetailTabs
          active={tab}
          onChange={setTab}
          changesCount={plugin.changes.length}
          installsCount={plugin.installs.length}
        />

        {tab === 'overview' && <OverviewPanel plugin={plugin} />}
        {tab === 'changes' && <ChangesPanel plugin={plugin} />}
        {tab === 'adoption' && (
          <PMBox paddingTop={4}>
            <AdoptionPanel
              plugin={plugin}
              filters={filters}
              onFiltersChange={setFilters}
              groupMode={groupMode}
              onGroupModeChange={setGroupMode}
              isLoading={isLoading}
            />
          </PMBox>
        )}
      </PMVStack>
    </PMBox>
  );
}

/**
 * The drift headline, above the tabs so it is true whichever tab is open.
 * It hides itself once the reader is already looking at exactly those rows —
 * a banner that repeats the filter you just applied is noise.
 */
function BehindNotice({
  behind,
  installs,
  onShowBehind,
  visible,
}: Readonly<{
  behind: number;
  installs: number;
  onShowBehind: () => void;
  visible: boolean;
}>) {
  if (!visible) return null;
  return (
    <PMHStack
      gap={3}
      align="center"
      bg="background.secondary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      paddingX={3}
      paddingY={2}
    >
      <PMIcon fontSize="sm" color="orange.500">
        <LuTriangleAlert />
      </PMIcon>
      <PMText fontSize="sm" color="primary" fontVariantNumeric="tabular-nums">
        {behind} of {installs} installs are not on the published revision
      </PMText>
      <PMBox
        as="button"
        fontSize="xs"
        color="branding.primary"
        bg="transparent"
        border="none"
        cursor="pointer"
        padding={0}
        marginLeft="auto"
        onClick={onShowBehind}
        _hover={{ color: 'blue.300' }}
      >
        Show the {behind} behind →
      </PMBox>
    </PMHStack>
  );
}

type DetailTabsProps = {
  active: DetailTabId;
  onChange: (next: DetailTabId) => void;
  changesCount: number;
  installsCount: number;
};

function DetailTabs({
  active,
  onChange,
  changesCount,
  installsCount,
}: Readonly<DetailTabsProps>) {
  return (
    <PMHStack
      gap={6}
      align="center"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
    >
      <TabButton
        active={active === 'overview'}
        onClick={() => onChange('overview')}
      >
        Overview
      </TabButton>
      <TabButton
        active={active === 'changes'}
        onClick={() => onChange('changes')}
        count={changesCount}
      >
        Changes
      </TabButton>
      <TabButton
        active={active === 'adoption'}
        onClick={() => onChange('adoption')}
        count={installsCount}
      >
        Adoption
      </TabButton>
    </PMHStack>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}>) {
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
      borderBottomWidth="2px"
      borderBottomColor={active ? 'branding.primary' : 'transparent'}
      marginBottom="-1px"
      transition="color 150ms ease-out"
      _hover={active ? undefined : { color: 'text.primary' }}
      aria-pressed={active}
    >
      <PMHStack gap={2} align="center">
        {children}
        {count !== undefined && count > 0 && (
          <PMBox
            paddingX="6px"
            paddingY="1px"
            borderRadius="sm"
            bg="background.tertiary"
            color="text.faded"
            fontSize="11px"
            fontWeight="semibold"
            fontVariantNumeric="tabular-nums"
            lineHeight="1.4"
          >
            {count}
          </PMBox>
        )}
      </PMHStack>
    </PMBox>
  );
}
