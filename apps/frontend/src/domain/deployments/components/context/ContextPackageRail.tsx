import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PMBox, PMButton, PMIcon, PMVStack } from '@packmind/ui';
import { LuLayers, LuPackage, LuPlus } from 'react-icons/lu';
import type { PackageId, PackageResponse } from '@packmind/types';
import { packageComponentCount } from './buildPackageContext';

/**
 * The packages of a space, as the index of the Context surface.
 *
 * The rail lists containers, not kinds of thing: what a package holds is read
 * one level to the right, in the pane, so a new component type never lands
 * here. That is the whole difference with the navigation this surface replaces.
 */
export function ContextPackageRail({
  packages,
  selectedPackageId,
  showingInventory,
  inventoryCount,
  onSelect,
  onShowInventory,
  createPackageHref,
}: Readonly<{
  packages: readonly PackageResponse[];
  selectedPackageId: PackageId | null;
  /** The space-wide inventory is open, so no package row is the selected one. */
  showingInventory: boolean;
  /** Components in the space, which is not the sum over the packages. */
  inventoryCount: number;
  onSelect: (packageId: PackageId) => void;
  onShowInventory: () => void;
  createPackageHref: string;
}>) {
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
        */}
        <InventoryRow
          count={inventoryCount}
          isActive={showingInventory}
          onClick={onShowInventory}
        />

        <PMVStack gap={0} align="stretch">
          {packages.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              isActive={!showingInventory && pkg.id === selectedPackageId}
              onClick={() => onSelect(pkg.id)}
            />
          ))}
        </PMVStack>
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
        <PMButton variant="secondary" size="sm" width="full" asChild>
          <Link to={createPackageHref}>
            <PMIcon fontSize="xs">
              <LuPlus />
            </PMIcon>
            New package
          </Link>
        </PMButton>
      </PMBox>
    </PMBox>
  );
}

function InventoryRow({
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
      aria-current={isActive ? 'true' : undefined}
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

function PackageRow({
  pkg,
  isActive,
  onClick,
}: Readonly<{
  pkg: PackageResponse;
  isActive: boolean;
  onClick: () => void;
}>) {
  const count = packageComponentCount(pkg);

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
      paddingX={3}
      paddingY="10px"
      borderBottomWidth="1px"
      borderColor="border.tertiary"
      cursor="pointer"
      bg={isActive ? 'background.secondary' : 'transparent'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
    >
      {/*
        The crate, the same mark the sidebar keeps for the container. It sits on
        the name's line rather than centred on the pair: centred, it sank into
        the gap between the two lines and read as a bullet for the row instead
        of as the type of the thing named.
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
          {pkg.name}
        </PMBox>
        {/*
          One text node rather than a row of boxes, so the line ends in an
          ellipsis instead of being cut mid-word by the rail.
        */}
        <PMBox
          as="div"
          paddingTop="3px"
          color="text.faded"
          fontSize="xs"
          truncate
        >
          {count} component{count === 1 ? '' : 's'}
        </PMBox>
      </PMBox>
    </PMBox>
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
  color = 'text.faded',
}: Readonly<{ children: ReactNode; color?: string }>) {
  return (
    <PMIcon
      fontSize="sm"
      color={color}
      flexShrink={0}
      alignSelf="flex-start"
      marginTop="0.25em"
    >
      {children}
    </PMIcon>
  );
}
