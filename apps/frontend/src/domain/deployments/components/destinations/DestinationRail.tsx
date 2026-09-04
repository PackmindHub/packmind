import { useMemo, useState, type ReactNode } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import { LuFolderGit2, LuRotateCw, LuSearch, LuStore } from 'react-icons/lu';
import type { GitProviderId } from '@packmind/types';
import {
  repositoryDriftedPackageCount,
  repositoryPackageCount,
  repositoryLockProfile,
} from '../redesign/selectors/buildRepositoryDriftOverview';
import {
  destinationDriftStatus,
  isBatchDistributable,
  searchDestinations,
  type Destination,
  type DestinationMatch,
  type DriftStatus,
  type ReachSummary,
} from './buildSpaceDestinations';

/** Past this, one destination's matches would out-scroll the list they sit in. */
const MAX_SHOWN_MATCHES = 3;

const SECTIONS: ReadonlyArray<{
  kind: Destination['kind'];
  title: string;
  description: string;
}> = [
  {
    kind: 'repository',
    title: 'Repositories',
    description: 'Where the coding agents read from.',
  },
  {
    kind: 'marketplace',
    title: 'Marketplaces',
    description: 'Catalogs this space distributes to.',
  },
];

/**
 * The destinations of a space, as the index of the Distribution surface.
 *
 * The mirror of the Context rail: that one lists what the space owns, this one
 * lists where it landed. They are two components rather than one generic list
 * because they are entered for opposite reasons — Context with a name in mind
 * and an offer to create, this one because a number said something is behind
 * and with nothing to create, since Packmind does not make repositories.
 *
 * The two kinds are sectioned rather than interleaved. A repository is
 * redistributed to and a marketplace is republished to, so the batch at the
 * bottom applies to one section and not the other, and a mixed list would put
 * a checkbox on rows the button cannot act on.
 */
export function DestinationRail({
  destinations,
  summary,
  selectedDestinationId,
  bulkSelected,
  providersWithToken,
  isProvidersLoading,
  onSelect,
  onToggleBulk,
  onSetBulkSelection,
  onDistributeBulk,
}: Readonly<{
  destinations: readonly Destination[];
  /**
   * What the whole space reaches, for the line under the search field. Handed
   * down rather than counted here, because it is the same summary the sidebar
   * badge is built from: a rail that counted its own would be a second answer
   * to the question the badge asked, free to disagree with it.
   */
  summary: ReachSummary;
  selectedDestinationId: string | null;
  bulkSelected: Set<string>;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onSelect: (destinationId: string) => void;
  onToggleBulk: (destinationId: string) => void;
  onSetBulkSelection: (next: Set<string>) => void;
  /**
   * The ids to distribute, passed rather than read from `bulkSelected` by the
   * caller: the one-click batch below selects and distributes in the same
   * gesture, and the state it just set is not readable in that tick.
   */
  onDistributeBulk: (destinationIds: Set<string>) => void;
}>) {
  const [query, setQuery] = useState('');
  /*
   * Which states to look at, empty for all of them. Local, and a step weaker
   * than the query beside it: this is a lens somebody turned on for a minute,
   * and the band above the list says so while it is on. The same reasoning the
   * Context rail gives for its own drift filter.
   *
   * A set of statuses and not a boolean, because behind and failed are two
   * different mornings: one is a redistribution nobody has run yet, the other is
   * a distribution that ran and did not land, and the second may not be
   * repairable from here at all. The filter that could not tell them apart made
   * the smaller and worse pile the harder one to reach.
   */
  const [statuses, setStatuses] = useState<ReadonlySet<DriftStatus>>(
    () => new Set(),
  );

  const { rows, needle } = useMemo(
    () => searchDestinations(destinations, query),
    [destinations, query],
  );

  /*
   * A lens switches itself off when there is nothing left under it, rather than
   * leaving an empty list behind the moment the last destination in that state
   * is put right. Per status now: distributing the drifted rows while filtered
   * to `failed` used to leave the whole filter standing, because something
   * somewhere was still behind.
   */
  const active = useMemo(
    () =>
      new Set(
        [...statuses].filter((status) =>
          status === 'failed'
            ? summary.failedDestinations > 0
            : summary.behindDestinations > 0,
        ),
      ),
    [statuses, summary.behindDestinations, summary.failedDestinations],
  );
  const filtering = active.size > 0;
  /*
   * The open destination survives the filter whether or not it matches: a rail
   * that drops the row the pane is showing leaves the reader looking at a
   * destination the list says does not exist, with nothing to click to get back
   * to it. It costs one row, and the row says why it is there.
   */
  const matchesStatus = (destination: Destination) => {
    const status = destinationDriftStatus(destination);
    return status !== 'aligned' && active.has(status);
  };
  const shownRows = filtering
    ? rows.filter(
        (row) =>
          matchesStatus(row.destination) ||
          row.destination.id === selectedDestinationId,
      )
    : rows;
  /** Nothing the query reached is in these states, which the list cannot say. */
  const noStatusMatch =
    filtering &&
    needle !== '' &&
    rows.length > 0 &&
    shownRows.every((row) => !matchesStatus(row.destination));

  /*
   * The batch acts on what the user can see. Selecting "all drifted" while a
   * query hides half of them would send distributions the list on screen never
   * offered.
   */
  const actionable = useMemo(
    () => shownRows.map((row) => row.destination).filter(isBatchDistributable),
    [shownRows],
  );
  const pickedCount = bulkSelected.size;
  /*
   * Split by kind, because `behind` counts a different thing on each:
   * distributions on a repository, drifted plugins on a marketplace. Added up
   * under one word the bar would have offered "5 distributions" over a pick of
   * three of them and two plugins.
   */
  const picked = useMemo(() => {
    let distributions = 0;
    let plugins = 0;
    for (const destination of destinations) {
      if (!bulkSelected.has(destination.id)) continue;
      if (destination.kind === 'repository')
        distributions += destination.behind;
      else plugins += destination.behind;
    }
    return { distributions, plugins };
  }, [destinations, bulkSelected]);
  const actionableSelectedCount = actionable.filter((destination) =>
    bulkSelected.has(destination.id),
  ).length;

  const selectAllVisible = () => {
    const next = new Set(bulkSelected);
    for (const destination of actionable) next.add(destination.id);
    onSetBulkSelection(next);
  };
  const clearVisible = () => {
    const next = new Set(bulkSelected);
    for (const destination of actionable) next.delete(destination.id);
    onSetBulkSelection(next);
  };

  return (
    <PMBox
      // 320px, the width of the Context rail: the two rails index different
      // things, but a sidebar that changes width when the user moves between
      // them reads as two applications.
      width="320px"
      flexShrink={0}
      bg="background.primary"
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
        flexShrink={0}
      >
        <PMBox position="relative" minW={0}>
          <PMBox
            position="absolute"
            left="10px"
            top="50%"
            transform="translateY(-50%)"
            // The step the placeholder beside it uses, since PMInput's own was
            // raised. Left at `text.faded` the magnifier read as dimmer than
            // the words it labels.
            color="text.tertiary"
            pointerEvents="none"
            display="flex"
            alignItems="center"
            // PMInput is itself positioned and opaque, and it comes after this
            // box in the DOM, so without a layer of its own the magnifier is
            // painted over and the field looks like it lost its icon.
            zIndex={1}
          >
            <PMIcon fontSize="sm">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            size="sm"
            paddingLeft="32px"
            /*
             * Packages are named in the placeholder because they are in the
             * index: nobody remembers a branch name, and "where did Backend
             * land" is what this rail is opened to answer.
             */
            placeholder="Search destinations and packages"
            aria-label="Search destinations and packages"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </PMBox>

        {/*
          The space-level line, under the field for the reason the Context rail
          gives about its own: the field narrows the same list, so a rail with
          its two filters in two places is a rail that hides one of them. And
          the band it sits in does not scroll, so the one thing on screen saying
          rows are missing cannot be scrolled out of sight.

          This is where the page heading used to be. A title above the surface
          said "Distribution", which the sidebar already had highlighted, and
          cost the rail and the pane a sixth of a laptop window before their
          first row. The sentence that was worth keeping is this one, and it
          belongs against the list it counts.
        */}
        <ReachRow
          summary={summary}
          active={active}
          onToggle={(status) =>
            setStatuses((previous) => {
              const next = new Set(previous);
              if (next.has(status)) next.delete(status);
              else next.add(status);
              return next;
            })
          }
          onClear={() => setStatuses(new Set())}
        />
      </PMBox>

      <PMBox flex={1} minH={0} overflowY="auto">
        {SECTIONS.map((section) => {
          const sectionRows = shownRows.filter(
            (row) => row.destination.kind === section.kind,
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
                {sectionRows.map((row) => (
                  <DestinationRow
                    key={row.destination.id}
                    row={row}
                    needle={needle}
                    isActive={row.destination.id === selectedDestinationId}
                    isPinnedOpen={filtering && !matchesStatus(row.destination)}
                    isPicked={bulkSelected.has(row.destination.id)}
                    isSelecting={pickedCount > 0}
                    providersWithToken={providersWithToken}
                    isProvidersLoading={isProvidersLoading}
                    onSelect={() => onSelect(row.destination.id)}
                    onToggleBulk={() => onToggleBulk(row.destination.id)}
                  />
                ))}
              </PMVStack>
            </PMBox>
          );
        })}

        {needle !== '' && rows.length === 0 && <NoMatches query={query} />}
        {noStatusMatch && (
          <NoStatusMatches
            query={query}
            matchCount={rows.length}
            active={active}
          />
        )}
      </PMBox>

      <RailActionBar
        actionableCount={actionable.length}
        actionableSelectedCount={actionableSelectedCount}
        pickedCount={pickedCount}
        pickedDistributions={picked.distributions}
        pickedPlugins={picked.plugins}
        onSelectAllVisible={selectAllVisible}
        onClearVisible={clearVisible}
        onClearAll={() => onSetBulkSelection(new Set())}
        onDistribute={() => onDistributeBulk(bulkSelected)}
        /*
         * Select and distribute in one gesture, which is what the page header
         * used to offer and what a Monday morning actually wants. The ids go
         * with the call because the selection this sets is not readable in the
         * same tick, and they are the visible drifted rows rather than every
         * drifted destination: the batch acting past what the list on screen
         * shows is the one thing this rail promises it will not do.
         */
        onDistributeActionable={() => {
          const ids = new Set(actionable.map((destination) => destination.id));
          onSetBulkSelection(ids);
          onDistributeBulk(ids);
        }}
      />
    </PMBox>
  );
}

/**
 * What the space reaches, and the lenses onto the parts of it that are work.
 *
 * One pill per state a destination can be in, in the same pill the Context rail
 * gives its drift filter and on the same offsets: 10px of padding puts the first
 * mark's box on the magnifier's, and the gap after it puts the label where the
 * placeholder above starts, so the controls of this band share one mark axis and
 * one text axis.
 *
 * Two pills rather than the one this used to be. That one read "3 destinations
 * behind, 1 failed" and filtered to all three, which put the two states in one
 * sentence, in two units — destinations, then distributions — and gave the smaller
 * and worse pile no way to be reached on its own. They are separate now because
 * they are separate work: behind is a distribution nobody has run yet, failed is
 * one that ran and did not land, and only the first is what the button under
 * this list repairs.
 *
 * The word "destinations" goes with them. Two pills carrying it do not fit a
 * 320px rail, and the list underneath is the unit: a number in this band is the
 * number of rows clicking it leaves. The aligned state, which has room, still
 * spells it out, and the labels a screen reader gets say it in full.
 *
 * The one deliberate difference with Context is that this band does not
 * disappear when everything is aligned. Context can afford absence, because a
 * rail with no pill is a space whose copies are all where they were sent and its
 * rows carry no mark to contradict that. Here the number is the reason the
 * screen exists, and it is what the page subtitle used to state: a space that
 * has just been put right should be able to read that in one glance rather than
 * infer it from a missing line. Aligned, it is a sentence and not a button,
 * because there is nothing left to filter to.
 */
function ReachRow({
  summary,
  active,
  onToggle,
  onClear,
}: Readonly<{
  summary: ReachSummary;
  active: ReadonlySet<DriftStatus>;
  onToggle: (status: DriftStatus) => void;
  onClear: () => void;
}>) {
  if (summary.needingWork === 0) {
    const destinationWord = summary.destinations === 1 ? '' : 's';

    return (
      <PMHStack
        gap={2}
        align="center"
        marginTop={2}
        /* The pill's own offsets, so the aligned line does not shift the axis. */
        paddingLeft="10px"
        paddingRight={2}
        paddingY="4px"
      >
        <PMBox
          width="14px"
          flexShrink={0}
          display="flex"
          alignItems="center"
          justifyContent="center"
          aria-hidden
        >
          <PMBox width="8px" height="8px" borderRadius="full" bg="green.500" />
        </PMBox>
        <PMText fontSize="xs" color="secondary" truncate>
          {summary.destinations} destination{destinationWord} on the latest
          version
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMHStack gap={1.5} align="center" marginTop={2} minW={0}>
      {/*
        Drift then Failed, which is the order the pane's own control puts them
        in. Two controls a quarter of a screen apart filtering the same three
        states should not read left to right in opposite directions.

        A pill appears only while it has something to count, where the pane keeps
        a `Failed 0` segment standing. That is the difference the two forms are
        for: a segmented bar with a hole in it is broken, and a loose chip that
        empties the list when clicked is a dead control.
      */}
      {summary.behindDestinations > 0 && (
        <StatusPill
          status="behind"
          count={summary.behindDestinations}
          isActive={active.has('behind')}
          onToggle={() => onToggle('behind')}
          isFirst
        />
      )}
      {summary.failedDestinations > 0 && (
        <StatusPill
          status="failed"
          count={summary.failedDestinations}
          isActive={active.has('failed')}
          onToggle={() => onToggle('failed')}
          isFirst={summary.behindDestinations === 0}
        />
      )}
      {active.size > 0 && (
        /*
          The only thing on screen saying rows are missing, and the way back from
          both pills at once. `tertiary` and not `faded`: the faded step falls
          under 4:1 on the surface an active pill paints, and beside two of them
          it stops being readable as the words of a control.
        */
        <PMBox
          as="button"
          onClick={onClear}
          marginLeft="auto"
          flexShrink={0}
          paddingX={1}
          fontSize="11px"
          color="text.tertiary"
          bg="transparent"
          border="none"
          cursor="pointer"
          whiteSpace="nowrap"
          _hover={{ color: 'text.primary' }}
        >
          Clear filters
        </PMBox>
      )}
    </PMHStack>
  );
}

/**
 * The wording each pill carries, and the mark the rows it selects wear.
 *
 * `Drift` and `Failed` with the count after them, and the orange and red of the
 * dots, are lifted from `PackageFilterControl`: the pane beside this rail
 * filters its own rows by the same three states, and two controls a quarter of a
 * screen apart calling one state two different words is worse than either word
 * is good. `Drift` is now the only word for it anywhere: rows, tooltips and
 * badges say drifted, whatever the destination is and whatever repairs it.
 */
const STATUS_PILL: Readonly<
  Record<
    DriftStatus,
    { label: string; dot: string; sentence: string; reading: string }
  >
> = {
  behind: {
    label: 'Drift',
    dot: 'orange.500',
    sentence: 'drifted',
    reading: 'with something drifted and nothing failed',
  },
  failed: {
    label: 'Failed',
    dot: 'red.500',
    sentence: 'failed',
    reading: 'whose last distribution failed',
  },
};

/**
 * One state, its count, and the lens onto it.
 *
 * The dot is fixed per pill rather than taken from the worst state below it,
 * which is what the single pill had to do and what made it lie: an orange mark
 * heading rows wearing a red one is the same 8px shape meaning two things a few
 * lines apart. Each pill now wears the mark of the rows it selects, so the band
 * and the list say the same thing in the same colour, and a pill keeps its tone
 * whether it is running or not — the mark says what state the destinations are
 * in, not whether the lens is on.
 */
function StatusPill({
  status,
  count,
  isActive,
  onToggle,
  isFirst,
}: Readonly<{
  status: DriftStatus;
  count: number;
  isActive: boolean;
  onToggle: () => void;
  /**
   * Whether this pill leads the row, and so carries the 10px inset that puts its
   * mark under the magnifier's. The one after it does not: two pills both
   * indented would put the second's mark on no axis at all.
   */
  isFirst: boolean;
}>) {
  const { label, dot, reading } = STATUS_PILL[status];

  return (
    <PMBox
      as="button"
      display="flex"
      alignItems="center"
      gap={2}
      minW={0}
      overflow="hidden"
      textAlign="left"
      paddingLeft={isFirst ? '10px' : 2}
      paddingRight={2}
      paddingY="4px"
      borderRadius="sm"
      cursor="pointer"
      /*
       * One tonal step under the field above, not level with it: filled to the
       * field's own step, a control that differs from a text input by eight
       * pixels of height reads as a second, broken text input.
       */
      bg={isActive ? 'background.secondary' : 'transparent'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onToggle}
      aria-pressed={isActive}
      /*
       * The tone is the only place the state is encoded in colour, so the label
       * carries it too and the control still says everything it means with the
       * colour ignored.
       */
      aria-label={`Show only the ${count} destination${count === 1 ? '' : 's'} ${reading}`}
    >
      {/*
        The same dot the rows carry, in a box the width of the magnifier's em: a
        dot is 8px and an icon is 14, and the slot is what lets them sit on one
        axis without the dot growing into a disc.
      */}
      <PMBox
        width="14px"
        flexShrink={0}
        display="flex"
        alignItems="center"
        justifyContent="center"
        aria-hidden
      >
        <PMBox width="8px" height="8px" borderRadius="full" bg={dot} />
      </PMBox>
      {/*
        The accent carries "on", which is what the design system reserves it for
        on an active navigation item, and it is also what stops a filled pill
        from reading as a field: no input in this app has periwinkle text in it.

        The count trails the state and is faded under it, as it is in the pane's
        control: the states are what the eye picks between, the numbers are how
        much of each, and a number leading the chip made the two pills read as
        one broken sentence.
      */}
      <PMBox
        as="span"
        minW={0}
        truncate
        fontSize="xs"
        fontWeight={isActive ? 'medium' : 'normal'}
        color={isActive ? 'branding.primary' : 'text.secondary'}
        fontVariantNumeric="tabular-nums"
      >
        {label}{' '}
        <PMBox
          as="span"
          /*
           * Never the accent, as in the pane's control: the state is what the
           * eye picks between and the number is how much of it. It steps up a
           * tone when the pill is on because `text.faded` falls under 4.5:1 on
           * the surface the active state paints.
           */
          color={isActive ? 'text.tertiary' : 'text.faded'}
        >
          {count}
        </PMBox>
      </PMBox>
    </PMBox>
  );
}

function NoMatches({ query }: Readonly<{ query: string }>) {
  return (
    <PMVStack gap={1} align="start" padding={4}>
      <PMText as="div" fontSize="sm" color="secondary">
        Nothing matches “{query}”.
      </PMText>
      <PMText as="div" fontSize="xs" color="faded">
        The search covers repositories, marketplaces and the packages that land
        in them.
      </PMText>
    </PMVStack>
  );
}

/**
 * The query found destinations and the filter above it hid every one of them,
 * which is a state the list cannot express: an empty list under a search field
 * with text in it reads as "no such destination", and the truth is the opposite.
 *
 * It names the states that are on rather than saying "the filter", because with
 * two pills the reader has to know which of them to click off, and the answer
 * is not always the one they touched last.
 */
function NoStatusMatches({
  query,
  matchCount,
  active,
}: Readonly<{
  query: string;
  matchCount: number;
  active: ReadonlySet<DriftStatus>;
}>) {
  /*
   * Off the record and not off the set, so the sentence reads in the order the
   * pills are laid out rather than in the order they happened to be clicked.
   */
  const states = (Object.keys(STATUS_PILL) as DriftStatus[])
    .filter((status) => active.has(status))
    .map((status) => STATUS_PILL[status].sentence);
  const named = states.length === 2 ? states.join(' or ') : states[0];

  return (
    <PMVStack gap={1} align="start" padding={4}>
      <PMText as="div" fontSize="sm" color="secondary">
        {matchCount} match{matchCount === 1 ? '' : 'es'} for “{query}”, none{' '}
        {named}.
      </PMText>
      <PMText as="div" fontSize="xs" color="faded">
        Clear filters above to see them.
      </PMText>
    </PMVStack>
  );
}

/**
 * The heading of a kind. Sticky, because the list is scrolled looking for a
 * name and a row's kind decides what its numbers mean: "3 to republish" and
 * "3 targets drifted" are not the same unit.
 */
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
  row,
  needle,
  isActive,
  isPinnedOpen,
  isPicked,
  isSelecting,
  providersWithToken,
  isProvidersLoading,
  onSelect,
  onToggleBulk,
}: Readonly<{
  row: DestinationMatch;
  needle: string;
  isActive: boolean;
  /**
   * A status filter is on and this row survived it only because the pane is
   * showing it. It says so on its own second line, so the one row in the list
   * that contradicts the filter is not left looking like a bug in it.
   */
  isPinnedOpen: boolean;
  isPicked: boolean;
  /** A batch is being assembled, so every checkbox that can be shown is. */
  isSelecting: boolean;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  onSelect: () => void;
  onToggleBulk: () => void;
}>) {
  const { destination, matchedPackages } = row;
  const [hovered, setHovered] = useState(false);
  const pickable = isBatchDistributable(destination);
  const showCheckbox = pickable && (isPicked || isSelecting || hovered);
  const state = destinationState(
    destination,
    providersWithToken,
    isProvidersLoading,
  );
  const shown = matchedPackages.slice(0, MAX_SHOWN_MATCHES);
  const hidden = matchedPackages.length - shown.length;

  return (
    <PMBox
      position="relative"
      bg={isActive ? 'background.secondary' : 'transparent'}
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isActive && (
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

      <PMHStack gap={0} align="stretch" paddingLeft={3}>
        {/*
          The column is there whether or not this row has a checkbox, so the
          names of a section stay on one left edge. A row that cannot be picked
          is not a row that should be indented differently.
        */}
        <PMBox
          width="16px"
          flexShrink={0}
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          onClick={(event) => event.stopPropagation()}
        >
          {pickable && (
            <PMBox
              opacity={showCheckbox ? 1 : 0}
              transition="opacity 100ms ease-out"
              display="inline-flex"
              alignItems="center"
            >
              <PMCheckbox
                size="sm"
                checked={isPicked}
                onCheckedChange={() => onToggleBulk()}
                aria-label={`Select ${destination.name} for batch distribution`}
              />
            </PMBox>
          )}
        </PMBox>

        <PMBox
          as="button"
          onClick={onSelect}
          bg="transparent"
          border="none"
          cursor="pointer"
          flex={1}
          minW={0}
          textAlign="left"
          paddingY={2.5}
          paddingLeft={2}
          paddingRight={3}
          _focusVisible={{
            outline: 'none',
            boxShadow: 'inset 0 0 0 2px var(--chakra-colors-branding-primary)',
          }}
          aria-pressed={isActive}
          aria-label={`${
            destination.kind === 'repository' ? 'Repository' : 'Marketplace'
          } ${destination.name}, ${state.line}`}
        >
          <PMHStack gap={2} align="start" justify="space-between">
            <PMIcon
              fontSize="sm"
              color={isActive ? 'text.secondary' : 'text.faded'}
              flexShrink={0}
              alignSelf="flex-start"
              marginTop="0.25em"
            >
              {destination.kind === 'repository' ? (
                <LuFolderGit2 />
              ) : (
                <LuStore />
              )}
            </PMIcon>
            <PMVStack gap="2px" align="start" flex={1} minW={0}>
              <PMText
                fontSize="sm"
                fontWeight={isActive ? 'semibold' : 'medium'}
                color="primary"
                truncate
                maxW="100%"
              >
                {highlight(destination.name, needle)}
              </PMText>
              <PMHStack gap={1.5} align="center" maxW="100%">
                {destination.kind === 'repository' && (
                  <>
                    <PMText
                      fontSize="11px"
                      color="faded"
                      fontVariantNumeric="tabular-nums"
                      truncate
                    >
                      {highlight(destination.branch, needle)}
                    </PMText>
                    <PMBox
                      width="2px"
                      height="2px"
                      borderRadius="full"
                      bg="border.tertiary"
                      aria-hidden
                      flexShrink={0}
                    />
                  </>
                )}
                <PMText fontSize="11px" color={state.tone} truncate>
                  {state.line}
                </PMText>
                {isPinnedOpen && (
                  /*
                    Not "not drifted", which this used to say: filtered to
                    failures, a row that is merely behind is behind, and the
                    note has to contradict the filter rather than the state
                    printed right beside it.
                  */
                  <PMText fontSize="11px" color="faded" whiteSpace="nowrap">
                    · open, filtered out
                  </PMText>
                )}
              </PMHStack>
            </PMVStack>
            <PMTooltip label={state.tooltip} showArrow>
              <PMBox
                width="8px"
                height="8px"
                borderRadius="full"
                bg={state.dot}
                flexShrink={0}
                marginTop="6px"
                role="img"
                aria-label={state.tooltip}
              />
            </PMTooltip>
          </PMHStack>
        </PMBox>
      </PMHStack>

      {shown.length > 0 && (
        <PMVStack gap={0} align="stretch" paddingX={2} paddingBottom={2}>
          {shown.map((name) => (
            /*
             * Selecting the destination rather than the package: the pane lists
             * every package that landed here, this one among them. Focusing it
             * there is the pane's job and it cannot do it yet.
             */
            <PMBox
              key={name}
              as="button"
              onClick={onSelect}
              display="block"
              width="full"
              maxWidth="100%"
              overflow="hidden"
              textAlign="left"
              paddingX={2}
              paddingY="4px"
              borderRadius="sm"
              bg="transparent"
              border="none"
              cursor="pointer"
              _hover={{ bg: 'background.tertiary' }}
              transition="background-color 150ms ease-out"
            >
              <PMText fontSize="xs" color="secondary" truncate>
                {highlight(name, needle)}
              </PMText>
            </PMBox>
          ))}
          {hidden > 0 && (
            <PMText fontSize="2xs" color="faded" paddingLeft={2} paddingTop={1}>
              +{hidden} more landed here
            </PMText>
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}

type DestinationState = {
  /** The second line of the row. */
  line: string;
  tone: 'error' | 'warning' | 'secondary';
  dot: string;
  /** Read on hover and by a screen reader, where the dot alone says nothing. */
  tooltip: string;
};

/**
 * What the row says about itself, in one place for both kinds.
 *
 * The repository branch is the wording the Distribution rail already uses, and
 * the lock profiles come with it: a repository whose provider has no token is
 * behind but not fixable from here, and one already mid-distribution is behind
 * but being dealt with. Both would be a lie in plain orange.
 */
function destinationState(
  destination: Destination,
  providersWithToken: Set<GitProviderId>,
  isProvidersLoading: boolean,
): DestinationState {
  if (destination.kind === 'marketplace') {
    const count = destination.behind;
    const plural = count === 1 ? '' : 's';

    /*
     * Zero reads like a repository that is aligned, not like a marketplace with
     * a count of nothing. These rows only started appearing once the rail listed
     * the marketplaces a space distributes to rather than the ones reporting
     * drift, and "0 plugins drifted" in orange was the row saying something
     * is wrong when the answer is that nothing is.
     */
    if (count === 0) {
      const plugins = destination.packageNames.length;
      const pluginWord = plugins === 1 ? 'plugin' : 'plugins';
      return {
        line: `${plugins} ${pluginWord} distributed`,
        tone: 'secondary',
        dot: 'green.500',
        tooltip: `${plugins} ${pluginWord} distributed here, all matching their source`,
      };
    }

    return {
      line: `${count} plugin${plural} drifted`,
      tone: 'warning',
      dot: 'orange.500',
      tooltip: `${count} distributed plugin${plural} whose package has changed since`,
    };
  }

  const { behind, failed } = destination;
  /*
   * The package, not the target. A row offers to distribute packages, and the
   * same package behind on the root and on `apps/frontend` is one thing to
   * fix; counting the pairs made the row promise two. The tooltip reads the
   * same two numbers as the line, which is what it used not to do.
   */
  const packages = repositoryPackageCount(destination.repository);
  const packageWord = packages === 1 ? 'package' : 'packages';

  if (failed > 0) {
    return {
      /*
       * The unit is spelled out because the band above counts destinations in
       * the same word: a pill reading "1 failed" over a row reading "3 failed"
       * is one number contradicting the other, and neither is wrong.
       */
      line: `${failed} distribution${failed === 1 ? '' : 's'} failed`,
      tone: 'error',
      dot: 'red.500',
      tooltip: `${failed} distribution${failed === 1 ? '' : 's'} failed`,
    };
  }

  if (behind === 0) {
    return {
      line: `${packages} ${packageWord} aligned`,
      tone: 'secondary',
      dot: 'green.500',
      tooltip: `${packages} ${packageWord} aligned`,
    };
  }

  const drifted = repositoryDriftedPackageCount(destination.repository);
  const lock = repositoryLockProfile(
    destination.repository,
    providersWithToken,
    isProvidersLoading,
  );
  return {
    line: `${drifted} ${drifted === 1 ? 'package' : 'packages'} drifted`,
    tone: 'warning',
    dot: lock === 'all-in-progress' ? 'blue.300' : 'orange.500',
    tooltip:
      lock === 'all-no-app-token'
        ? `${behind} distribution${behind === 1 ? '' : 's'} drifted, all via packmind install`
        : lock === 'all-in-progress'
          ? `${behind} distribution${behind === 1 ? '' : 's'} in progress`
          : `${drifted} of ${packages} ${packageWord} drifted`,
  };
}

/**
 * Pinned under the list, in the slot the Context rail gives its create button:
 * an action pinned there never scrolls away and never takes the strip of the
 * rail the eye lands on first.
 *
 * Now the only batch on the surface, and it holds both grains of it. The blunt
 * one puts every drifted row on screen right in one click, which is what the
 * page header used to do from above. The narrow one is the handful a release
 * actually touched. The pane beside this stays the precise instrument, one
 * destination at a time.
 */
/** What a pick amounts to, in the unit each kind of destination counts in. */
function pickedReach(distributions: number, plugins: number): string {
  const parts: string[] = [];
  if (distributions > 0 || plugins === 0) {
    parts.push(
      `${distributions} distribution${distributions === 1 ? '' : 's'}`,
    );
  }
  if (plugins > 0) {
    parts.push(`${plugins} plugin${plugins === 1 ? '' : 's'}`);
  }
  return parts.join(', ');
}

function RailActionBar({
  actionableCount,
  actionableSelectedCount,
  pickedCount,
  pickedDistributions,
  pickedPlugins,
  onSelectAllVisible,
  onClearVisible,
  onClearAll,
  onDistribute,
  onDistributeActionable,
}: Readonly<{
  actionableCount: number;
  actionableSelectedCount: number;
  pickedCount: number;
  pickedDistributions: number;
  pickedPlugins: number;
  onSelectAllVisible: () => void;
  onClearVisible: () => void;
  onClearAll: () => void;
  onDistribute: () => void;
  /** Every drifted row the list is showing, in one gesture. */
  onDistributeActionable: () => void;
}>) {
  if (pickedCount === 0 && actionableCount === 0) return null;

  if (pickedCount === 0) {
    return (
      <PMBox
        paddingX={3}
        paddingY={2.5}
        borderTopWidth="1px"
        borderColor="border.tertiary"
        bg="background.primary"
        flexShrink={0}
      >
        {/*
          Two verbs, not one. This slot used to offer only "Select all drifted",
          which made the common case — everything behind, put right now — three
          clicks, while the page header above the surface did it in one. With
          that header gone the direct path lives here, and the narrower one
          beside it keeps the selection available for the release that only
          touched two repositories.

          Nothing is written by either click: both open the confirmation
          surface, which lists what it is about to commit and where.
        */}
        <PMHStack gap={2} align="center">
          <PMButton
            variant="primary"
            size="sm"
            flex={1}
            minW={0}
            onClick={onDistributeActionable}
          >
            <PMIcon fontSize="sm">
              <LuRotateCw />
            </PMIcon>
            Distribute drifted ({actionableCount})
          </PMButton>
          <PMButton
            variant="secondary"
            size="sm"
            flexShrink={0}
            onClick={onSelectAllVisible}
            aria-label="Select every drifted destination in this list"
          >
            Select
          </PMButton>
        </PMHStack>
      </PMBox>
    );
  }

  const allSelected =
    actionableCount > 0 && actionableSelectedCount === actionableCount;
  const someSelected = actionableSelectedCount > 0 && !allSelected;

  return (
    <PMBox
      paddingX={3}
      paddingY={3}
      borderTopWidth="1px"
      borderColor="border.tertiary"
      bg="background.secondary"
      flexShrink={0}
    >
      <PMVStack gap={2.5} align="stretch">
        <PMHStack gap={2} align="center" minW={0}>
          <PMCheckbox
            size="sm"
            checked={
              allSelected ? true : someSelected ? 'indeterminate' : false
            }
            onCheckedChange={(details) => {
              if (details.checked === true) onSelectAllVisible();
              else onClearVisible();
            }}
            disabled={actionableCount === 0}
            aria-label="Select every drifted destination in this list"
          />
          <PMText
            fontSize="xs"
            color="secondary"
            fontVariantNumeric="tabular-nums"
            truncate
            flex={1}
            minW={0}
          >
            {pickedCount} selected ·{' '}
            {pickedReach(pickedDistributions, pickedPlugins)}
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
            cursor="pointer"
            padding={0}
            _hover={{ color: 'text.primary' }}
          >
            Clear selection
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

/**
 * The matched fragment, so a row never has to be taken on faith. A local copy
 * of what the Context rail does: the two rails live one in the shared frontend
 * and one here, and a shared helper would have to cross that line for twelve
 * lines of string slicing.
 */
function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle);
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <PMBox as="span" color="text.primary" fontWeight="semibold">
        {text.slice(index, index + needle.length)}
      </PMBox>
      {text.slice(index + needle.length)}
    </>
  );
}
