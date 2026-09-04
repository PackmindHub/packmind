import { useMemo, useState } from 'react';
import {
  LuPackage,
  LuPackageX,
  LuSearch,
  LuTriangleAlert,
} from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMIcon,
  PMInput,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import type { OrganizationId, PackageResponse, SpaceId } from '@packmind/types';
import { useAddArtefactsToPackagesMutation } from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { deployedPlaceParts } from '../PackagesPopover';
import {
  buildAddableComponents,
  filterAddableComponents,
  groupedComponentCount,
} from './buildAddableComponents';
import {
  filterInventoryGroups,
  type InventoryCoverage,
  type InventoryEntry,
  type InventoryGroup,
} from './buildSpaceInventory';
import { componentIdsPayload } from './buildMoveTargets';
import {
  componentSelectionKey,
  componentSetKind,
  componentSetSubject,
  type ContextComponent,
  type SpaceCatalogue,
} from './buildPackageContext';
import { COMPONENT_TYPE_ICONS } from './ContextComponentList';
import { ContextChip } from './ContextChip';

/** Above this many candidates the list gets a filter rather than a scroll. */
const SEARCHABLE_FROM = 7;

/**
 * Putting components the space already owns into the package being read.
 *
 * The counterpart of the create menu beside it. That one makes a component that
 * does not exist yet and drops it in; this one places one that does. Until it
 * existed, filling a package from this surface meant leaving for the package's
 * edit form, which is a page whose other half is the identity fields the drawer
 * next door already covers.
 *
 * A drawer for the reason the others are: a list to work through rather than a
 * question to answer, and the package it is filling stays on screen beside it,
 * so what is already in it is readable while the additions are picked.
 *
 * Adding is not moving. A component belongs to any number of packages at once,
 * so nothing leaves anything here, and there is no source to warn about. That
 * is also why the drawer does not offer the components this package already
 * holds: ticking one would be a no-op the server would accept, and a list that
 * accepts no-ops stops saying what it is for.
 *
 * It opens on the components no package carries, and not on every candidate.
 * The two populations read the same on a row and cost very different things: a
 * component in no package is being distributed for the first time, while one
 * already shipping elsewhere starts shipping twice, from two packages that will
 * drift apart. A flat list of both makes the second outcome a mis-tick away, and
 * the first is what the picker is opened for — a component created a moment ago
 * and not yet placed. The rest is one chip away, the same chip the space
 * inventory filters by, and there the rows say what already carries them, so
 * shipping something twice stays possible and stops being accidental.
 *
 * One call for the whole selection, not one per component: the mutation takes a
 * bag of ids grouped by type, so a mixed pick joins the package in a single
 * request and cannot half-join it.
 */
export function AddComponentsDrawer({
  open,
  onOpenChange,
  pkg,
  packages,
  catalogue,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The package being filled, membership ids included. */
  pkg: PackageResponse;
  /**
   * The space's packages, for the one thing this drawer asks of them: which of
   * them already carries each candidate. Read from the same list the rail and
   * the inventory read, so the three cannot disagree about where a component is.
   */
  packages: readonly PackageResponse[];
  /** What the space owns, so the candidates need no query of their own. */
  catalogue: SpaceCatalogue;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
}>) {
  const [query, setQuery] = useState('');
  /*
   * Picked by `componentSelectionKey` rather than by component, for the reason
   * the pane's own selection is: two entities of different types can share an
   * id, and the candidates are rebuilt on every render of this drawer.
   */
  const [pickedKeys, setPickedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const { mutateAsync: addArtefacts, isPending } =
    useAddArtefactsToPackagesMutation();
  const { getDeployedTargets, getDeployedMarketplaces } =
    usePackageDeploymentStatus(spaceId, organizationId);

  const addable = useMemo(
    () =>
      buildAddableComponents(pkg, packages, catalogue, { orgSlug, spaceSlug }),
    [pkg, packages, catalogue, orgSlug, spaceSlug],
  );

  /*
   * Held here and not in the address, unlike the inventory's copy of the same
   * filter: that one describes a page worth sending to someone, this one is a
   * step inside a gesture that ends when the drawer closes.
   *
   * Lazily initialised, so a package whose every candidate already ships
   * somewhere opens on the whole list instead of on an empty one behind a filter
   * hiding everything. The drawer is mounted only while open, so this runs once
   * per opening and reads the count of that moment.
   */
  const [coverage, setCoverage] = useState<InventoryCoverage>(() =>
    addable.freeTotal > 0 ? 'none' : 'all',
  );
  const showingFree = coverage === 'none';

  /*
   * Coverage first, then the query, the order the inventory composes the same
   * two filters in: the query narrows what the coverage filter left.
   */
  const covered = useMemo(
    () => filterInventoryGroups(addable.groups, coverage),
    [addable.groups, coverage],
  );
  const coveredCount = groupedComponentCount(covered);
  const shown = useMemo(
    () => filterAddableComponents(covered, query),
    [covered, query],
  );

  /*
   * Resolved against what the coverage filter left rather than against every
   * candidate, so flipping back to the safe list also drops the picks made
   * outside it — visibly, in the count on the button. Deliberately not against
   * the query as well, unlike the inventory's selection: typing is a way of
   * reaching a row rather than a decision about the list, and a pick that
   * vanished as the next search was typed would be a pick silently unmade.
   */
  const picked = useMemo(
    () =>
      covered
        .flatMap((group) => group.entries)
        .map((entry) => entry.component)
        .filter((component) =>
          pickedKeys.has(componentSelectionKey(component)),
        ),
    [covered, pickedKeys],
  );

  /*
   * What the picked components are called, the wording the move drawer uses: a
   * mixed pick has no kind of its own, so it is "components". Naming the first
   * type would say something untrue about the rest.
   */
  const kind = componentSetKind(picked);
  const subject = componentSetSubject(picked);

  const places = deployedPlaceParts(
    getDeployedTargets(pkg.id),
    getDeployedMarketplaces(pkg.id),
  ).join(' and ');

  const toggle = (component: ContextComponent) => {
    setPickedKeys((previous) => {
      const next = new Set(previous);
      const key = componentSelectionKey(component);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  };

  /*
   * The query goes with the list it was typed against. Kept across the flip, it
   * would hand the wider list a needle chosen for the narrower one and answer
   * "show me the rest" with a filtered fragment of it.
   */
  const handleCoverageChange = (next: InventoryCoverage) => {
    setCoverage(next);
    setQuery('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isPending) return;
    onOpenChange(isOpen);
  };

  const handleAdd = async () => {
    if (picked.length === 0 || isPending) return;

    try {
      const outcomes = await addArtefacts({
        spaceId,
        entries: [{ packageId: pkg.id, ...componentIdsPayload(picked) }],
      });
      if (outcomes.some((outcome) => !outcome.ok)) {
        pmToaster.create({
          type: 'error',
          title: `Couldn't add to ${pkg.name}`,
          description:
            'Nothing was added. Try again, or check your space access.',
        });
        return;
      }

      pmToaster.create({
        type: 'success',
        title: `Added to ${pkg.name}`,
        description: `${subject} now ${
          picked.length === 1 ? 'ships' : 'ship'
        } with ${pkg.name}.`,
      });
      onOpenChange(false);
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't add to ${pkg.name}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={!isPending}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>Add components to {pkg.name}</PMDrawer.Title>
              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton disabled={isPending} />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Header>

            <PMDrawer.Body>
              <PMVStack gap={4} alignItems="stretch">
                {addable.total === 0 ? (
                  <NothingToAdd
                    packageName={pkg.name}
                    spaceIsEmpty={addable.catalogueTotal === 0}
                  />
                ) : (
                  <>
                    {/*
                      Two lines and not one with a clause: which components are
                      listed, then what ticking one does. The second half
                      changes with the filter, because under it nothing picked
                      is anywhere yet and there is no other package to keep it.
                    */}
                    <PMText variant="body" color="secondary">
                      {showingFree ? (
                        <>
                          The components not in any package yet, newest first.
                          Nothing distributes them until they are in one. What
                          you pick joins <PackageName>{pkg.name}</PackageName>.
                        </>
                      ) : (
                        <>
                          Everything <PackageName>{pkg.name}</PackageName> does
                          not hold yet. What you pick joins it without leaving
                          the packages already carrying it, so the same
                          component then ships from each of them.
                        </>
                      )}
                    </PMText>

                    {places ? (
                      <PMHStack
                        gap={2.5}
                        alignItems="flex-start"
                        padding={3}
                        borderRadius="sm"
                        backgroundColor="background.tertiary"
                      >
                        <PMBox color="orange.300" paddingTop={0.5}>
                          <PMIcon fontSize="sm">
                            <LuTriangleAlert />
                          </PMIcon>
                        </PMBox>
                        <PMText variant="small" color="secondary">
                          {pkg.name} is distributed to {places}, where the old
                          content remains until the package is distributed
                          again.
                        </PMText>
                      </PMHStack>
                    ) : null}

                    {/*
                      Absent when the two populations are not both there: with
                      nothing to hide it would filter to the list it is already
                      showing, and with nothing free it would empty the list —
                      which is why the drawer did not open on it in that case.
                      The chip and the count are the inventory's, so the same
                      question about the same components is asked in the same
                      words wherever it is asked.
                    */}
                    {addable.freeTotal > 0 &&
                      addable.freeTotal < addable.total && (
                        <PMHStack gap={1} wrap="wrap">
                          <ContextChip
                            label="In no package"
                            count={addable.freeTotal}
                            icon={<LuPackageX />}
                            isActive={showingFree}
                            onClick={() =>
                              handleCoverageChange(showingFree ? 'all' : 'none')
                            }
                          />
                        </PMHStack>
                      )}

                    {/*
                      Counted on what the coverage filter left, not on every
                      candidate: a search box over four rows is a control with
                      nothing to do, and it appears on the flip that gives it
                      something.
                    */}
                    {coveredCount >= SEARCHABLE_FROM && (
                      <PMBox position="relative">
                        <PMBox
                          position="absolute"
                          left="10px"
                          top="50%"
                          transform="translateY(-50%)"
                          pointerEvents="none"
                          color="text.faded"
                        >
                          <PMIcon fontSize="sm">
                            <LuSearch />
                          </PMIcon>
                        </PMBox>
                        <PMInput
                          size="sm"
                          paddingLeft="32px"
                          placeholder="Search components"
                          aria-label="Search components"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </PMBox>
                    )}

                    {groupedComponentCount(shown) === 0 ? (
                      <PMText variant="small" color="faded">
                        Nothing matches “{query.trim()}”.
                      </PMText>
                    ) : (
                      <PMVStack gap={5} alignItems="stretch">
                        {shown.map((group) => (
                          <CandidateGroup
                            key={group.type}
                            group={group}
                            showPackages={!showingFree}
                            pickedKeys={pickedKeys}
                            onToggle={toggle}
                            disabled={isPending}
                          />
                        ))}
                      </PMVStack>
                    )}
                  </>
                )}
              </PMVStack>
            </PMDrawer.Body>

            <PMDrawer.Footer>
              <PMButton
                variant="tertiary"
                size="sm"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </PMButton>
              <PMButton
                variant="primary"
                size="sm"
                disabled={picked.length === 0 || isPending}
                loading={isPending}
                onClick={() => void handleAdd()}
              >
                {picked.length === 0 ? 'Add' : `Add ${picked.length} ${kind}`}
              </PMButton>
            </PMDrawer.Footer>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

/** The package being filled, named inside a sentence about it. */
function PackageName({ children }: Readonly<{ children: string }>) {
  return (
    <PMText as="span" fontWeight={500} color="primary">
      {children}
    </PMText>
  );
}

/**
 * One type's candidates, headed the way the pane heads the same type. The count
 * is the group's own, so a filtered list says how much of itself it is showing.
 */
function CandidateGroup({
  group,
  showPackages,
  pickedKeys,
  onToggle,
  disabled,
}: Readonly<{
  group: InventoryGroup;
  showPackages: boolean;
  pickedKeys: ReadonlySet<string>;
  onToggle: (component: ContextComponent) => void;
  disabled: boolean;
}>) {
  return (
    <PMBox>
      <PMHStack gap={2} align="baseline">
        <PMText
          fontSize="10px"
          fontWeight="semibold"
          textTransform="uppercase"
          letterSpacing="wider"
          color="faded"
        >
          {group.label}
        </PMText>
        <PMText fontSize="10px" color="faded" fontVariantNumeric="tabular-nums">
          {group.entries.length}
        </PMText>
      </PMHStack>
      <PMBox
        marginTop={1}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {group.entries.map((entry, index) => (
          <CandidateRow
            key={componentSelectionKey(entry.component)}
            entry={entry}
            isFirst={index === 0}
            showPackages={showPackages}
            isPicked={pickedKeys.has(componentSelectionKey(entry.component))}
            onToggle={onToggle}
            disabled={disabled}
          />
        ))}
      </PMBox>
    </PMBox>
  );
}

/**
 * One candidate, as a checkbox wearing the whole row.
 *
 * Nothing inside the row is interactive on its own, which is the difference
 * with the pane's list: there the row is a link with the tick beside it, so
 * that ticking does not open the component. Here the row is the tick, and a
 * link to the component would be activated by the label around it and lose the
 * picks made so far.
 */
function CandidateRow({
  entry,
  isFirst,
  showPackages,
  isPicked,
  onToggle,
  disabled,
}: Readonly<{
  entry: InventoryEntry;
  isFirst: boolean;
  showPackages: boolean;
  isPicked: boolean;
  onToggle: (component: ContextComponent) => void;
  disabled: boolean;
}>) {
  const { component, packageNames } = entry;

  return (
    <PMCheckbox
      size="sm"
      checked={isPicked}
      onCheckedChange={() => onToggle(component)}
      disabled={disabled}
      inputProps={{ 'aria-label': `Add ${component.name}` }}
      width="full"
      gap={3}
      /*
        The control on the name's line, not centred on the row, the rule the
        type icon beside it follows and the one the pane's list follows since
        the same report. Two lines of content put a centred control between the
        name and the summary while the icon stayed on the name.
      */
      alignItems="flex-start"
      controlProps={{ marginTop: '0.14em' }}
      paddingX={3}
      paddingY="10px"
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
      _hover={{ bg: 'background.secondary' }}
      // The picked row stays legible once the pointer has left it, the rule the
      // pane's list follows for the same reason.
      bg={isPicked ? 'background.secondary' : undefined}
      transition="background-color 150ms ease-out"
      labelProps={{ flex: '1', minWidth: 0 }}
    >
      <PMBox display="flex" width="full" alignItems="center" gap={3}>
        <PMIcon
          fontSize="sm"
          color="text.faded"
          flexShrink={0}
          alignSelf="flex-start"
          marginTop="0.25em"
        >
          {COMPONENT_TYPE_ICONS[component.type]}
        </PMIcon>
        <PMBox flex={1} minW={0}>
          <PMText as="div" fontSize="sm" fontWeight="medium" truncate>
            {component.name}
          </PMText>
          {component.summary && (
            <PMText as="div" fontSize="xs" color="faded" truncate>
              {component.summary}
            </PMText>
          )}
          {showPackages && <CurrentPackages names={packageNames} />}
        </PMBox>
        <PMText
          fontSize="xs"
          color="faded"
          flexShrink={0}
          width="32px"
          textAlign="right"
          fontVariantNumeric="tabular-nums"
        >
          v{component.version}
        </PMText>
      </PMBox>
    </PMCheckbox>
  );
}

/**
 * Where the candidate already ships, on the row that would add one more place.
 *
 * Under the row's own text rather than in a column of its own, unlike the
 * inventory's list: this row is narrow, and the fact belongs to the decision the
 * tick makes rather than being a field to scan down.
 *
 * The empty case is said in words, in the same wording the inventory uses, and
 * it is the one the eye is looking for here: with the filter off it is what
 * separates the rows that cost nothing from the rows that start a second copy.
 * Only rendered where the filter is off — under it every row would read the
 * same, which is what the filter already said.
 */
function CurrentPackages({ names }: Readonly<{ names: readonly string[] }>) {
  const isFree = names.length === 0;
  const label = isFree
    ? 'In no package'
    : names.length === 1
      ? `In ${names[0]}`
      : `In ${names.length} packages`;

  return (
    <PMHStack
      gap="6px"
      paddingTop="2px"
      color={isFree ? 'text.secondary' : 'text.faded'}
    >
      <PMIcon fontSize="xs" flexShrink={0}>
        {isFree ? <LuPackageX /> : <LuPackage />}
      </PMIcon>
      <PMBox
        as="span"
        fontSize="xs"
        truncate
        // The whole list on hover: "3 packages" is the scannable form, but which
        // three is a fair question to ask without leaving the row.
        title={names.length > 1 ? names.join(', ') : undefined}
        fontStyle={isFree ? 'italic' : undefined}
      >
        {label}
      </PMBox>
    </PMHStack>
  );
}

/**
 * The two ways this drawer can have nothing to offer, told apart. Both arrive
 * as an empty list, and they ask for opposite things next: one wants a
 * component written, the other wants nothing at all.
 */
function NothingToAdd({
  packageName,
  spaceIsEmpty,
}: Readonly<{ packageName: string; spaceIsEmpty: boolean }>) {
  return (
    <PMVStack gap={1} alignItems="flex-start">
      <PMText variant="body">
        {spaceIsEmpty
          ? 'This space has no standard, command or skill yet.'
          : `${packageName} already holds everything in this space.`}
      </PMText>
      <PMText variant="small" color="faded">
        {spaceIsEmpty
          ? 'Create one from this package, and it joins the package as it is created.'
          : 'Anything created from now on can be added here.'}
      </PMText>
    </PMVStack>
  );
}
