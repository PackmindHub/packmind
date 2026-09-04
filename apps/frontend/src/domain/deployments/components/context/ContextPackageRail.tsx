import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuLayers,
  LuPackage,
  LuPackageX,
  LuPlus,
  LuSearch,
} from 'react-icons/lu';
import type { PackageId, PackageResponse } from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  packageComponentCount,
  type ContextComponent,
  type SpaceCatalogue,
} from './buildPackageContext';
import { COMPONENT_TYPE_ICONS } from './ContextComponentList';
import type { PackageAttention } from './buildPackageAttention';
import { searchPackages, type PackageSearchRow } from './searchPackages';

/** Past this, one package's matches would out-scroll the list they sit in. */
const MAX_SHOWN_MATCHES = 3;

/**
 * The packages of a space, as the index of the Context surface.
 *
 * The rail lists containers, not kinds of thing: what a package holds is read
 * one level to the right, in the pane, so a new component type never lands
 * here. That is the whole difference with the navigation this surface replaces.
 *
 * The search is what keeps that affordable. Indexing by container means the
 * name of a component is no longer a place you can go, so the rail has to be
 * able to find one — and it answers with the package that carries it, which is
 * the arrangement teaching itself.
 *
 * The one thing it says about a package beyond what it holds is whether what it
 * holds has actually reached where it was sent. That is a distribution fact on
 * an index of content, and it is here rather than only on the Distribution
 * surface because the package you have to fix is the one you were not looking
 * at: the surface you are on has to be able to tell you.
 */
export function ContextPackageRail({
  packages,
  catalogue,
  orgSlug,
  spaceSlug,
  selectedPackageId,
  attention,
  isAttentionUnavailable,
  showingInventory,
  inventoryCount,
  orphanCount,
  showingOrphans,
  onSelect,
  onShowInventory,
  onShowOrphans,
  onCreatePackage,
}: Readonly<{
  packages: readonly PackageResponse[];
  /** What the space owns, so the search can look inside the packages. */
  catalogue: SpaceCatalogue;
  orgSlug: string;
  spaceSlug: string;
  selectedPackageId: PackageId | null;
  /**
   * The distribution state could not be read, so no row can be marked and the
   * rail must not imply that nothing needs doing.
   */
  isAttentionUnavailable: boolean;
  /**
   * The packages that need a hand, by id. Absent from the map is the common
   * case and means nothing to do, so a row without a mark is a package whose
   * copies are where they are supposed to be.
   */
  attention: ReadonlyMap<PackageId, PackageAttention>;
  /** The space-wide inventory is open, so no package row is the selected one. */
  showingInventory: boolean;
  /** Components in the space, which is not the sum over the packages. */
  inventoryCount: number;
  /** How many of them no package carries. Zero hides the line entirely. */
  orphanCount: number;
  /** The inventory is open and filtered down to those. */
  showingOrphans: boolean;
  onSelect: (packageId: PackageId) => void;
  onShowInventory: () => void;
  onShowOrphans: () => void;
  /**
   * Opens the drawer that names a new package, held by the surface: it is what
   * selects the package once it exists, and the rail has no address of its own.
   */
  onCreatePackage: () => void;
}>) {
  /*
   * Local, and deliberately not in the URL beside the open package. The package
   * is worth sending to someone; the two letters typed on the way to it are
   * not, and a query in the address would travel into every link built from
   * these params.
   */
  const [query, setQuery] = useState('');
  /*
   * Local for the same reason, and one step weaker: unlike the query, this is a
   * lens somebody turned on for a minute and the line above the list says so
   * while it is on. Nothing about it is worth carrying into a link.
   */
  const [onlyDrifted, setOnlyDrifted] = useState(false);

  /*
   * A space can reach this rail with no package and still have something to
   * show, because the inventory row above the list is not a package. Several
   * things in here are about the list and have to know that.
   */
  const hasPackages = packages.length > 0;

  const { rows, needle, matchCount } = useMemo(
    () =>
      searchPackages(
        packages,
        catalogue,
        { orgSlug, spaceSlug },
        { query, selectedPackageId },
      ),
    [packages, catalogue, orgSlug, spaceSlug, query, selectedPackageId],
  );

  /*
   * Counted off the rail's own list rather than off the map, so the number on
   * the line and the number of rows under it are the same number: the map is
   * keyed by what has landed somewhere, which can outlive a package the space
   * no longer has.
   */
  const drifted = useMemo(
    () =>
      packages
        .map((pkg) => attention.get(pkg.id))
        .filter((one): one is PackageAttention => one !== undefined),
    [packages, attention],
  );
  const driftedCount = drifted.length;
  /*
   * The lens switches itself off when there is nothing left to look at, rather
   * than leaving an empty list behind the moment the last package is put right.
   */
  const filtering = onlyDrifted && driftedCount > 0;
  /*
   * The open package survives the filter, whether or not it drifts, for the
   * reason `hoistSelected` gives about the search: a rail that drops the row
   * the pane is showing leaves the reader looking at a package the list says
   * does not exist, with nothing to click to get back to it. It costs one row,
   * and the row says why it is there.
   */
  const pinnedId = showingInventory ? null : selectedPackageId;
  const shownRows = filtering
    ? rows.filter((row) => attention.has(row.pkg.id) || row.pkg.id === pinnedId)
    : rows;
  /** Nothing the query reached is drifting, which the list alone cannot say. */
  const noDriftedMatch =
    filtering &&
    needle !== '' &&
    matchCount > 0 &&
    shownRows.every((row) => !attention.has(row.pkg.id));

  return (
    <PMBox
      // 320px, the width of the Distribution rail of the same app: the two
      // rails index different things, but a sidebar that changes width when the
      // user moves between them reads as two applications.
      width="320px"
      flexShrink={0}
      bg="background.primary"
      borderRightWidth="1px"
      borderColor="border.tertiary"
      display="flex"
      flexDirection="column"
      minH={0}
    >
      {/*
        Same band, same offsets and same field size as the search of the
        Distribution rail, so the two rails of this app have one anatomy: search
        on top, the list in the middle, the action pinned under it.

        The drift filter is in here rather than above the rows it narrows,
        because the field beside it narrows the same rows and a rail with its two
        filters in two places is a rail that hides one of them. It costs this
        band one line more than the other rail's, which is a smaller difference
        than the one it removes.

        Gone entirely with no package, rather than shown over an empty list. The
        search walks the packages to find a component, so with none of them it
        can never answer anything, and the drift filter it shares the band with
        counts copies of packages that do not exist. A field that cannot succeed
        is worse than no field: it invites the one gesture that will not work on
        the one screen where there is only one thing to do.
      */}
      {hasPackages && (
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
              // The step the placeholder beside it now uses. Left at
              // `text.faded` the magnifier read as dimmer than the words it
              // labels, and the two stopped looking like one control.
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
               * Not "Search 12 packages". The count answers a question nobody
               * asks and leaves the real one open: does this look inside a
               * package? It does, so the placeholder names both levels.
               */
              placeholder="Search packages and components"
              aria-label="Search packages and components"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </PMBox>

          {isAttentionUnavailable ? (
            <AttentionUnavailableRow />
          ) : (
            driftedCount > 0 && (
              <DriftedFilterRow
                count={driftedCount}
                /*
                The worst state among the packages it counts, not a fixed
                colour. An orange dot heading rows wearing a red one would be
                the same 8px mark meaning two things a few lines apart, and it
                would hide the half of the count that a redistribution may not
                put right on its own.
              */
                tone={
                  drifted.some((one) => one.tone === 'error')
                    ? 'error'
                    : 'warning'
                }
                isActive={filtering}
                onToggle={() => setOnlyDrifted((previous) => !previous)}
              />
            )
          )}
        </PMBox>
      )}

      <PMBox flex={1} minH={0} overflowY="auto">
        {/*
          Deliberately not a package row: half the height, no crate, faded until
          it is the one selected. The package is the unit this space is
          organised around and the rail has to keep saying so; this is the way
          out for the moment when you know what you are looking for but not who
          carries it — or when nobody does.

          It sits above the list rather than in the sidebar because it is a way
          of reading Context, not a fourth place to be: a nav entry per
          arrangement is how the per-type entries happened in the first place.

          Always shown. The prototype hid it below two plugins, on the grounds
          that with one plugin every row would name the same owner and the view
          would be a worse copy of the pane. That argument does not survive the
          real data: a component here belongs to any number of packages,
          including none, so the flat list says things the pane cannot say even
          when there is a single package.

          It stays put under a search, above the results, because it is where a
          component the search cannot reach is found: this list walks the
          packages, and a component in none of them is only in there.
        */}
        <InventoryRow
          count={inventoryCount}
          isActive={showingInventory}
          onClick={onShowInventory}
          /*
            Suppressed with no package, where every component is in none of them
            and the pill would repeat the row it hangs under while filtering
            nothing out of it. Zero is the value that hides it, which is the
            contract the row already documents.
          */
          orphanCount={hasPackages ? orphanCount : 0}
          showingOrphans={showingOrphans}
          onShowOrphans={onShowOrphans}
        />

        {!hasPackages && <NoPackages />}

        {/*
          Where the list stops being a way of reading the space and starts
          being its packages. The row above says "All components" and every row
          below says a name, so without this band the first row reads as the
          first entry of one homogeneous list and the reader has to infer the
          boundary from an icon.

          Suppressed when no row follows it: a heading over nothing is a
          section that failed to load, and the two sentences that stand in for
          the rows below already name what is missing.
        */}
        {shownRows.length > 0 && (
          <SectionHeader
            title="Packages"
            count={shownRows.length}
            description="What reaches a repository."
          />
        )}

        <PMVStack gap={0} align="stretch">
          {shownRows.map((row) => (
            <PackageRow
              key={row.pkg.id}
              row={row}
              needle={needle}
              attention={attention.get(row.pkg.id)}
              isDriftPinned={filtering && !attention.has(row.pkg.id)}
              isActive={!showingInventory && row.pkg.id === selectedPackageId}
              onClick={() => onSelect(row.pkg.id)}
            />
          ))}
        </PMVStack>

        {needle !== '' && matchCount === 0 && <NoMatches query={query} />}
        {noDriftedMatch && (
          <NoDriftedMatches query={query} matchCount={matchCount} />
        )}
      </PMBox>

      {/*
        Pinned under the list rather than in a header, so it never scrolls away
        and never takes the strip of the rail the eye lands on first: a package
        is created a handful of times and opened all day.

        It is also the only way to create one in this navigation — Context is
        what replaces the Packages page, and that page carried the button.
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
          onClick={onCreatePackage}
        >
          <PMIcon fontSize="xs">
            <LuPlus />
          </PMIcon>
          New package
        </PMButton>
      </PMBox>
    </PMBox>
  );
}

/**
 * A rail whose list has no rows because the space has no package, which is not
 * the same thing as a space with nothing in it: the row above this one is
 * counting components, and it is the only reason this rail is on screen.
 *
 * It says so where the rows would be rather than leaving the gap under the
 * inventory row unexplained, and it says what is missing in terms of what that
 * costs: the button pinned below is the sentence's other half, so it names the
 * consequence and lets the control name the action.
 */
function NoPackages() {
  return (
    <PMVStack gap={1} align="start" padding={4}>
      <PMText as="div" fontSize="sm" color="secondary">
        No package in this space yet.
      </PMText>
      <PMText as="div" fontSize="xs" color="faded">
        A package is what reaches a repository. Nothing this space owns is
        distributed until one carries it.
      </PMText>
    </PMVStack>
  );
}

/**
 * What a search that reached nothing says. It names the two levels it looked
 * at, and then the one place it could not look: a component belongs to any
 * number of packages including none, and this list walks the packages.
 */
function NoMatches({ query }: Readonly<{ query: string }>) {
  return (
    <PMVStack gap={1} align="start" padding={4}>
      <PMText as="div" fontSize="sm" color="secondary">
        Nothing matches “{query}”.
      </PMText>
      <PMText as="div" fontSize="xs" color="faded">
        The search covers package names and the components inside them. A
        component in no package is in All components, above.
      </PMText>
    </PMVStack>
  );
}

/**
 * What the rail says when the query did reach something and the filter is what
 * is hiding it.
 *
 * A different sentence from the one above, because it is a different answer:
 * the spelling is right, and the thing being looked for is up to date. Without
 * it the rail shows a list of one open package and reads as a search that
 * failed, which would send the reader hunting for a typo.
 */
function NoDriftedMatches({
  query,
  matchCount,
}: Readonly<{ query: string; matchCount: number }>) {
  return (
    <PMVStack gap={1} align="start" padding={4}>
      <PMText as="div" fontSize="sm" color="secondary">
        Nothing matching “{query}” is drifted.
      </PMText>
      <PMText as="div" fontSize="xs" color="faded">
        Clear filters above to see the {matchCount} package
        {matchCount === 1 ? '' : 's'} the search found.
      </PMText>
    </PMVStack>
  );
}

/**
 * How much of this space is not where it was sent, and a way to see only that.
 *
 * A pill under the search rather than a fourth entry in the sidebar, for the
 * reason the inventory row gives about itself: this is a way of reading
 * Context, not another place to be. Under the search because that is the other
 * control that narrows this list, and because the band it sits in does not
 * scroll: the one thing on screen saying rows are missing must not be
 * scrollable out of sight, and put here it needs no stickiness to manage it.
 *
 * The same shape as the pill under the inventory row, deliberately. The rail
 * now has two quiet toggles that each narrow what is shown to the part of it
 * that is a piece of work, and each is attached to the thing it narrows: that
 * one to the inventory, this one to the list the field above it searches.
 *
 * The words change with the state, because the label of a toggle should say
 * what clicking it does next.
 *
 * Absent when nothing drifts, which is the point of it. A rail without this
 * pill is a space whose copies are all where they are supposed to be, and that
 * is worth being able to read in one glance.
 */
function DriftedFilterRow({
  count,
  tone,
  isActive,
  onToggle,
}: Readonly<{
  count: number;
  tone: PackageAttention['tone'];
  isActive: boolean;
  onToggle: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="flex"
      alignItems="center"
      gap={2}
      width="full"
      maxWidth="100%"
      overflow="hidden"
      textAlign="left"
      marginTop={2}
      /*
        10px, which puts the mark's box on the magnifier's exactly: the band's
        own 12px is already in front of both. Paired with the gap below it, the
        label then starts where the placeholder above it does, so the two
        controls of this band share one mark axis and one text axis instead of
        staggering by a few pixels each.
      */
      paddingLeft="10px"
      paddingRight={2}
      paddingY="4px"
      borderRadius="sm"
      cursor="pointer"
      /*
        One tonal step under the field above, not level with it. Filled to the
        field's own step this pill matched its background, its radius, its width
        and its left edge, and a control that differs from a text input by eight
        pixels of height is a control that reads as a second, broken text input.
      */
      bg={isActive ? 'background.secondary' : 'transparent'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onToggle}
      aria-pressed={isActive}
    >
      {/*
        The same dot the rows carry, so the pill and the marks it counts read as
        one thing. In a box the width of the magnifier's em rather than bare: a
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
        <PMBox
          width="8px"
          height="8px"
          borderRadius="full"
          bg={tone === 'error' ? 'red.500' : 'orange.500'}
        />
      </PMBox>
      {/*
        The accent carries "on", which is what the design system reserves it for
        on an active navigation item, and it is also what stops a filled pill
        from being read as a field: no input in this app has periwinkle text in
        it. The dot keeps its own tone throughout — it says what state the
        packages are in, not whether the filter is running.
      */}
      <PMBox
        as="span"
        flex={1}
        minW={0}
        truncate
        fontSize="xs"
        fontWeight={isActive ? 'medium' : 'normal'}
        color={isActive ? 'branding.primary' : 'text.secondary'}
      >
        {count} drifted package{count === 1 ? '' : 's'}
      </PMBox>
      {isActive && (
        /*
          `tertiary` and not `faded`: the faded step falls under 4:1 on the
          surface the active state paints, and stops being readable as the words
          of a control.
        */
        <PMText fontSize="11px" color="tertiary" whiteSpace="nowrap">
          Clear filters
        </PMText>
      )}
    </PMBox>
  );
}

/**
 * What the same slot says when the distribution state could not be read.
 *
 * One line rather than nothing: an unmarked list of packages is a list that
 * claims every copy is where it should be, and that claim is exactly what this
 * rail has just failed to check.
 */
function AttentionUnavailableRow() {
  return (
    /* 32px, the field's own, so this sits under the placeholder it replaces. */
    <PMBox marginTop={2} paddingLeft="32px" paddingRight={2} paddingY="4px">
      <PMText as="div" fontSize="xs" color="tertiary" truncate>
        Distribution state unavailable
      </PMText>
    </PMBox>
  );
}

/**
 * The heading of the packages, in the shape the Distribution rail already uses
 * for the heading of a kind: sticky, because the list is scrolled looking for
 * a name and the band is what says which of the two levels of this rail the
 * names belong to.
 *
 * Its own copy rather than an import of the other rail's: the two rails mirror
 * each other by hand throughout, and this is a dozen lines of presentation
 * with no behaviour to keep in step.
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

/**
 * The inventory, and the part of it worth a shortcut.
 *
 * Built on the two shapes the rail already has rather than a third one: a
 * container row with its name on one line and a count under it, exactly like a
 * package, and one inset pill under it, exactly like a component the search
 * found inside a package. The first version of this made the second line a
 * 10px caption glued to the row above, which read as a stray label rather than
 * as something to click.
 *
 * The pill is the components no package carries. It is in the rail rather than
 * only inside the pane because it is the one part of the inventory that is a
 * piece of work rather than a way of reading: something in no package reaches
 * no repository. It is absent when the space has none, so a rail without the
 * line is a space where everything reaches somewhere.
 *
 * Only one of the two is marked at a time, the deeper one that is open, so the
 * rail never looks like it has two selections.
 */
function InventoryRow({
  count,
  isActive,
  onClick,
  orphanCount,
  showingOrphans,
  onShowOrphans,
}: Readonly<{
  count: number;
  isActive: boolean;
  onClick: () => void;
  orphanCount: number;
  showingOrphans: boolean;
  onShowOrphans: () => void;
}>) {
  const isWholeActive = isActive && !showingOrphans;

  return (
    <PMBox
      maxWidth="100%"
      overflow="hidden"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={isActive ? 'background.secondary' : 'transparent'}
    >
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
        aria-current={isWholeActive ? 'true' : undefined}
      >
        <RowIcon color={isWholeActive ? 'text.secondary' : 'text.faded'}>
          <LuLayers />
        </RowIcon>
        <PMBox flex={1} minW={0}>
          <PMBox
            as="div"
            fontSize="sm"
            fontWeight={isWholeActive ? 'semibold' : 'medium'}
            color={isWholeActive ? 'text.primary' : 'text.secondary'}
            truncate
          >
            All components
          </PMBox>
          {/*
            The count where a package keeps its own, and worded so it does not
            repeat the label above it: "8 components" under "All components"
            says the same word twice for nothing.
          */}
          <PMBox
            as="div"
            paddingTop="3px"
            color="text.faded"
            fontSize="xs"
            truncate
          >
            {count} in this space
          </PMBox>
        </PMBox>
      </PMBox>

      {orphanCount > 0 && (
        <PMBox paddingX={2} paddingBottom={2}>
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
            bg={showingOrphans ? 'background.tertiary' : 'transparent'}
            _hover={showingOrphans ? undefined : { bg: 'background.tertiary' }}
            transition="background-color 150ms ease-out"
            onClick={onShowOrphans}
            aria-current={showingOrphans ? 'true' : undefined}
          >
            <PMHStack gap={2} minW={0} align="center">
              <RowIcon
                fontSize="xs"
                color={showingOrphans ? 'text.secondary' : 'text.faded'}
              >
                <LuPackageX />
              </RowIcon>
              <PMBox
                as="span"
                flex={1}
                minW={0}
                truncate
                fontSize="xs"
                fontWeight={showingOrphans ? 'medium' : 'normal'}
                color={showingOrphans ? 'text.primary' : 'text.secondary'}
              >
                {orphanCount} in no package
              </PMBox>
            </PMHStack>
          </PMBox>
        </PMBox>
      )}
    </PMBox>
  );
}

function PackageRow({
  row,
  needle,
  attention,
  isDriftPinned,
  isActive,
  onClick,
}: Readonly<{
  row: PackageSearchRow;
  needle: string;
  /** What this package needs a hand with, or undefined when it needs none. */
  attention: PackageAttention | undefined;
  /**
   * The drift filter is on and this row survived it only because the pane is
   * showing it. The counterpart of `row.isPinned`, which the search sets.
   */
  isDriftPinned: boolean;
  isActive: boolean;
  onClick: () => void;
}>) {
  const { pkg, matches, isPinned } = row;
  const count = packageComponentCount(pkg);
  const shown = matches.slice(0, MAX_SHOWN_MATCHES);
  const hidden = matches.length - shown.length;

  return (
    <PMBox
      maxWidth="100%"
      overflow="hidden"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      bg={isActive ? 'background.secondary' : 'transparent'}
    >
      {/*
        The package and its matched components are separate targets: clicking
        the name opens the package here, clicking a match opens that component.
        One control wrapping both would force the user through the package to
        reach the thing they were actually searching for.
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
        aria-current={isActive ? 'true' : undefined}
      >
        {/*
          The crate, the same mark the sidebar keeps for the container. It sits
          on the name's line rather than centred on the pair: centred, it sank
          into the gap between the two lines and read as a bullet for the row
          instead of as the type of the thing named.
        */}
        <RowIcon color={isActive ? 'text.secondary' : 'text.faded'}>
          <LuPackage />
        </RowIcon>
        <PMBox flex={1} minW={0}>
          {/*
            The mark shares the name's line rather than taking one of its own:
            the eye runs down the left edge for names and down the right edge
            for state, which is the arrangement the Distribution rail already
            has. The name keeps `minW={0}` so it is the half that truncates.
          */}
          <PMHStack gap={2} align="center" minW={0}>
            <PMBox
              as="div"
              flex={1}
              minW={0}
              fontSize="sm"
              fontWeight={isActive ? 'semibold' : 'medium'}
              color={isActive ? 'text.primary' : 'text.secondary'}
              truncate
            >
              {highlight(pkg.name, needle)}
            </PMBox>
            {attention && <AttentionMark attention={attention} />}
          </PMHStack>
          {/*
            One text node rather than a row of boxes, so the line ends in an
            ellipsis instead of being cut mid-word by the rail.

            The word under a pinned row is the whole reason to mark it: it is
            the only row of a search that the query did not reach, and without
            it the package the pane happens to be showing reads as a result.
          */}
          <PMBox
            as="div"
            paddingTop="3px"
            color="text.faded"
            fontSize="xs"
            truncate
          >
            {count} component{count === 1 ? '' : 's'}
            {pinnedNote(isPinned, isDriftPinned)}
          </PMBox>
        </PMBox>
      </PMBox>

      {shown.length > 0 && (
        <PMVStack gap={0} align="stretch" paddingX={2} paddingBottom={2}>
          {shown.map((component) => (
            <ComponentMatchRow
              key={component.key}
              component={component}
              needle={needle}
            />
          ))}
          {hidden > 0 && (
            <PMText fontSize="2xs" color="faded" paddingLeft={2} paddingTop={1}>
              +{hidden} more inside this package
            </PMText>
          )}
        </PMVStack>
      )}
    </PMBox>
  );
}

/**
 * Why a row the list would otherwise have dropped is still here.
 *
 * The two reasons are not the same sentence: under a search the row is the one
 * the query did not reach, and under the drift filter it is the one that is up
 * to date. Saying "not a match" about a package nobody searched for would be a
 * lie about the only row of the list that needs explaining.
 *
 * The query wins when both are on, because it is the more specific reason and
 * one row takes one note.
 */
function pinnedNote(isPinned: boolean, isDriftPinned: boolean): string {
  if (isPinned) return ' · open, not a match';
  if (isDriftPinned) return ' · open, not drifted';
  return '';
}

/**
 * The mark a package wears when something it was sent to needs a hand.
 *
 * Only the exception is marked. That is the deliberate asymmetry with the
 * Distribution rail, where every row carries a dot because state is what that
 * rail indexes: here it is a note in the margin of an index of content, and a
 * column of green dots would turn the library into a health dashboard and teach
 * the eye to skip the one row that is orange.
 *
 * The dot carries the colour and the number carries the quantity, in the
 * neutral ramp. Colouring both would say one thing twice, and a count is not a
 * state. The tooltip is what makes the mark readable without colour, and it is
 * the label a screen reader gets, because "2" on its own is not a sentence.
 */
function AttentionMark({
  attention,
}: Readonly<{ attention: PackageAttention }>) {
  return (
    <PMTooltip label={attention.tooltip} showArrow>
      <PMBox
        display="flex"
        alignItems="center"
        gap={1.5}
        flexShrink={0}
        role="img"
        aria-label={attention.tooltip}
      >
        <PMBox
          width="8px"
          height="8px"
          borderRadius="full"
          bg={attention.tone === 'error' ? 'red.500' : 'orange.500'}
          aria-hidden
        />
        <PMText
          fontSize="11px"
          color="secondary"
          fontVariantNumeric="tabular-nums"
        >
          {attention.count}
        </PMText>
      </PMBox>
    </PMTooltip>
  );
}

/**
 * A component the query reached, under the package that carries it.
 *
 * A link to its detail page, which is where the rows of the pane go too: the
 * same object reached from two places has to behave the same way, and until the
 * pane can show a component itself, that page is where one is read.
 */
function ComponentMatchRow({
  component,
  needle,
}: Readonly<{ component: ContextComponent; needle: string }>) {
  const nameMatches = component.name.toLowerCase().includes(needle);

  return (
    <Link to={component.href}>
      <PMBox
        display="block"
        width="full"
        maxWidth="100%"
        overflow="hidden"
        textAlign="left"
        paddingX={2}
        paddingY="4px"
        borderRadius="sm"
        _hover={{ bg: 'background.tertiary' }}
        transition="background-color 150ms ease-out"
      >
        <PMHStack gap={2} minW={0} align="start">
          <RowIcon fontSize="xs">
            {COMPONENT_TYPE_ICONS[component.type]}
          </RowIcon>
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
                {highlight(component.name, nameMatches ? needle : '')}
              </PMBox>
              <PMText fontSize="2xs" color="faded" whiteSpace="nowrap">
                {COMPONENT_TYPE_LABELS_SINGULAR[component.type]}
              </PMText>
            </PMHStack>
            {/*
              The name is not always where the hit landed. When it came from the
              summary, the row has to show that line, or it reads as an
              unexplained result. The icon stays on the name either way, the
              same rule the package above it follows.
            */}
            {!nameMatches && (
              <PMBox
                as="div"
                paddingTop="1px"
                fontSize="2xs"
                color="text.faded"
                truncate
              >
                {highlight(summaryAround(component.summary, needle), needle)}
              </PMBox>
            )}
          </PMBox>
        </PMHStack>
      </PMBox>
    </Link>
  );
}

/**
 * How much of the description to keep in front of the hit. Enough to read the
 * match as part of a sentence, little enough that it survives the rail's width.
 */
const SUMMARY_LEAD = 24;

/**
 * The description, cut around the hit rather than from its beginning.
 *
 * Printed from the start, a match forty words in never appears: the line
 * truncates long before it, and the row shows a description with nothing marked
 * in it, which is exactly the unexplained result the second line exists to
 * prevent. Descriptions in this app are paragraphs, not labels.
 *
 * The cut lands on a word rather than at a fixed offset. "…ce lifetimes, async
 * cancellation" costs the reader a second to parse and buys nothing over
 * "…lifetimes, async cancellation".
 */
function summaryAround(text: string, needle: string): string {
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle);
  if (index <= SUMMARY_LEAD) return text;

  const window = index - SUMMARY_LEAD;
  const space = text.indexOf(' ', window);
  const from = space >= 0 && space < index ? space + 1 : window;
  return `…${text.slice(from)}`;
}

/**
 * The matched fragment, so a row never has to be taken on faith.
 *
 * A value rather than a component: most calls have nothing to mark and hand
 * back the string they were given, and a component that renders bare text is a
 * fragment around one child.
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

/**
 * The mark that stands beside a name carrying a second line under it. The line
 * box is one and a half times its font size and an icon rendered at that size
 * is exactly one em tall, so a quarter of an em from the top of the flex line
 * lands it on the label.
 */
function RowIcon({
  children,
  fontSize = 'sm',
  color = 'text.faded',
}: Readonly<{ children: ReactNode; fontSize?: string; color?: string }>) {
  return (
    <PMIcon
      fontSize={fontSize}
      color={color}
      flexShrink={0}
      alignSelf="flex-start"
      marginTop="0.25em"
    >
      {children}
    </PMIcon>
  );
}
