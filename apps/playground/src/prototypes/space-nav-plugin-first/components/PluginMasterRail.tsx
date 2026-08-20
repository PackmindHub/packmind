import { useMemo } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuLayers, LuPackage, LuPlus, LuSearch } from 'react-icons/lu';

import {
  descriptorFor,
  distributionSummary,
  searchPlugins,
  visibleComponents,
} from '../data';
import type { Component, PluginSummary, TypeHorizon } from '../types';
import { HealthDot, Highlight, MetaLine, RowIcon } from './RailPrimitives';

/** Past this, the row would out-scroll the plugin it belongs to. */
const MAX_SHOWN_MATCHES = 3;

export function PluginMasterRail({
  plugins,
  horizon,
  selectedPluginId,
  showingAll,
  canShowAll,
  query,
  onQueryChange,
  onSelect,
  onShowAll,
  onOpenComponent,
  onCreatePlugin,
}: Readonly<{
  plugins: PluginSummary[];
  horizon: TypeHorizon;
  selectedPluginId: string | null;
  /** The space-wide inventory is open, so no plugin row is the selected one. */
  showingAll: boolean;
  /** Decided by the surface, see there. */
  canShowAll: boolean;
  /**
   * Held by the surface, not here: opening a skill swaps this rail for the file
   * tree, and a search that dies on the way to its own result is worse than no
   * search. Coming back finds the list where it was left.
   */
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (id: string) => void;
  onShowAll: () => void;
  onOpenComponent: (pluginId: string, componentId: string) => void;
  onCreatePlugin: () => void;
}>) {
  const needle = query.trim().toLowerCase();

  const totalComponents = useMemo(
    () =>
      plugins.reduce(
        (total, plugin) => total + visibleComponents(plugin, horizon).length,
        0,
      ),
    [plugins, horizon],
  );

  /**
   * While a search is running, the plugin on screen sits first, whether or not
   * the query reached it. Filtering it out of the rail while the pane keeps
   * showing it leaves the user with no way back to where they were, and hoisting
   * it costs one row.
   *
   * `found` stays the count of real hits, so a pinned row can never be mistaken
   * for a result: a search that finds nothing still says so, under the pin.
   */
  const { rows, found } = useMemo(() => {
    const results = searchPlugins(plugins, horizon, query);
    if (!needle || !selectedPluginId) return { rows: results, found: results };

    const index = results.findIndex(
      (match) => match.plugin.id === selectedPluginId,
    );
    if (index === 0) return { rows: results, found: results };
    if (index > 0) {
      return {
        rows: [
          results[index],
          ...results.slice(0, index),
          ...results.slice(index + 1),
        ],
        found: results,
      };
    }

    const selected = plugins.find((plugin) => plugin.id === selectedPluginId);
    return {
      rows: selected
        ? [{ plugin: selected, components: [] }, ...results]
        : results,
      found: results,
    };
  }, [plugins, horizon, query, needle, selectedPluginId]);

  return (
    <PMBox
      // 344px, not 288: the widest meta line a plugin can produce is
      // "12 components · 14 repos · 2 marketplaces", 267px of it, and it has to
      // fit whole. A row gives up 24px of padding, 15px of scrollbar and 24px
      // to the icon it now hangs beside, which leaves 281. A rail that clips
      // its own counts is worse than a rail a notch wider.
      width="344px"
      flexShrink={0}
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      <PMBox
        paddingX={3}
        paddingY={3}
        borderBottomWidth="1px"
        borderColor="border.tertiary"
      >
        <PMBox position="relative" minW={0}>
          <PMBox
            position="absolute"
            left="8px"
            top="50%"
            transform="translateY(-50%)"
            pointerEvents="none"
            display="flex"
            // PMInput is itself positioned and opaque, and it comes after this
            // box in the DOM, so without a layer of its own the magnifier is
            // painted over and the field looks like it lost its icon.
            zIndex={1}
          >
            <PMIcon fontSize="xs" color="text.faded">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            size="sm"
            paddingLeft="28px"
            /*
             * Not "Search 12 plugins". The count answered a question nobody
             * asks and left the real one open: does this look inside a
             * plugin? It does, so the placeholder names both levels.
             */
            placeholder="Search plugins and components"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search plugins and components"
          />
        </PMBox>
      </PMBox>

      <PMBox flex={1} minH={0} overflowY="auto">
        {/*
          Deliberately not a plugin row: half the height, no crate, faded until
          it is the one selected. The plugin is the unit this space is organised
          around and the rail has to keep saying so; this is the way out for the
          moment when you know what you are looking for but not who carries it.
          It sits above the list rather than in the sidebar because it is a way
          of reading Context, not a fourth place to be — a nav entry per
          arrangement is how the seven per-type entries happened.
        */}
        {canShowAll && (
          <AllComponentsRow
            count={totalComponents}
            isActive={showingAll}
            onClick={onShowAll}
          />
        )}

        <PMVStack gap={0} align="stretch">
          {rows.map((match) => (
            <PluginRow
              key={match.plugin.id}
              plugin={match.plugin}
              matchedComponents={match.components}
              needle={needle}
              horizon={horizon}
              isActive={!showingAll && match.plugin.id === selectedPluginId}
              onClick={() => onSelect(match.plugin.id)}
              onOpenComponent={(componentId) =>
                onOpenComponent(match.plugin.id, componentId)
              }
            />
          ))}
        </PMVStack>

        {needle && found.length === 0 && (
          <PMBox padding={4}>
            <PMText as="div" fontSize="sm" color="secondary">
              Nothing matches “{query}”.
            </PMText>
            <PMText as="div" fontSize="xs" color="faded" paddingTop={1}>
              The search covers plugin names and the components inside them.
            </PMText>
          </PMBox>
        )}
      </PMBox>

      {/*
        Same geometry as the destination rail's action bar at rest — top border,
        10px band, one full-width secondary button — so the two rails of the same
        sidebar have one anatomy: search on top, the list in the middle, the
        action pinned under it.

        It used to sit in the header, under the search. That gave the most
        valuable strip of the rail, the one the eye lands on next, to the rarest
        thing a user does here: a plugin is created a handful of times, a plugin
        is opened all day. The objection that put it up there — with 25 plugins
        an action at the end of the list is an action nobody finds — was about a
        button inside the scroll. Pinned, it never scrolls away.

        A bare "+" beside the search said nothing about what it made, on a screen
        where the pane already offers a "New" that makes a component. The label
        is the fix; the full width is what it buys.

        Secondary, not primary: two filled buttons facing each other cancel out,
        and the first plugin of a space is asked for by the empty state, which
        carries the primary.
      */}
      <PMBox
        paddingX={3}
        paddingY="10px"
        borderTopWidth="1px"
        borderColor="border.tertiary"
        flexShrink={0}
      >
        <PMButton
          variant="secondary"
          size="sm"
          width="full"
          onClick={onCreatePlugin}
        >
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          New plugin
        </PMButton>
      </PMBox>
    </PMBox>
  );
}

function AllComponentsRow({
  count,
  isActive,
  onClick,
}: Readonly<{ count: number; isActive: boolean; onClick: () => void }>) {
  return (
    <PMBox
      as="button"
      display="flex"
      alignItems="center"
      gap={2}
      width="full"
      textAlign="left"
      paddingX={3}
      paddingY="7px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      cursor="pointer"
      bg={isActive ? 'background.secondary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.faded'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
    >
      <PMIcon fontSize="xs" flexShrink={0}>
        <LuLayers />
      </PMIcon>
      <PMBox as="span" flex={1} minW={0} fontSize="xs" truncate>
        All components
      </PMBox>
      <PMBox as="span" fontSize="xs" fontVariantNumeric="tabular-nums">
        {count}
      </PMBox>
    </PMBox>
  );
}

function PluginRow({
  plugin,
  matchedComponents,
  needle,
  horizon,
  isActive,
  onClick,
  onOpenComponent,
}: Readonly<{
  plugin: PluginSummary;
  matchedComponents: Component[];
  needle: string;
  horizon: TypeHorizon;
  isActive: boolean;
  onClick: () => void;
  onOpenComponent: (componentId: string) => void;
}>) {
  const componentCount = visibleComponents(plugin, horizon).length;
  const summary = distributionSummary(plugin);
  const shown = matchedComponents.slice(0, MAX_SHOWN_MATCHES);
  const hidden = matchedComponents.length - shown.length;

  return (
    <PMBox
      maxWidth="100%"
      overflow="hidden"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={isActive ? 'background.secondary' : 'transparent'}
    >
      {/*
        The plugin and its matched components are separate buttons: clicking the
        name opens the plugin, clicking a match opens that component. One button
        wrapping both would force the user through the plugin to reach what they
        were actually searching for.
      */}
      <PMBox
        as="button"
        display="flex"
        alignItems="center"
        gap={2}
        width="full"
        textAlign="left"
        paddingX={3}
        paddingY="10px"
        cursor="pointer"
        _hover={isActive ? undefined : { bg: 'background.secondary' }}
        transition="background-color 150ms ease-out"
        onClick={onClick}
      >
        {/*
          The crate, the same one the sidebar keeps for the container: a plugin
          is what ships, its components are what it carries. Every component row
          under it already wears the icon of its type, so a plugin with no icon
          read as a heading rather than as the object it is.
        */}
        <RowIcon color={isActive ? 'text.secondary' : 'text.faded'}>
          <LuPackage />
        </RowIcon>
        <PMBox flex={1} minW={0}>
          <PMBox
            as="div"
            fontSize="sm"
            fontWeight={isActive ? 'semibold' : 'medium'}
            color={isActive ? 'text.primary' : 'text.secondary'}
            truncate
          >
            <Highlight text={plugin.name} needle={needle} />
          </PMBox>
          {/*
            Reach only. A zero states nothing worth reading, and neither does a
            count of what is behind: the mark at the end of the name already
            says a plugin needs attention, and how much is a question asked
            once the row is open, not while running an eye down twenty-five of
            them. Keeping both spent the line's last words on a number nobody
            reads at that moment — `12 components · 9 repos · 2 marketplaces`
            fits whole again.
          */}
          <MetaLine
            parts={[
              `${componentCount} component${componentCount === 1 ? '' : 's'}`,
              summary.repositories > 0 &&
                `${summary.repositories} repo${summary.repositories === 1 ? '' : 's'}`,
              summary.marketplaces > 0 &&
                `${summary.marketplaces} marketplace${summary.marketplaces === 1 ? '' : 's'}`,
            ]}
          />
        </PMBox>
        {/*
          The one health signal this rail carries, and only on the rows that
          have something to signal. A plugin drifts in places, not in itself, so
          resolving it stays in Distribution where the destinations are; but a
          rail that says nothing about it makes the author of a plugin walk to
          another screen to learn that their own work has not landed. The mark
          draws the eye and carries the count on hover; how much and where are
          the plugin's Distribution tab, one click away.
        */}
        <HealthDot
          behind={summary.behind}
          failed={summary.failed}
          clear="hide"
        />
      </PMBox>

      {shown.length > 0 && (
        <PMVStack
          gap={0}
          align="stretch"
          paddingLeft={2}
          paddingRight={2}
          paddingBottom={2}
        >
          {shown.map((component) => (
            <ComponentMatchRow
              key={component.id}
              component={component}
              needle={needle}
              onClick={() => onOpenComponent(component.id)}
            />
          ))}
          {hidden > 0 && (
            <PMText fontSize="2xs" color="faded" paddingLeft={2} paddingTop={1}>
              +{hidden} more inside this plugin
            </PMText>
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}

function ComponentMatchRow({
  component,
  needle,
  onClick,
}: Readonly<{
  component: Component;
  needle: string;
  onClick: () => void;
}>) {
  const descriptor = descriptorFor(component.type);
  const nameMatches = component.name.toLowerCase().includes(needle);

  return (
    <PMBox
      as="button"
      display="block"
      width="full"
      maxWidth="100%"
      overflow="hidden"
      textAlign="left"
      paddingX={2}
      paddingY="4px"
      borderRadius="sm"
      cursor="pointer"
      _hover={{ bg: 'background.tertiary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
    >
      <PMHStack gap={2} minW={0} align="center">
        <RowIcon fontSize="xs">{descriptor.icon}</RowIcon>
        <PMBox flex={1} minW={0}>
          <PMHStack gap={2} minW={0}>
            <PMBox
              as="span"
              flex={1}
              minW={0}
              truncate
              fontSize="xs"
              color="text.secondary"
            >
              <Highlight
                text={component.name}
                needle={nameMatches ? needle : ''}
              />
            </PMBox>
            <PMText fontSize="2xs" color="faded" whiteSpace="nowrap">
              {descriptor.labelSingular}
            </PMText>
          </PMHStack>
          {/*
            The name is not always where the hit landed. When it came from the
            summary, the row has to show that line, or it reads as an
            unexplained result. The icon stays on the name either way, the same
            rule the plugin above it follows.
          */}
          {!nameMatches && (
            <PMBox
              as="div"
              paddingTop="1px"
              fontSize="2xs"
              color="text.faded"
              truncate
            >
              <Highlight text={component.summary} needle={needle} />
            </PMBox>
          )}
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}
