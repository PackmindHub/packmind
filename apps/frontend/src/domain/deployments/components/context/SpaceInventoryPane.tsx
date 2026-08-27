import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { LuPackageX } from 'react-icons/lu';
import {
  PMBox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { OrganizationId, PackageResponse, SpaceId } from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  componentSelectionKey,
  type ContextComponent,
  type ContextComponentType,
  type SpaceCatalogue,
} from './buildPackageContext';
import {
  buildSpaceInventory,
  filterInventoryGroups,
  type InventoryCoverage,
} from './buildSpaceInventory';
import {
  COMPONENT_ACTION_ICONS,
  COMPONENT_TYPE_ICONS,
  ContextComponentList,
} from './ContextComponentList';
import { ContextSelectionBar } from './ContextSelectionBar';
import { MoveComponentDrawer } from './MoveComponentDrawer';

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
 * Nothing is created here. Creating belongs to a package, because a component
 * without one is distributed to nobody, and a New button here would have to ask
 * which package before doing anything — the question the surface is built to
 * make you answer first.
 *
 * Memberships are another matter, and this is where they belong: a list of
 * components nothing distributes that could only be looked at would be a to-do
 * list with no way to do anything about it. Picking rows and giving them a
 * package is the same gesture the package pane already has, minus the half that
 * detaches them from somewhere.
 */
export function SpaceInventoryPane({
  packages,
  catalogue,
  coverage,
  onCoverageChange,
  spaceId,
  organizationId,
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
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
}>) {
  const [typeFilter, setTypeFilter] = useState<ContextComponentType | null>(
    null,
  );
  /*
   * What is picked and what is being placed, held for the same reasons the
   * package pane holds them: by key, because the groups are rebuilt on every
   * render of the surface, and not in the URL, because a selection is a gesture
   * in progress rather than a place.
   */
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [placing, setPlacing] = useState<readonly ContextComponent[] | null>(
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

  /*
   * Picking is offered on every row of this list, filtered or not. A first
   * version offered it only under the filter, on the grounds that "give this a
   * package" is only ever a real need for the components in none; what that
   * actually produced was one list that grows and loses checkboxes as a chip is
   * clicked, which is a worse thing to explain than the operation itself. The
   * drawer already handles a component that is somewhere: it adds a membership
   * and says so, and it can tell how many of the picked ones have none.
   *
   * Resolved against what is on screen rather than against the whole space, so
   * the bar cannot act on rows a filter is hiding. That is also what repairs the
   * selection afterwards: a component that just joined a package leaves the
   * filtered list, so it drops out of the selection on its own.
   */
  const selection = useMemo(
    () =>
      shownGroups
        .flatMap((group) => group.entries)
        .map((entry) => entry.component)
        .filter((component) =>
          selectedKeys.has(componentSelectionKey(component)),
        ),
    [shownGroups, selectedKeys],
  );

  const toggleSelect = useCallback((component: ContextComponent) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      const key = componentSelectionKey(component);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

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
          <PMVStack gap={5} align="stretch">
            {selection.length > 0 && (
              <ContextSelectionBar
                count={selection.length}
                actions={[
                  {
                    label: 'Add to a package',
                    icon: COMPONENT_ACTION_ICONS.add,
                    onAct: () => setPlacing(selection),
                  },
                ]}
                onClear={clearSelection}
              />
            )}
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
                  <ContextComponentList
                    entries={group.entries}
                    /*
                      Dropped under the filter: every row of it would read "No
                      package", which is what the filter already said, and the
                      column it sits in is 180px the descriptions can use.
                    */
                    showPackages={!showingOrphans}
                    selectedKeys={selectedKeys}
                    onToggleSelect={toggleSelect}
                  />
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMBox>

      {/*
        No source: what is picked here is being given a package rather than
        moved between two, and the components the filter shows are in none. The
        drawer is the same one the package pane opens, with that half missing.
      */}
      {placing && placing.length > 0 && (
        <MoveComponentDrawer
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setPlacing(null);
          }}
          components={placing}
          source={null}
          packages={packages}
          spaceId={spaceId}
          organizationId={organizationId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
          onMoved={clearSelection}
        />
      )}
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
