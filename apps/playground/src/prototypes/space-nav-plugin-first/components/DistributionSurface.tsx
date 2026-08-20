import { useCallback, useMemo, useState } from 'react';
import { PMBox, PMButton, PMHStack, PMText, PMVStack } from '@packmind/ui';

import { behindTargetIds, destinationsFor, reachSummary } from '../data';
import type { Destination, ReachSummary } from '../data';
import type { PluginSummary } from '../types';
import { DestinationDetailPane } from './DestinationDetailPane';
import { DestinationRail } from './DestinationRail';

/**
 * The second navigation entry built on the same graph as Context, indexed the
 * other way: Context is indexed by plugin, this is indexed by destination.
 * That single rule decides what belongs here. A repository and a marketplace
 * are destinations, so they are in; a plugin is not, so there is no list of
 * plugins at the top level, only plugins seen from the place they landed in.
 */
export function DistributionSurface({
  plugins,
  onRedistribute,
  onOpenPlugin,
  onGoToContext,
}: Readonly<{
  plugins: PluginSummary[];
  onRedistribute: (targetIds: string[]) => void;
  onOpenPlugin: (pluginId: string) => void;
  onGoToContext: () => void;
}>) {
  const [query, setQuery] = useState('');
  const [selectedDestinationId, setSelectedDestinationId] = useState<
    string | null
  >(null);
  const [focusPluginId, setFocusPluginId] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(
    () => new Set(),
  );

  const destinations = useMemo(() => destinationsFor(plugins), [plugins]);

  const select = useCallback((destinationId: string, pluginId?: string) => {
    setSelectedDestinationId(destinationId);
    setFocusPluginId(pluginId ?? null);
  }, []);

  const toggleBulk = useCallback((destinationId: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(destinationId)) next.delete(destinationId);
      else next.add(destinationId);
      return next;
    });
  }, []);

  /**
   * Every repair made from this surface clears the selection. Rows that were
   * picked because they were behind are not behind any more, and a tick left on
   * a row that is now green claims work that no longer exists.
   */
  const redistribute = useCallback(
    (targetIds: string[]) => {
      onRedistribute(targetIds);
      setBulkSelected(new Set());
    },
    [onRedistribute],
  );

  if (destinations.length === 0) {
    return <NoDestinationState onGoToContext={onGoToContext} />;
  }

  const selected =
    destinations.find(
      (destination) => destination.id === selectedDestinationId,
    ) ?? destinations[0];

  return (
    <PMVStack gap={0} align="stretch" height="100%" minH={0}>
      <SurfaceHeader
        destinations={destinations}
        onDistributeAllBehind={() =>
          redistribute(behindTargetIds(destinations))
        }
      />
      <PMHStack gap={0} align="stretch" flex={1} minH={0}>
        <DestinationRail
          destinations={destinations}
          selectedDestinationId={selected.id}
          query={query}
          bulkSelected={bulkSelected}
          onQueryChange={setQuery}
          onSelect={select}
          onToggleBulk={toggleBulk}
          onSetBulkSelection={setBulkSelected}
          onDistributeBulk={() =>
            redistribute(
              behindTargetIds(
                destinations.filter((destination) =>
                  bulkSelected.has(destination.id),
                ),
              ),
            )
          }
        />
        <PMBox flex={1} minW={0} minH={0} overflowY="auto">
          <DestinationDetailPane
            /*
             * Remounted on the destination and on the plugin the user came in
             * through: filters and expanded rows describe one destination, and
             * carrying them to the next one would state the previous screen's
             * answer under a new heading.
             */
            key={`${selected.id}-${focusPluginId ?? ''}`}
            destination={selected}
            focusPluginId={focusPluginId}
            onRedistribute={redistribute}
            onOpenPlugin={onOpenPlugin}
          />
        </PMBox>
      </PMHStack>
    </PMVStack>
  );
}

/**
 * The space-level line the current Overview already carries above its
 * distribution table: what is behind across everything, and the two actions
 * that answer it. It belongs here now rather than on Overview, on top of the
 * list it describes, and it keeps the product's wording so the move does not
 * read as a new feature.
 *
 * The per-destination footer remains the precise instrument. This is the blunt
 * one: everything, in one click, which is what a Monday morning actually wants.
 */
function SurfaceHeader({
  destinations,
  onDistributeAllBehind,
}: Readonly<{
  destinations: Destination[];
  onDistributeAllBehind: () => void;
}>) {
  const summary = useMemo(() => reachSummary(destinations), [destinations]);
  const hasSignal = summary.behind > 0;

  return (
    <PMHStack
      justify="space-between"
      align="center"
      gap={6}
      rowGap={2}
      wrap="wrap"
      paddingX={4}
      paddingY={3}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      flexShrink={0}
    >
      <SummaryLine summary={summary} />
      {hasSignal && (
        <PMHStack gap={2} flexShrink={0}>
          <PMButton variant="primary" size="sm" onClick={onDistributeAllBehind}>
            Distribute drifted
          </PMButton>
          {/*
            Out of this prototype's scope, like the Marketplaces row in the
            sidebar: it leads to an organisation-level setup page. It is here
            because it is the second half of the answer to drift, and a screen
            that only ever offers to fix by hand argues for doing it by hand.
          */}
          <PMButton variant="secondary" size="sm" onClick={() => undefined}>
            Set up Auto-update
          </PMButton>
        </PMHStack>
      )}
    </PMHStack>
  );
}

function SummaryLine({ summary }: Readonly<{ summary: ReachSummary }>) {
  if (summary.behind === 0) {
    return (
      <PMHStack gap={2} align="center">
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg="green.500"
          flexShrink={0}
          aria-hidden
        />
        <PMText fontSize="sm" color="secondary">
          Every distribution is on the latest version.
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMText fontSize="sm" color="secondary" lineHeight="1.6">
      <Metric value={summary.behind} tone="warning" />
      {` distribution${summary.behind === 1 ? '' : 's'} behind in `}
      <Metric value={summary.needingWork} tone="warning" />
      {` of ${summary.destinations} destination${summary.destinations === 1 ? '' : 's'}`}
      {/*
        Failed is called out rather than folded in, because it is the subset a
        redistribution may not fix on its own: a protected branch stays
        protected. It is already inside the count on the left.
      */}
      {summary.failed > 0 && (
        <>
          {' · '}
          <Metric value={summary.failed} tone="error" />
          {' failed'}
        </>
      )}
    </PMText>
  );
}

function Metric({
  value,
  tone,
}: Readonly<{ value: number; tone: 'warning' | 'error' }>) {
  return (
    <PMText
      as="span"
      fontWeight="semibold"
      color={tone}
      fontVariantNumeric="tabular-nums"
    >
      {value}
    </PMText>
  );
}

function NoDestinationState({
  onGoToContext,
}: Readonly<{ onGoToContext: () => void }>) {
  return (
    <PMBox padding={6}>
      <PMVStack
        align="stretch"
        gap={0}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        padding={6}
        maxWidth="68ch"
      >
        <PMText as="div" fontWeight="medium">
          Nothing has been distributed yet.
        </PMText>
        <PMText as="div" color="secondary" paddingTop={1}>
          This page lists the repositories and marketplaces that receive your
          plugins, and it fills itself: a destination appears the first time a
          plugin lands in it. Distribution is started from the plugin, in
          Context.
        </PMText>
        <PMBox paddingTop={4}>
          <PMButton variant="primary" size="sm" onClick={onGoToContext}>
            Go to Context
          </PMButton>
        </PMBox>
      </PMVStack>
    </PMBox>
  );
}
