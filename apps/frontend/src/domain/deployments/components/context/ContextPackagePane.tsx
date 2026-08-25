import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  PMAlertDialog,
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMIconButton,
  PMMenu,
  PMPortal,
  PMTabsCompound,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuEllipsisVertical, LuTrash2 } from 'react-icons/lu';
import type {
  OrganizationId,
  PackageResponse,
  SkillFile,
  SpaceId,
} from '@packmind/types';
import {
  componentSelectionKey,
  type ContextComponent,
  type ContextGroup,
} from './buildPackageContext';
import { buildDistributionTabBadge } from './buildDistributionTabBadge';
import {
  componentEditHref,
  componentEntryHref,
  packageDetailHref,
  withPaneDetailHref,
} from './buildComponentDetail';
import { ContextComponentDetail } from './ContextComponentDetail';
import { ContextSkillFileDetail } from './ContextSkillFileDetail';
import { ContextComponentList } from './ContextComponentList';
import { ContextCreateMenu } from './ContextCreateMenu';
import { ContextPackageDistribution } from './ContextPackageDistribution';
import { MoveComponentDialog } from './MoveComponentDialog';
import { usePackageDrift } from './usePackageDrift';
import { useDeletePackagesBatchMutation } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_MESSAGES } from '../../constants/messages';

const CONTENT_TAB = 'content';
const DISTRIBUTION_TAB = 'distribution';

/**
 * Which half of the package is being read. The same parameter name the package
 * page uses for its own tabs, and in the URL for the same reason the selected
 * package is: "this package is behind in two repositories" is a thing people
 * send each other, and it has to survive being pasted.
 */
const TAB_PARAM = 'tab';

/**
 * One package, read from two sides: what it holds, and where it landed.
 *
 * The two are one screen rather than two because they are one question asked
 * twice. A package is a promise that a set of components reaches a set of
 * repositories, and the components alone say nothing about whether the promise
 * is kept. The badge on the Distribution tab is what makes the second half
 * legible without opening it.
 *
 * A component opened from the Content tab takes the place of both halves: it is
 * read here rather than on a page of its own, and the way back is one link.
 * Which types can be read here is `RENDERS_IN_PANE`.
 *
 * It arrives already resolved rather than read from the address here, because
 * the surface needs the same answer for the rail beside this pane, and one
 * parameter read in two places is one chance too many to disagree.
 */
export function ContextPackagePane({
  pkg,
  packages,
  groups,
  total,
  detail,
  detailFile,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
  packageHref,
  packageEditHref,
  distributionHistoryHref,
  onDeleted,
}: Readonly<{
  pkg: PackageResponse;
  /** The whole space, so a component can be moved without a second query. */
  packages: readonly PackageResponse[];
  /** What this package holds, grouped by type, built by the surface. */
  groups: readonly ContextGroup[];
  /** Components in the package, which the Content tab carries as its count. */
  total: number;
  /** The component the address asks for, or null to show the list. */
  detail: ContextComponent | null;
  /** One of that component's files, or null to show the component itself. */
  detailFile: SkillFile | null;
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
  /** The package's own page, which still holds everything not moved here. */
  packageHref: string;
  /** Where membership is chosen, until a component can be added from here. */
  packageEditHref: string;
  /** Where the distribution events of this package are listed. */
  distributionHistoryHref: string;
  /**
   * The package is gone, so the surface has to stop asking for it. Deleting is
   * the one action here that outlives the pane: everything else changes what
   * the pane shows, this removes what it was showing.
   */
  onDeleted: () => void;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  /*
   * What is being moved, held here rather than in the row: the dialog has to
   * outlive the list it was opened from, because the move rebuilds that list
   * and the row the button sits on is gone by the time the toast appears.
   *
   * A list rather than one component, so a row's own button and the selection
   * bar open the same dialog. A move of one is a move of a list of one.
   */
  const [moving, setMoving] = useState<readonly ContextComponent[] | null>(
    null,
  );
  /*
   * What is picked, by `componentSelectionKey` rather than by component: the
   * groups are rebuilt on every render of the surface, so holding the objects
   * would compare identities that change for reasons that have nothing to do
   * with the selection.
   *
   * Not in the URL, unlike the open package and the open component. A selection
   * is a gesture in progress, not a place: it means nothing to send to someone,
   * and it is over as soon as it is acted on. The pane is keyed by package in
   * the surface, so changing package drops it, which is what leaving the list
   * it was made in should do.
   */
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mutateAsync: deletePackages, isPending: isDeleting } =
    useDeletePackagesBatchMutation();
  /*
   * The picked components, resolved against what the package still holds. That
   * is also what repairs the selection after a move: the components that left
   * are no longer in the groups, so they drop out of it on their own.
   */
  const selection = useMemo(
    () =>
      groups
        .flatMap((group) => group.components)
        .filter((component) =>
          selectedKeys.has(componentSelectionKey(component)),
        ),
    [groups, selectedKeys],
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

  /*
   * The batch mutation with one id in it, which is what the package page does
   * too: there is no single-package endpoint, and reaching for one here would
   * be a second way of deleting a package that could start behaving
   * differently.
   */
  const deleteThisPackage = async () => {
    try {
      await deletePackages({
        packageIds: [pkg.id],
        spaceId,
        organizationId,
      });
      pmToaster.create({
        type: 'success',
        title: `Deleted ${pkg.name}`,
        description:
          'The standards, commands and skills it held stay in the space.',
      });
      setConfirmingDelete(false);
      onDeleted();
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't delete ${pkg.name}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  const tab =
    searchParams.get(TAB_PARAM) === DISTRIBUTION_TAB
      ? DISTRIBUTION_TAB
      : CONTENT_TAB;

  const showTab = (value: string) => {
    // Mutating the params we were handed, so the selected package survives the
    // tab change. Content is the default, so it leaves the URL clean.
    setSearchParams(
      (previous) => {
        if (value === CONTENT_TAB) previous.delete(TAB_PARAM);
        else previous.set(TAB_PARAM, value);
        return previous;
      },
      { replace: true },
    );
  };

  /*
   * Renamed on the way in: `packages` is now the space's package list, and the
   * drift hook returns the landings of this one package.
   */
  const {
    drift,
    packages: driftPackages,
    isLoading,
    isError,
  } = usePackageDrift(pkg.id);
  const distributionBadge = buildDistributionTabBadge(drift);

  /*
   * Built once and rendered by whichever half is on screen. The dialog has to
   * outlive the thing it was opened from: from the list, the move rebuilds that
   * list, and from the detail, the move empties the detail.
   */
  const moveDialog = moving && moving.length > 0 && (
    <MoveComponentDialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) setMoving(null);
      }}
      components={moving}
      source={pkg}
      packages={packages}
      spaceId={spaceId}
      organizationId={organizationId}
      orgSlug={orgSlug}
      spaceSlug={spaceSlug}
      onMoved={clearSelection}
    />
  );

  /*
   * The third thing this pane can show, beside its two tabs: one of the
   * components, in place of the tab strip rather than under it.
   */
  if (detail) {
    return (
      <>
        <PMBox flex="1" minH={0} overflowY="auto">
          {/*
            A file in place of the component, not beside it. The tree in the
            rail is what says which of the two is on screen, and the component
            is one row of it: its first.
          */}
          {detailFile ? (
            <ContextSkillFileDetail
              file={detailFile}
              skillName={detail.name}
              backHref={componentEntryHref(searchParams)}
            />
          ) : (
            <ContextComponentDetail
              component={detail}
              packageName={pkg.name}
              backHref={packageDetailHref(searchParams, pkg.id)}
              editHref={componentEditHref(detail, { orgSlug, spaceSlug })}
              onMove={() => setMoving([detail])}
            />
          )}
        </PMBox>
        {moveDialog}
      </>
    );
  }

  return (
    <PMTabsCompound.Root
      value={tab}
      onValueChange={(details) => showTab(details.value)}
      variant="line"
      height="100%"
      minH={0}
      display="flex"
      flexDirection="column"
      lazyMount
      unmountOnExit
    >
      <PMBox paddingX={6} paddingTop={6} flexShrink={0}>
        <PMHStack align="start" justify="space-between" gap={6}>
          <PMBox minW={0} maxWidth="68ch">
            <PMHeading level="h2">{pkg.name}</PMHeading>
            {pkg.description && (
              <PMText as="div" color="secondary" paddingTop={1}>
                {pkg.description}
              </PMText>
            )}
          </PMBox>
          <PMHStack flexShrink={0} gap={2}>
            {/*
              The way out to everything this surface does not carry yet:
              edition, deletion, marketplace publication. Secondary, because
              reading the package is what this screen is for.
            */}
            <PMButton variant="secondary" size="sm" asChild>
              <Link to={packageHref}>Open package</Link>
            </PMButton>
            {/*
              Creating sits here, on the pane, and not in the rail below the list
              of packages: the rail creates containers, this creates what goes in
              them, and side by side the two would read as the same gesture.
            */}
            <ContextCreateMenu
              orgSlug={orgSlug}
              spaceSlug={spaceSlug}
              packageId={pkg.id}
            />
            {/*
              Deleting the package, behind a menu rather than beside the two
              buttons: the plugin-first navigation has no packages list, so this
              is the only place the action exists, and a destructive control on
              a screen made for reading should not be one stray click from the
              one that creates things.
            */}
            <PMMenu.Root>
              <PMMenu.Trigger asChild>
                <PMIconButton
                  aria-label={`More actions for ${pkg.name}`}
                  variant="tertiary"
                  size="sm"
                >
                  <LuEllipsisVertical />
                </PMIconButton>
              </PMMenu.Trigger>
              <PMPortal>
                <PMMenu.Positioner>
                  <PMMenu.Content>
                    <PMMenu.Item
                      value="delete-package"
                      color="text.error"
                      onClick={() => setConfirmingDelete(true)}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>
                          <LuTrash2 />
                        </PMIcon>
                        Delete package
                      </PMHStack>
                    </PMMenu.Item>
                  </PMMenu.Content>
                </PMMenu.Positioner>
              </PMPortal>
            </PMMenu.Root>
          </PMHStack>
        </PMHStack>

        <PMBox paddingTop={5}>
          <PMTabsCompound.List>
            <PMTabsCompound.Trigger value={CONTENT_TAB}>
              Content
              {/*
                The count travels on the tab rather than under the package name:
                it is what tells the size of the half you are not looking at.
              */}
              <PMText
                fontSize="xs"
                color="faded"
                fontVariantNumeric="tabular-nums"
              >
                {total}
              </PMText>
            </PMTabsCompound.Trigger>
            <PMTabsCompound.Trigger value={DISTRIBUTION_TAB}>
              Distribution
              {distributionBadge && (
                <PMTooltip label={distributionBadge.tooltip} showArrow>
                  <PMBadge colorPalette="orange" size="sm">
                    {distributionBadge.text}
                  </PMBadge>
                </PMTooltip>
              )}
            </PMTabsCompound.Trigger>
          </PMTabsCompound.List>
        </PMBox>
      </PMBox>

      <PMTabsCompound.Content
        value={CONTENT_TAB}
        flex="1"
        minH={0}
        overflowY="auto"
        paddingX={6}
        paddingY={5}
      >
        {groups.length === 0 ? (
          <EmptyPackageBody packageEditHref={packageEditHref} />
        ) : (
          <PMVStack gap={5} align="stretch">
            {selection.length > 0 && (
              <SelectionBar
                count={selection.length}
                onMove={() => setMoving(selection)}
                onClear={clearSelection}
              />
            )}
            {groups.map((group) => (
              <PMBox key={group.type}>
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
                  {/*
                    The per-group count has no other home: there is no filter bar
                    above the list, and it is what gives the breakdown of a
                    package without opening every group.
                  */}
                  <PMText
                    fontSize="10px"
                    color="faded"
                    fontVariantNumeric="tabular-nums"
                  >
                    {group.components.length}
                  </PMText>
                </PMHStack>
                <PMBox paddingTop={1}>
                  <ContextComponentList
                    entries={group.components.map((component) => ({
                      // Pointed at this pane for the types it can show, and at
                      // the component's own page for the ones it cannot yet.
                      component: withPaneDetailHref(
                        component,
                        searchParams,
                        pkg.id,
                      ),
                    }))}
                    onMove={(component) => setMoving([component])}
                    selectedKeys={selectedKeys}
                    onToggleSelect={toggleSelect}
                  />
                </PMBox>
              </PMBox>
            ))}
          </PMVStack>
        )}
      </PMTabsCompound.Content>

      <PMTabsCompound.Content
        value={DISTRIBUTION_TAB}
        flex="1"
        minH={0}
        display="flex"
        flexDirection="column"
        padding={0}
      >
        <ContextPackageDistribution
          pkg={pkg}
          drift={drift}
          packages={driftPackages}
          isLoading={isLoading}
          isError={isError}
          distributionHistoryHref={distributionHistoryHref}
        />
      </PMTabsCompound.Content>

      {moveDialog}
      {/*
        What the message adds to the confirmation the packages list uses: a
        package is a set of memberships, so deleting one is not deleting what it
        holds, and that is the question the dialog is answering.
      */}
      <PMAlertDialog
        title="Delete package"
        message={`${PACKAGE_MESSAGES.confirmation.deletePackage(
          pkg.name,
        )} The standards, commands and skills it holds stay in the space.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => void deleteThisPackage()}
        open={confirmingDelete}
        onOpenChange={({ open }) => setConfirmingDelete(open)}
        isLoading={isDeleting}
      />
    </PMTabsCompound.Root>
  );
}

/**
 * What is picked, and what can be done with it.
 *
 * Sticky at the top of the list rather than at the bottom of the pane: a
 * selection is made by running down a list, so the row that was just ticked is
 * near the pointer and the action has to be too. Pinned because a package with
 * four groups out-scrolls the viewport, and a bar left at the top of the
 * document would be off screen exactly when it is needed.
 *
 * It counts rather than naming: at three components the names no longer fit on
 * the line, and the list behind the bar is already showing which ones they are.
 */
function SelectionBar({
  count,
  onMove,
  onClear,
}: Readonly<{ count: number; onMove: () => void; onClear: () => void }>) {
  return (
    <PMHStack
      position="sticky"
      top={0}
      zIndex={1}
      gap={3}
      align="center"
      justify="space-between"
      paddingX={3}
      paddingY={2}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      bg="background.secondary"
    >
      <PMText fontSize="sm" fontWeight="medium">
        {count} selected
      </PMText>
      <PMHStack gap={2}>
        <PMButton variant="secondary" size="xs" onClick={onMove}>
          Move to another package
        </PMButton>
        <PMButton variant="tertiary" size="xs" onClick={onClear}>
          Clear
        </PMButton>
      </PMHStack>
    </PMHStack>
  );
}

/**
 * A package with nothing in it. It names what that costs rather than inviting
 * the user to admire an empty frame: an empty package gives an agent nothing to
 * read and distributes nothing.
 */
function EmptyPackageBody({
  packageEditHref,
}: Readonly<{ packageEditHref: string }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMText as="div" fontWeight="medium">
        This package is empty.
      </PMText>
      <PMText as="div" color="secondary" paddingTop={1}>
        A package with no component gives an agent nothing to read and
        distributes nothing. Add standards, commands or skills to it from its
        own edit form, and it is distributable as soon as you save.
      </PMText>
      <PMBox paddingTop={4}>
        <PMButton variant="primary" size="sm" asChild>
          <Link to={packageEditHref}>Add components</Link>
        </PMButton>
      </PMBox>
    </PMBox>
  );
}
