import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  PMAlertDialog,
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMIconButton,
  PMMarkdownViewer,
  PMMenu,
  PMPortal,
  PMTabsCompound,
  PMText,
  PMTooltip,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import { LuEllipsisVertical, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import type {
  OrganizationId,
  PackageResponse,
  SkillFile,
  SpaceId,
} from '@packmind/types';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  componentSelectionKey,
  componentSetSubject,
  type ContextComponent,
  type ContextGroup,
  type SpaceCatalogue,
} from './buildPackageContext';
import { buildDistributionTabBadge } from './buildDistributionTabBadge';
import { componentIdsPayload } from './buildMoveTargets';
import {
  componentEditHref,
  componentEntryHref,
  packageDetailHref,
  packageDetailParams,
  withPaneDetailHref,
} from './buildComponentDetail';
import { ContextComponentDetail } from './ContextComponentDetail';
import { ContextSkillFileDetail } from './ContextSkillFileDetail';
import {
  COMPONENT_ACTION_ICONS,
  ContextComponentList,
} from './ContextComponentList';
import { ContextCreateMenu } from './ContextCreateMenu';
import { ContextPackageDistribution } from './ContextPackageDistribution';
import { ContextSelectionBar } from './ContextSelectionBar';
import { AddComponentsDrawer } from './AddComponentsDrawer';
import { EditPackageDetailsDrawer } from './EditPackageDetailsDrawer';
import { MoveComponentDrawer } from './MoveComponentDrawer';
import { usePackageDrift } from './usePackageDrift';
import { useDeleteContextComponent } from './useDeleteContextComponent';
import {
  useDeletePackagesBatchMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { RemoveArtifactFromPackageConfirm } from '../PackagesPopover';
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
  catalogue,
  groups,
  total,
  detail,
  detailFile,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
  onCreatePackage,
  onDeleted,
}: Readonly<{
  pkg: PackageResponse;
  /** The whole space, so a component can be moved without a second query. */
  packages: readonly PackageResponse[];
  /**
   * Everything the space owns, for the same reason: a component can be added to
   * this package without asking the server what there is to add.
   */
  catalogue: SpaceCatalogue;
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
  /**
   * Opens the drawer that names a new package, which the move drawer asks for
   * when there is nowhere to move to. The surface holds it: it is what decides
   * whether the new package is opened, and from here it must not be, or the
   * pane would be remounted out from under the drawer that asked.
   */
  onCreatePackage: () => void;
  /**
   * The package is gone, so the surface has to stop asking for it. Deleting is
   * the one action here that outlives the pane: everything else changes what
   * the pane shows, this removes what it was showing.
   */
  onDeleted: () => void;
}>) {
  const [searchParams, setSearchParams] = useSearchParams();
  /*
   * What is being moved, held here rather than in the row: the drawer has to
   * outlive the list it was opened from, because the move rebuilds that list
   * and the row the button sits on is gone by the time the toast appears.
   *
   * A list rather than one component, so a row's own button and the selection
   * bar open the same drawer. A move of one is a move of a list of one.
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
  const [addingComponents, setAddingComponents] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { mutateAsync: deletePackages, isPending: isDeleting } =
    useDeletePackagesBatchMutation();
  /*
   * Which component is being deleted, rather than a boolean, for the reason the
   * move dialog holds a list: the confirmation has to outlive the row and the
   * detail it was opened from, because deleting rebuilds both.
   */
  const [deletingComponent, setDeletingComponent] =
    useState<ContextComponent | null>(null);
  const { deleteComponent, isDeleting: isDeletingComponent } =
    useDeleteContextComponent({ spaceId, organizationId });
  /*
   * What is being taken out of this package, held as a list for the reason the
   * move is: the confirmation has to outlive the row and the detail it was
   * opened from, and one row or a whole selection ask the same question.
   */
  const [removing, setRemoving] = useState<readonly ContextComponent[] | null>(
    null,
  );
  /*
   * No `isPending` read from it: the confirmation below runs its own spinner off
   * the promise this returns, which is also what keeps it open when the call
   * fails.
   */
  const { mutateAsync: removeArtefacts } =
    useRemoveArtefactsFromPackageMutation();
  const { getDeployedTargets, getDeployedMarketplaces } =
    usePackageDeploymentStatus(spaceId, organizationId);
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

  /*
   * Nothing in the package, which is what decides where the header's primary
   * sits: on filling it while it is empty, on distributing it once it is not.
   * Read from the groups rather than from `total`, so it agrees with the body
   * below, which is showing its empty state off the same condition.
   */
  const isEmpty = groups.length === 0;

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

  /*
   * Deleting the component the pane is showing, which means the pane has to
   * stop showing it: the address is what says a component is open, so it is the
   * address that closes. The package stays selected, so what comes back is the
   * list the component was read from.
   */
  const deleteThisComponent = async (component: ContextComponent) => {
    try {
      await deleteComponent(component);
      pmToaster.create({
        type: 'success',
        title: `Deleted ${component.name}`,
        description: 'It is gone from the space, not only from this package.',
      });
      setDeletingComponent(null);
      setSearchParams(packageDetailParams(searchParams, pkg.id));
    } catch {
      pmToaster.create({
        type: 'error',
        title: `Couldn't delete ${component.name}`,
        description: 'Try again, or check your space access.',
      });
    }
  };

  /*
   * Taking components out of this package without taking them out of the space.
   *
   * The gesture the surface was missing: a component could be moved to another
   * package or deleted outright, so the only way to unbundle one was the edit
   * form on its own page. One call for the whole selection, because the remove
   * endpoint takes a bag of per-type ids: a partial removal would leave the pane
   * disagreeing with the package.
   *
   * Rethrows on failure rather than swallowing, which is how the confirmation
   * knows to stay open on the selection the user still wants to remove.
   */
  const removeFromPackage = async (components: readonly ContextComponent[]) => {
    try {
      await removeArtefacts({
        spaceId,
        packageId: pkg.id,
        ...componentIdsPayload(components),
      });
    } catch (error) {
      pmToaster.create({
        type: 'error',
        title: `Couldn't remove ${componentSetSubject(components)} from ${pkg.name}`,
        description: 'Try again, or check your space access.',
      });
      throw error;
    }

    pmToaster.create({
      type: 'success',
      title: `Removed ${componentSetSubject(components)} from ${pkg.name}`,
    });
    /*
     * Only the removed keys, rather than clearing the selection the way a move
     * does. A move is asked of the whole selection by definition; this is also
     * asked of one row, and dropping three unrelated ticks because a fourth row
     * left would undo work the user did not ask to undo.
     */
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      for (const component of components) {
        next.delete(componentSelectionKey(component));
      }
      return next;
    });
    /*
     * The component on screen just left the package this pane is showing, so the
     * address that says it is open has to close, exactly as it does when one is
     * deleted. It still exists, and its own page is still where it is read.
     */
    if (
      detail &&
      components.some(
        (component) =>
          componentSelectionKey(component) === componentSelectionKey(detail),
      )
    ) {
      setSearchParams(packageDetailParams(searchParams, pkg.id));
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
   * Built once and rendered by whichever half is on screen. The drawer has to
   * outlive the thing it was opened from: from the list, the move rebuilds that
   * list, and from the detail, the move empties the detail.
   */
  const moveDrawer = moving && moving.length > 0 && (
    <MoveComponentDrawer
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) setMoving(null);
      }}
      components={moving}
      source={pkg}
      packages={packages}
      spaceId={spaceId}
      organizationId={organizationId}
      onCreatePackage={onCreatePackage}
      onMoved={clearSelection}
    />
  );

  /*
   * The confirmation the old navigation already asks this question with, rather
   * than a second one written here. Removing an artefact from a package is one
   * question, and two dialogs asking it would be two chances to promise
   * different things about where the component ends up. It runs its own spinner
   * and closes itself on success, so all this passes it is what it is about.
   *
   * Built beside the delete dialog and rendered in both branches, for the same
   * reason: the row and the detail it was opened from are both rebuilt by its
   * own success.
   */
  const removeComponentsDialog = removing && removing.length > 0 && (
    <RemoveArtifactFromPackageConfirm
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) setRemoving(null);
      }}
      packageName={pkg.name}
      deployedTargets={getDeployedTargets(pkg.id)}
      deployedMarketplaces={getDeployedMarketplaces(pkg.id)}
      artifactNames={removing.map((component) => component.name)}
      onConfirm={() => removeFromPackage(removing)}
    />
  );

  /*
   * Built here rather than inside the detail, and rendered in both branches of
   * this pane, because the component it is confirming the deletion of stops
   * existing the moment it is confirmed: a dialog living inside the detail
   * would be unmounted by its own success.
   */
  const deleteComponentDialog = deletingComponent && (
    <PMAlertDialog
      title={`Delete ${COMPONENT_TYPE_LABELS_SINGULAR[
        deletingComponent.type
      ].toLowerCase()}`}
      message={`Delete "${deletingComponent.name}"? It leaves the space, not just this package, and every package that holds it. This cannot be undone.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={() => void deleteThisComponent(deletingComponent)}
      open
      onOpenChange={({ open }) => {
        if (!open) setDeletingComponent(null);
      }}
      isLoading={isDeletingComponent}
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
              editHref={componentEditHref(
                detail,
                { orgSlug, spaceSlug },
                pkg.id,
              )}
              onMove={() => setMoving([detail])}
              onRemove={() => setRemoving([detail])}
              onDelete={() => setDeletingComponent(detail)}
            />
          )}
        </PMBox>
        {moveDrawer}
        {removeComponentsDialog}
        {deleteComponentDialog}
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
              <PMBox color="secondary" paddingTop={1}>
                {/*
                  Rendered, not printed. The description is markdown, which the
                  package's own page has always shown as markdown while this
                  header showed the asterisks. Nobody noticed while descriptions
                  could only be written on a page; the dialog beside this heading
                  makes writing one from here the normal way, so the two
                  surfaces have to agree on what the field is.
                */}
                <PMMarkdownViewer content={pkg.description} />
              </PMBox>
            )}
          </PMBox>
          <PMHStack flexShrink={0} gap={2}>
            {/*
              Adding what exists, beside creating what does not. Two controls
              and not one menu: the question "which of these do I want" and the
              question "what kind of thing am I writing" are answered from
              opposite ends, one by a list of the space and one by a list of
              types, and folding them together would hide whichever one the
              reader came for behind the other.
            */}
            <PMButton
              variant="secondary"
              size="sm"
              onClick={() => setAddingComponents(true)}
            >
              <PMIcon fontSize="xs">
                <LuPlus />
              </PMIcon>
              Add components
            </PMButton>
            {/*
              Creating sits here, on the pane, and not in the rail below the list
              of packages: the rail creates containers, this creates what goes in
              them, and side by side the two would read as the same gesture.

              It carries the primary only while the package is empty, which is
              the one state where filling it is the thing to do next. As soon as
              there is something in it, getting it out is.
            */}
            <ContextCreateMenu
              orgSlug={orgSlug}
              spaceSlug={spaceSlug}
              packageId={pkg.id}
              variant={isEmpty ? 'primary' : 'secondary'}
            />
            {/*
              Every way the package leaves Packmind, under one control: the
              repositories it writes to, the marketplaces it publishes to, and
              the command a developer runs in their own checkout. One menu and
              not one button per channel, because the product does not treat
              them as different kinds of thing, and the menu is where each
              edition already contributes the channels it has.

              Absent rather than disabled on an empty package: there is nothing
              to send anywhere, which is what the package's own page already
              decided by hiding its install block while a package is empty. A
              disabled primary would also put the loudest control on the screen
              on the one thing that cannot be done yet.
            */}
            {!isEmpty && (
              <DeployPackageButton
                label="Distribute"
                size="sm"
                selectedPackages={[pkg]}
                cliInstall={{ spaceSlug, packageSlug: pkg.slug }}
              />
            )}
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
                    {/*
                      Renaming, in the menu beside the deletion rather than as a
                      link out: the name and the description are two fields, and
                      the screen they are corrected from is this one.
                    */}
                    <PMMenu.Item
                      value="edit-package-details"
                      onClick={() => setEditingDetails(true)}
                    >
                      <PMHStack gap={2}>
                        <PMIcon>
                          <LuPencil />
                        </PMIcon>
                        Edit details
                      </PMHStack>
                    </PMMenu.Item>
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
          <EmptyPackageBody onAdd={() => setAddingComponents(true)} />
        ) : (
          <PMVStack gap={5} align="stretch">
            {selection.length > 0 && (
              <ContextSelectionBar
                count={selection.length}
                actions={[
                  {
                    label: 'Move to another package',
                    icon: COMPONENT_ACTION_ICONS.move,
                    onAct: () => setMoving(selection),
                  },
                  {
                    /*
                      Second, so the one that changes what gets distributed is
                      not the one nearest the pointer coming off the list.
                    */
                    label: 'Remove from package',
                    icon: COMPONENT_ACTION_ICONS.remove,
                    onAct: () => setRemoving(selection),
                  },
                ]}
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
                    onRemove={(component) => setRemoving([component])}
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
        />
      </PMTabsCompound.Content>

      {moveDrawer}
      {removeComponentsDialog}
      {deleteComponentDialog}
      {/*
        Mounted only while it is open, like the drawer below it, so the picks
        start empty every time: what was ticked and abandoned last time is not a
        draft worth keeping, and the candidates it was ticked from may not even
        be candidates any more.
      */}
      {addingComponents && (
        <AddComponentsDrawer
          pkg={pkg}
          catalogue={catalogue}
          spaceId={spaceId}
          organizationId={organizationId}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setAddingComponents(false);
          }}
        />
      )}
      {/*
        Mounted only while it is open, rather than kept around hidden, so its two
        fields start from what the package currently says: they are drafts held
        inside the drawer, and a drawer that outlived its own closing would
        reopen on the edits that were abandoned last time.
      */}
      {editingDetails && (
        <EditPackageDetailsDrawer
          pkg={pkg}
          spaceId={spaceId}
          organizationId={organizationId}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingDetails(false);
          }}
        />
      )}
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
 * A package with nothing in it. It names what that costs rather than inviting
 * the user to admire an empty frame: an empty package gives an agent nothing to
 * read and distributes nothing.
 */
function EmptyPackageBody({ onAdd }: Readonly<{ onAdd: () => void }>) {
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
        distributes nothing. Pick standards, commands or skills the space
        already owns, and it is distributable as soon as you add them.
      </PMText>
      <PMBox paddingTop={4}>
        <PMButton variant="primary" size="sm" onClick={onAdd}>
          Add components
        </PMButton>
      </PMBox>
    </PMBox>
  );
}
