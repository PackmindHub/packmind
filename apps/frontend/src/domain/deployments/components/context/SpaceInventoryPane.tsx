import { useMemo, useState, type ReactNode } from 'react';
import { LuPackageX } from 'react-icons/lu';
import { PMBox, PMHStack, PMHeading, PMIcon, PMText } from '@packmind/ui';
import type { PackageResponse } from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  type ContextComponentType,
  type SpaceCatalogue,
} from './buildPackageContext';
import {
  buildSpaceInventory,
  filterInventoryGroups,
  type InventoryCoverage,
} from './buildSpaceInventory';
import {
  COMPONENT_TYPE_ICONS,
  ContextComponentList,
} from './ContextComponentList';

/**
 * Every component of the space, whatever package carries it.
 *
 * This is the one thing the plugin-first navigation took away and has to give
 * back. The per-type entries answered "what do we have", once per type; with
 * three entries and a rail of packages, nothing answered it any more, and a
 * component in no package had no address at all in the new navigation. This
 * answers it once, and a new component type adds a chip rather than a place
 * to go.
 *
 * Read-only on purpose. Creating belongs to a package, because a component
 * without one is distributed to nobody, and a New button here would have to ask
 * which package before doing anything — the question the surface is built to
 * make you answer first.
 */
export function SpaceInventoryPane({
  packages,
  catalogue,
  coverage,
  onCoverageChange,
  orgSlug,
  spaceSlug,
}: Readonly<{
  packages: readonly PackageResponse[];
  catalogue: SpaceCatalogue;
  /**
   * Whether the list shows everything or only what no package carries.
   *
   * Held by the surface and not here, unlike the type filter below: this one is
   * in the address, because "these four reach nobody" is worth sending to
   * someone, and the two letters of a type filter are not.
   */
  coverage: InventoryCoverage;
  onCoverageChange: (coverage: InventoryCoverage) => void;
  orgSlug: string;
  spaceSlug: string;
}>) {
  const [typeFilter, setTypeFilter] = useState<ContextComponentType | null>(
    null,
  );

  const inventory = useMemo(
    () => buildSpaceInventory(packages, catalogue, { orgSlug, spaceSlug }),
    [packages, catalogue, orgSlug, spaceSlug],
  );

  /*
   * Coverage first, then the type, so the two compose: a type chip narrows what
   * the coverage filter left rather than replacing it. The counts the controls
   * are labelled with come from `inventory`, which is the whole space, so
   * turning a filter on never renumbers the control that turned it on.
   */
  const covered = useMemo(
    () => filterInventoryGroups(inventory.groups, coverage),
    [inventory.groups, coverage],
  );

  const shownGroups = typeFilter
    ? covered.filter((group) => group.type === typeFilter)
    : covered;

  const showingOrphans = coverage === 'none';

  return (
    <PMBox padding={6} flex="1" minH={0} overflowY="auto">
      <PMHeading level="h2">All components</PMHeading>
      {/*
        The heading names the place and stays put, so the rail row and the pane
        keep saying the same thing; the line under it says what is on screen.
        Under the filter it also says the order, because the list stops being
        alphabetical there and an order nobody asked for reads as a bug.
      */}
      <PMText as="div" color="secondary" paddingTop={1}>
        {showingOrphans ? (
          <>
            The {inventory.orphanCount} component
            {inventory.orphanCount === 1 ? '' : 's'} no package carries, newest
            first. Nothing distributes{' '}
            {inventory.orphanCount === 1 ? 'it' : 'them'}.
          </>
        ) : (
          <>
            Everything this space owns, across its {packages.length} package
            {packages.length === 1 ? '' : 's'}. Open one to reach its page.
          </>
        )}
      </PMText>

      <PMBox paddingTop={5}>
        <PMHStack gap={1} wrap="wrap">
          <FilterChip
            label="All"
            count={inventory.total}
            isActive={typeFilter === null}
            onClick={() => setTypeFilter(null)}
          />
          {inventory.groups.map((group) => (
            <FilterChip
              key={group.type}
              label={group.label}
              count={group.entries.length}
              icon={COMPONENT_TYPE_ICONS[group.type]}
              isActive={typeFilter === group.type}
              onClick={() => setTypeFilter(group.type)}
            />
          ))}
        </PMHStack>

        {/*
          Its own row, under the types. The two are different questions about
          the same list — which kind of thing, and whether anything carries it —
          and they compose, so they cannot share a row only one chip of can be
          active in.

          Absent when the space has none, rather than shown reading zero: a
          control whose only message is that it has nothing to show is a claim
          the line above already makes.
        */}
        {inventory.orphanCount > 0 && (
          <PMHStack gap={1} wrap="wrap" paddingTop={1}>
            <FilterChip
              label="In no package"
              count={inventory.orphanCount}
              icon={<LuPackageX />}
              isActive={showingOrphans}
              onClick={() => onCoverageChange(showingOrphans ? 'all' : 'none')}
            />
          </PMHStack>
        )}
      </PMBox>

      <PMBox paddingTop={4}>
        {inventory.total === 0 ? (
          <PMText fontSize="sm" color="secondary">
            No component in this space yet. Open a package to add the first one.
          </PMText>
        ) : shownGroups.length === 0 ? (
          /*
            Reachable with both filters on: the type picked has none in no
            package. Naming that type answers the question that was asked, and
            says the good news rather than showing an empty list.
          */
          <PMText fontSize="sm" color="secondary">
            Every{' '}
            {typeFilter
              ? COMPONENT_TYPE_LABELS_SINGULAR[typeFilter].toLowerCase()
              : 'component'}{' '}
            of this space is in a package.
          </PMText>
        ) : (
          <PMBox
            display="flex"
            flexDirection="column"
            gap={5}
            alignItems="stretch"
          >
            {shownGroups.map((group) => (
              <PMBox key={group.type}>
                {/*
                  The heading stays when a single type is shown: it is what says
                  the list is complete for that type rather than truncated.
                */}
                <PMText
                  fontSize="10px"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="wider"
                  color="faded"
                >
                  {group.label}
                </PMText>
                <PMBox paddingTop={1}>
                  <ContextComponentList entries={group.entries} showPackages />
                </PMBox>
              </PMBox>
            ))}
          </PMBox>
        )}
      </PMBox>
    </PMBox>
  );
}

/**
 * One chip, whichever axis it belongs to. Coverage has one of these too, on a
 * row of its own: sharing this row would make two of them selectable at once
 * and neither of them mean anything, and giving coverage a control of another
 * shape would make one filter look like a different kind of thing.
 */
function FilterChip({
  label,
  count,
  icon,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  count: number;
  icon?: ReactNode;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap="6px"
      paddingX={2}
      paddingY="4px"
      borderRadius="sm"
      fontSize="xs"
      cursor="pointer"
      bg={isActive ? 'background.tertiary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.secondary'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
      aria-pressed={isActive}
    >
      {icon && (
        <PMIcon fontSize="xs" color="text.faded">
          {icon}
        </PMIcon>
      )}
      {label}
      <PMBox as="span" color="text.faded" fontVariantNumeric="tabular-nums">
        {count}
      </PMBox>
    </PMBox>
  );
}
