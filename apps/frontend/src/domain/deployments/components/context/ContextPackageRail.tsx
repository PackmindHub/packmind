import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
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
 */
export function ContextPackageRail({
  packages,
  catalogue,
  orgSlug,
  spaceSlug,
  selectedPackageId,
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
      */}
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
      </PMBox>

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
          orphanCount={orphanCount}
          showingOrphans={showingOrphans}
          onShowOrphans={onShowOrphans}
        />

        <PMVStack gap={0} align="stretch">
          {rows.map((row) => (
            <PackageRow
              key={row.pkg.id}
              row={row}
              needle={needle}
              isActive={!showingInventory && row.pkg.id === selectedPackageId}
              onClick={() => onSelect(row.pkg.id)}
            />
          ))}
        </PMVStack>

        {needle !== '' && matchCount === 0 && <NoMatches query={query} />}
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
  isActive,
  onClick,
}: Readonly<{
  row: PackageSearchRow;
  needle: string;
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
          <PMBox
            as="div"
            fontSize="sm"
            fontWeight={isActive ? 'semibold' : 'medium'}
            color={isActive ? 'text.primary' : 'text.secondary'}
            truncate
          >
            {highlight(pkg.name, needle)}
          </PMBox>
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
            {isPinned && ' · open, not a match'}
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
