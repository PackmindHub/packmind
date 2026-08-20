import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuFolderGit2, LuRotateCw, LuSearch, LuStore } from 'react-icons/lu';

import { actionableBehind, searchDestinations } from '../data';
import type { Destination, DestinationMatch } from '../data';
import type { PluginSummary } from '../types';
import {
  behindLead,
  HealthDot,
  Highlight,
  MetaLine,
  RowIcon,
} from './RailPrimitives';

/** Past this, the row would out-scroll the destination it belongs to. */
const MAX_SHOWN_MATCHES = 3;

const SECTIONS: Array<{
  kind: Destination['kind'];
  title: string;
  description: string;
}> = [
  {
    kind: 'repository',
    title: 'Repositories',
    description: 'A branch, and a directory inside it.',
  },
  {
    kind: 'marketplace',
    title: 'Marketplaces',
    description: 'Catalogs this space publishes to.',
  },
];

/**
 * The same rail as the plugin one, turned around. It is worth stating why they
 * are two components rather than one generic list: the plugin rail is entered
 * with a name in mind and offers to create, this one is entered because a
 * number in the sidebar said something is behind and offers nothing to create,
 * since Packmind does not make repositories. Sharing the shell would have made
 * both of those conditional.
 */
export function DestinationRail({
  destinations,
  selectedDestinationId,
  query,
  bulkSelected,
  onQueryChange,
  onSelect,
  onToggleBulk,
  onSetBulkSelection,
  onDistributeBulk,
}: Readonly<{
  destinations: Destination[];
  selectedDestinationId: string | null;
  query: string;
  /**
   * Held by the surface: a redistribution empties it, and the surface is what
   * knows a redistribution happened.
   */
  bulkSelected: Set<string>;
  onQueryChange: (query: string) => void;
  /** `pluginId` is set when the row that was clicked is a search hit inside. */
  onSelect: (destinationId: string, pluginId?: string) => void;
  onToggleBulk: (destinationId: string) => void;
  onSetBulkSelection: (next: Set<string>) => void;
  onDistributeBulk: () => void;
}>) {
  const needle = query.trim().toLowerCase();

  /*
   * Same pinning rule as the plugin rail: the destination on screen stays
   * reachable while a search runs, whether or not the query reached it, and
   * `found` keeps counting real hits so a pin is never mistaken for a result.
   */
  const { rows, found } = useMemo(() => {
    const results = searchDestinations(destinations, query);
    if (!needle || !selectedDestinationId)
      return { rows: results, found: results };

    const index = results.findIndex(
      (match) => match.destination.id === selectedDestinationId,
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

    const selected = destinations.find(
      (destination) => destination.id === selectedDestinationId,
    );
    return {
      rows: selected
        ? [{ destination: selected, plugins: [] }, ...results]
        : results,
      found: results,
    };
  }, [destinations, query, needle, selectedDestinationId]);

  /**
   * The rows a bulk action could act on, and the ones currently picked. Both
   * are derived from what the search left on screen rather than from the raw
   * set, so "select all" never picks up a destination the user cannot see, and
   * a stale id left by a scenario switch counts as nothing.
   */
  const { actionableRows, pickedRows, pickedLandings } = useMemo(() => {
    const actionable = rows
      .map((match) => match.destination)
      .filter((destination) => actionableBehind(destination) > 0);
    const picked = actionable.filter((destination) =>
      bulkSelected.has(destination.id),
    );
    return {
      actionableRows: actionable,
      pickedRows: picked,
      pickedLandings: picked.reduce(
        (total, destination) => total + actionableBehind(destination),
        0,
      ),
    };
  }, [rows, bulkSelected]);

  const selectAllVisible = () =>
    onSetBulkSelection(
      new Set([
        ...bulkSelected,
        ...actionableRows.map((destination) => destination.id),
      ]),
    );

  const clearVisible = () => {
    const next = new Set(bulkSelected);
    for (const destination of actionableRows) next.delete(destination.id);
    onSetBulkSelection(next);
  };

  return (
    <PMBox
      // The same 344px as the plugin rail. Two navigation entries whose master
      // column changes width read as two applications.
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
             * Plugins are in the list because nobody remembers a branch name.
             * They remember what they shipped, and want to know where it landed.
             */
            placeholder="Search repos, marketplaces and plugins"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            aria-label="Search repositories, marketplaces and plugins"
          />
        </PMBox>
      </PMBox>

      <PMBox flex={1} minH={0} overflowY="auto">
        {SECTIONS.map((section) => {
          const sectionRows = rows.filter(
            (match) => match.destination.kind === section.kind,
          );
          if (sectionRows.length === 0) return null;

          return (
            <PMBox key={section.kind}>
              <SectionHeader
                title={section.title}
                description={section.description}
                count={sectionRows.length}
              />
              <PMVStack gap={0} align="stretch">
                {sectionRows.map((match) => (
                  <DestinationRow
                    key={match.destination.id}
                    match={match}
                    needle={needle}
                    isActive={match.destination.id === selectedDestinationId}
                    isPicked={bulkSelected.has(match.destination.id)}
                    isSelecting={pickedRows.length > 0}
                    onSelect={onSelect}
                    onToggleBulk={() => onToggleBulk(match.destination.id)}
                  />
                ))}
              </PMVStack>
            </PMBox>
          );
        })}

        {needle && found.length === 0 && (
          <PMBox padding={4}>
            <PMText as="div" fontSize="sm" color="secondary">
              Nothing matches “{query}”.
            </PMText>
            <PMText as="div" fontSize="xs" color="faded" paddingTop={1}>
              The search covers repositories, marketplaces and the plugins that
              land in them.
            </PMText>
          </PMBox>
        )}
      </PMBox>

      <RailActionBar
        actionableCount={actionableRows.length}
        pickedCount={pickedRows.length}
        pickedLandings={pickedLandings}
        onSelectAllVisible={selectAllVisible}
        onClearVisible={clearVisible}
        onClearAll={() => onSetBulkSelection(new Set())}
        onDistribute={onDistributeBulk}
      />
    </PMBox>
  );
}

/**
 * Pinned under the list, as on the current Overview's repository rail. It is
 * the middle instrument between the two that already existed: the header fixes
 * everything, the destination pane fixes one, this fixes the eight repositories
 * a release actually touches.
 */
function RailActionBar({
  actionableCount,
  pickedCount,
  pickedLandings,
  onSelectAllVisible,
  onClearVisible,
  onClearAll,
  onDistribute,
}: Readonly<{
  actionableCount: number;
  pickedCount: number;
  pickedLandings: number;
  onSelectAllVisible: () => void;
  onClearVisible: () => void;
  onClearAll: () => void;
  onDistribute: () => void;
}>) {
  if (pickedCount === 0 && actionableCount === 0) return null;

  if (pickedCount === 0) {
    return (
      <PMBox
        paddingX={3}
        paddingY="10px"
        borderTopWidth="1px"
        borderColor="border.tertiary"
        flexShrink={0}
      >
        {/*
          "behind", not "drifted": failed landings are picked up too, and this
          list has already told the user those two words are not the same.
        */}
        <PMButton
          variant="secondary"
          size="sm"
          width="full"
          onClick={onSelectAllVisible}
        >
          Select all behind ({actionableCount})
        </PMButton>
      </PMBox>
    );
  }

  const allPicked = pickedCount === actionableCount;

  return (
    <PMBox
      paddingX={3}
      paddingY={3}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
      flexShrink={0}
    >
      <PMVStack gap="10px" align="stretch">
        <PMHStack gap={2} align="center" minW={0}>
          <PMCheckbox
            size="sm"
            checked={allPicked ? true : 'indeterminate'}
            onCheckedChange={(details: { checked: boolean | string }) => {
              if (details.checked === true) onSelectAllVisible();
              else onClearVisible();
            }}
            aria-label="Select every destination behind in this list"
          />
          {/*
            Two numbers because they answer two questions: how much of the list
            is picked, and how much work that is. A release touching three
            repositories can still be twenty landings.
          */}
          <PMText
            fontSize="xs"
            color="secondary"
            fontVariantNumeric="tabular-nums"
            truncate
            flex={1}
            minW={0}
          >
            {pickedCount} selected · {pickedLandings} distribution
            {pickedLandings === 1 ? '' : 's'}
          </PMText>
        </PMHStack>
        <PMHStack gap={2} justify="space-between" align="center">
          <PMBox
            as="button"
            onClick={onClearAll}
            fontSize="xs"
            color="text.faded"
            bg="transparent"
            border="none"
            padding={0}
            cursor="pointer"
            _hover={{ color: 'text.primary' }}
          >
            Clear
          </PMBox>
          <PMButton variant="primary" size="sm" onClick={onDistribute}>
            <PMIcon fontSize="sm">
              <LuRotateCw />
            </PMIcon>
            Distribute
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: Readonly<{ title: string; description: string; count: number }>) {
  return (
    <PMBox
      paddingX={3}
      paddingY={2}
      bg="background.secondary"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      position="sticky"
      top={0}
      zIndex={1}
    >
      <PMHStack gap={2} align="baseline">
        <PMText
          fontSize="10px"
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="wider"
          color="faded"
        >
          {title}
        </PMText>
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          {count}
        </PMText>
        <PMText fontSize="2xs" color="faded" truncate>
          {description}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}

function DestinationRow({
  match,
  needle,
  isActive,
  isPicked,
  isSelecting,
  onSelect,
  onToggleBulk,
}: Readonly<{
  match: DestinationMatch;
  needle: string;
  isActive: boolean;
  isPicked: boolean;
  /** True while a bulk selection is in progress anywhere in the list. */
  isSelecting: boolean;
  onSelect: (destinationId: string, pluginId?: string) => void;
  onToggleBulk: () => void;
}>) {
  const { destination } = match;
  const pluginCount = destination.links.length;
  const shown = match.plugins.slice(0, MAX_SHOWN_MATCHES);
  const hidden = match.plugins.length - shown.length;
  const [isHovered, setIsHovered] = useState(false);

  /*
   * Only where a redistribution would move something: a destination that is
   * up to date, or whose only drift is locked by a running job, cannot be
   * picked for an action that would do nothing to it. The box then reveals
   * itself on hover and stays out while nothing is being selected, so a list
   * read for information does not look like a list waiting for a decision.
   */
  const canBePicked = actionableBehind(destination) > 0;
  const showCheckbox = canBePicked && (isPicked || isSelecting || isHovered);

  return (
    <PMBox
      maxWidth="100%"
      overflow="hidden"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={isActive ? 'background.secondary' : 'transparent'}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/*
        Tighter than the plugin rail's row on purpose: the checkbox column costs
        24px the other rail does not spend, and the longest repository name is
        worth more than the padding around a control that is invisible most of
        the time.
      */}
      <PMHStack
        gap="6px"
        align="center"
        paddingLeft="6px"
        _hover={isActive ? undefined : { bg: 'background.secondary' }}
        transition="background-color 150ms ease-out"
      >
        {/*
          Outside the button on purpose: a checkbox nested in a button is
          neither valid nor operable with a keyboard.
        */}
        <PMBox
          width="16px"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {showCheckbox && (
            <PMCheckbox
              size="sm"
              checked={isPicked}
              onCheckedChange={onToggleBulk}
              aria-label={`Select ${destination.name} for bulk distribution`}
            />
          )}
        </PMBox>

        <PMBox
          as="button"
          display="flex"
          alignItems="center"
          gap={2}
          flex={1}
          minW={0}
          textAlign="left"
          paddingRight={2}
          paddingY="10px"
          cursor="pointer"
          onClick={() => onSelect(destination.id)}
        >
          {/* On the name, the one rule both rails follow. */}
          <RowIcon color={isActive ? 'text.secondary' : 'text.faded'}>
            {destination.kind === 'repository' ? <LuFolderGit2 /> : <LuStore />}
          </RowIcon>
          <PMBox flex={1} minW={0}>
            <PMBox
              as="div"
              fontSize="sm"
              fontWeight={isActive ? 'semibold' : 'medium'}
              color={isActive ? 'text.primary' : 'text.secondary'}
              truncate
            >
              <Highlight text={destination.name} needle={needle} />
            </PMBox>
            {/*
            The branch and the directory are identity, not decoration: the same
            repository on two branches is two rows, and without them they would
            be one row twice. They sit on the second line all the same, because
            beside the name they took the width the name needed and five of
            sixteen repositories lost their last word to a qualifier. The name
            is what the eye scans; a qualifier may fall off the end of a line
            that the detail pane restates in full.
          */}
            {/*
              Health belongs on this rail, unlike the plugin one: the list is
              sorted by it, so the row has to show what put it where it is. It
              reads at the head of the meta line rather than in a column of its
              own, because that column cost 72px to the one thing nobody should
              have to guess at, the name of the repository.
            */}
            <MetaLine
              lead={behindLead(destination.behind, destination.failed)}
              parts={[
                destination.branch ?? false,
                destination.directory ?? false,
                `${pluginCount} plugin${pluginCount === 1 ? '' : 's'}`,
              ]}
            />
          </PMBox>
          <HealthDot behind={destination.behind} failed={destination.failed} />
        </PMBox>
      </PMHStack>

      {shown.length > 0 && (
        <PMVStack
          gap={0}
          align="stretch"
          paddingLeft={2}
          paddingRight={2}
          paddingBottom={2}
        >
          {shown.map((plugin) => (
            <PluginMatchRow
              key={plugin.id}
              plugin={plugin}
              destination={destination}
              needle={needle}
              onClick={() => onSelect(destination.id, plugin.id)}
            />
          ))}
          {hidden > 0 && (
            <PMText fontSize="2xs" color="faded" paddingLeft={2} paddingTop={1}>
              +{hidden} more landing here
            </PMText>
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}

/**
 * A plugin the query found, shown under the destination it landed in, with the
 * state it has *there*. The same plugin can be a green row under one repository
 * and an orange one under the next, which is the whole reason this index exists.
 */
function PluginMatchRow({
  plugin,
  destination,
  needle,
  onClick,
}: Readonly<{
  plugin: PluginSummary;
  destination: Destination;
  needle: string;
  onClick: () => void;
}>) {
  const link = destination.links.find((l) => l.plugin.id === plugin.id);
  const state = link?.target.state ?? 'aligned';

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
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          flexShrink={0}
          bg={STATE_COLOR[state]}
          aria-hidden
        />
        <PMBox
          as="span"
          flex={1}
          minW={0}
          truncate
          fontSize="xs"
          color="text.secondary"
        >
          <Highlight text={plugin.name} needle={needle} />
        </PMBox>
        <PMText fontSize="2xs" color="faded" whiteSpace="nowrap">
          {STATE_LABEL[state]}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}

const STATE_COLOR: Record<string, string> = {
  aligned: 'green.500',
  drift: 'orange.500',
  failed: 'red.500',
};

const STATE_LABEL: Record<string, string> = {
  aligned: 'up to date',
  drift: 'behind',
  failed: 'failed',
};
