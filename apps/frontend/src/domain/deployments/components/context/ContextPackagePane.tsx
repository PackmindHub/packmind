import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
import {
  LuEllipsisVertical,
  LuPackageMinus,
  LuPencil,
  LuPlus,
  LuRotateCw,
  LuTrash2,
} from 'react-icons/lu';
import type {
  GitProviderId,
  OrganizationId,
  PackageId,
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
import { countAddableComponents } from './buildAddableComponents';
import type { PackageAttention } from './buildPackageAttention';
import { buildPackageHeaderActions } from './buildPackageHeaderActions';
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
import type { SyncScope } from '../redesign/components/SyncSurface';
import { packageLockProfile } from '../redesign/selectors/installLock';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import { SelectionBar } from '../SelectionBar';
import { AddComponentsDrawer } from './AddComponentsDrawer';
import { EditPackageDetailsDrawer } from './EditPackageDetailsDrawer';
import { MoveComponentDrawer } from './MoveComponentDrawer';
import { usePackageDrift } from './usePackageDrift';
import { useDeleteContextComponent } from './useDeleteContextComponent';
import {
  useDeletePackagesBatchMutation,
  useListPackageDeploymentsQuery,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { DeployPackageButton } from '../PackageDeployments/DeployPackageButton';
import { RemoveArtifactFromPackageConfirm } from '../PackagesPopover';
import { RemovePackageFromTargetsDialog } from '../RemovePackageFromTargets';
import { listActiveDistributions } from '../../utils/listActiveDistributions';
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
  attention,
  onCreatePackage,
  onDeleted,
}: Readonly<{
  pkg: PackageResponse;
  /**
   * What this package needs a hand with, or undefined when it needs none. Built
   * by the surface rather than here, so the number on the Distribution tab and
   * the mark the rail puts on this package's row are the same number.
   */
  attention: PackageAttention | undefined;
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
  /*
   * The redistribute flow in progress, or null when there is none. Rendered by
   * the Distribution tab, owned here.
   *
   * Here rather than there because the tab is not the only way in: the header
   * above both tabs is what carries the package-wide push, and the flow has to
   * survive the tab switch that opening it from there implies. It also means a
   * flow started from the list is still there on the way back from the other
   * tab, where before it was thrown away by the tab unmounting.
   */
  const [syncScope, setSyncScope] = useState<SyncScope | null>(null);
  const [addingComponents, setAddingComponents] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [removingFromTargets, setRemovingFromTargets] = useState(false);

  /*
   * Read here for the menu item below, which has to know whether the package is
   * in any target before offering to take it out of them. The Distribution tab
   * asks the same query, and React Query answers both from one request.
   */
  const { data: deployments = [] } = useListPackageDeploymentsQuery(pkg.id);
  const isInAnyTarget = listActiveDistributions(deployments, pkg.id).length > 0;
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
   * Nothing in the package, which is what decides whether the header offers to
   * send it anywhere: there is nothing to send, and the distribute control is
   * absent rather than disabled. Read from the groups rather than from `total`,
   * so it agrees with the body below, which is showing its empty state off the
   * same condition.
   */
  const isEmpty = groups.length === 0;

  /*
   * How much of the space this package could still be given. The header reads
   * it as a yes or no: with something to pick, adding is the control's default
   * act and creating is the alternative behind its chevron; with nothing, there
   * is no list to open and creating is the only act there is.
   *
   * Counted rather than taken from the picker, which builds every candidate row
   * to reach the same number and only exists once the drawer is open.
   */
  const addableCount = useMemo(
    () => countAddableComponents(pkg, catalogue),
    [pkg, catalogue],
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
   * `installKeys` left undefined means every drifted destination, which is what
   * `SyncSurface` already reads it as. The caller decides which of the two it
   * is asking for; this only carries the answer.
   */
  const startSync = useCallback(
    (packageId: PackageId, installKeys?: string[]) =>
      setSyncScope({ kind: 'package', packageId, installKeys }),
    [],
  );

  const closeSync = useCallback(() => setSyncScope(null), []);

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

  /*
   * Read here for the header's own push. React Query answers this and the
   * identical call inside the Distribution tab from one request, so the two
   * cannot disagree about which providers can be written to.
   */
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo<Set<GitProviderId>>(
    () => providersWithTokenSet(providersResponse),
    [providersResponse],
  );

  /*
   * The two package-wide controls, decided together rather than each on its
   * own: which of them is loud is the whole question, and two conditions
   * written apart is how both ended up primary in the first place.
   *
   * The same lock reading the rail uses, so a package the rail flags as stuck
   * does not offer a live button here.
   */
  const headerActions = buildPackageHeaderActions({
    drift,
    isResolved: !isLoading && !isError,
    lockProfile: drift
      ? packageLockProfile(drift, providersWithToken, isProvidersLoading)
      : 'none',
  });

  /*
   * The push is asked for from a header that sits above both tabs, and it is
   * answered on one of them, so the tab comes along. Scoped to nothing, which
   * `SyncSurface` reads as every drifted destination: the header's count is the
   * whole of them, and the list is where a subset gets picked.
   */
  const updateDriftedDestinations = () => {
    showTab(DISTRIBUTION_TAB);
    startSync(pkg.id);
  };

  /*
   * Every way the package leaves Packmind, under one control: the repositories
   * it writes to, the marketplaces it publishes to, and the command a developer
   * runs in their own checkout. One menu and not one button per channel,
   * because the product does not treat them as different kinds of thing, and
   * the menu is where each edition already contributes the channels it has.
   *
   * Absent rather than disabled on an empty package: there is nothing to send
   * anywhere, which is what the package's own page already decided by hiding
   * its install block while a package is empty. A disabled primary would also
   * put the loudest control on the screen on the one thing that cannot be done
   * yet.
   *
   * Written once and asked for in two shapes, because the two call sites below
   * differ by the one prop and everything else about them has to stay the same.
   */
  const distributeControl = (trigger: 'standalone' | 'split') =>
    isEmpty ? null : (
      <DeployPackageButton
        label="Distribute"
        trigger={trigger}
        size="sm"
        variant={headerActions.distributeVariant}
        selectedPackages={[pkg]}
        cliInstall={{ spaceSlug, packageSlug: pkg.slug }}
      />
    );

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
              Creating and adding belong to the Content tab, so they leave with
              it. The header sits above both tabs and used to keep every verb on
              screen whatever the reader was looking at: on Distribution, two of
              the four controls wrote components, which is not the question that
              tab asks. Distribute stays on both, because it acts on the package
              and not on the list being shown.
            */}
            {/*
              One control for filling this package, whatever the way. It used to
              be two buttons, `Add components` and `Create`, and they asked the
              reader to sort their own intention before they could act on it: the
              intention is one, "get this into the package", and the two doors
              divided it by a fact about the space the reader does not hold. Is
              there already a standard about naming conventions in here? That is
              only knowable after opening the picker and searching it, which is
              behind one of the two doors.

              The labels made it worse by sitting on different axes, a noun
              phrase beside a bare verb, so they read as two subjects rather than
              two ways of doing one thing. And the line they drew was not even
              the real one: two of the four creation methods bring in something
              that already exists, from the samples library or from disk. What
              actually separates the halves is narrower, whether the component is
              already in this space.

              So they join, in the shape this header already uses for
              distributing. Picking from the space takes the wide half, since it
              is the act with a list behind it and the one a package being filled
              performs over and over, and the four ways of making something new
              keep the chevron. The seam is a pixel of the page showing between
              two halves of one colour.

              Creating sits here, on the pane, and not in the rail below the list
              of packages: the rail creates containers, this creates what goes in
              them, and side by side the two would read as the same gesture.

              Secondary in every state, both halves of it. The control used to go
              primary while the package was empty, on the grounds that filling it
              is the thing to do next, but the body below is already saying that
              in a sentence with its own primary button under it. Two loud
              controls asking for the same act, and once the space has nothing
              left to offer and this collapses to creating, they were the same
              control twice. So the invitation stays where the explanation is,
              and up here Distribute owns the one primary the header has.
            */}
            {tab === CONTENT_TAB &&
              (addableCount > 0 ? (
                <PMHStack gap="1px">
                  <PMButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setAddingComponents(true)}
                    borderEndRadius={0}
                  >
                    <PMIcon fontSize="xs">
                      <LuPlus />
                    </PMIcon>
                    Add components
                  </PMButton>
                  <ContextCreateMenu
                    orgSlug={orgSlug}
                    spaceSlug={spaceSlug}
                    packageId={pkg.id}
                    variant="secondary"
                    trigger="split"
                  />
                </PMHStack>
              ) : (
                /*
                  Nothing left in the space to pick, so the wide half has no
                  list to open and the control collapses to the one act that
                  remains. A greyed half saying "there is nothing here" would be
                  a sentence written as a button, and the drawer it refuses to
                  open is the only place that could explain itself.
                */
                <ContextCreateMenu
                  orgSlug={orgSlug}
                  spaceSlug={spaceSlug}
                  packageId={pkg.id}
                  variant="secondary"
                />
              ))}
            {/*
              One send control, whatever the state. Catching up where the
              package already is and reaching somewhere new are two questions,
              and the header used to ask both out loud, side by side: a
              `Distribute` menu and a primary `Update N destinations`. Two
              buttons, one verb as far as the reader is concerned, and no room
              up here to explain which one is theirs.

              So they join. The corrective push takes the wide half, since it is
              the one thing the state is asking for, and the open ended one
              keeps the chevron it already had. The seam is a pixel of the page
              showing between two halves of the same colour, which is what makes
              them read as one object rather than as two buttons that touch.

              Behind a chevron is a real cost for someone who came to add a
              destination while the package happens to be drifting. It is paid
              because the Distribution tab below keeps its own way to every
              destination, and because a second primary in the header is what
              sent us here.

              Disabled only when every drifted destination is stuck, where the
              tooltip is the answer. Absent when nothing is behind: there is
              nothing to catch up, and a greyed control saying so is a sentence
              written as a button.
            */}
            {headerActions.update ? (
              <PMHStack gap="1px">
                <PMTooltip
                  label={headerActions.update.lockTooltip}
                  placement="top"
                >
                  <PMButton
                    variant="primary"
                    size="sm"
                    disabled={headerActions.update.lockTooltip !== null}
                    onClick={updateDriftedDestinations}
                    borderEndRadius={isEmpty ? undefined : 0}
                  >
                    <PMIcon fontSize="xs">
                      <LuRotateCw />
                    </PMIcon>
                    {headerActions.update.label}
                  </PMButton>
                </PMTooltip>
                {distributeControl('split')}
              </PMHStack>
            ) : (
              distributeControl('standalone')
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
                    {/*
                      Taking the package back out of the targets it reached. It
                      used to be a button on the Distribution tab, at the same
                      weight as two controls that only changed what was on
                      screen; it belongs with the other thing on this pane that
                      undoes something, one menu away from a stray click.

                      Absent rather than disabled when the package is in no
                      target: the tab says so in a sentence, and a menu is a
                      list of what can be done.
                    */}
                    {isInAnyTarget && (
                      <PMMenu.Item
                        value="remove-package-from-targets"
                        onClick={() => setRemovingFromTargets(true)}
                      >
                        <PMHStack gap={2}>
                          <PMIcon>
                            <LuPackageMinus />
                          </PMIcon>
                          {PACKAGE_MESSAGES.removal.buttonLabel}
                        </PMHStack>
                      </PMMenu.Item>
                    )}
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
              {attention && (
                <PMTooltip label={attention.tooltip} showArrow>
                  <PMBadge
                    colorPalette={attention.tone === 'error' ? 'red' : 'orange'}
                    size="sm"
                  >
                    {attention.count}
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
          <EmptyPackageBody
            canAdd={addableCount > 0}
            onAdd={() => setAddingComponents(true)}
            create={
              <ContextCreateMenu
                orgSlug={orgSlug}
                spaceSlug={spaceSlug}
                packageId={pkg.id}
              />
            }
          />
        ) : (
          <PMVStack gap={5} align="stretch">
            {selection.length > 0 && (
              <SelectionBar
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
          syncScope={syncScope}
          onSyncPackage={startSync}
          onSyncClose={closeSync}
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
          packages={packages}
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
      {/*
        Outside the menu that opens it: clicking a menu item closes the menu, and
        a dialog mounted inside it would close with it.
      */}
      <RemovePackageFromTargetsDialog
        selectedPackage={pkg}
        distributions={deployments}
        open={removingFromTargets}
        onOpenChange={setRemovingFromTargets}
      />
    </PMTabsCompound.Root>
  );
}

/**
 * A package with nothing in it. It names what that costs rather than inviting
 * the user to admire an empty frame: an empty package gives an agent nothing to
 * read and distributes nothing.
 *
 * Two versions of that, because there were two situations and only one of them
 * was being answered. This told every reader to pick what the space already
 * owns, including the reader whose space owns nothing, and the picker it sent
 * them to then said the space was empty and pointed back here. A closed loop on
 * the first package of a new space, which is the first thing anyone sees.
 *
 * `canAdd` rather than a catalogue to look at, decided by the header off the
 * same count that chose its own shape: on an empty package the two questions are
 * one question, since a space with anything in it has everything in it to offer.
 */
function EmptyPackageBody({
  canAdd,
  onAdd,
  create,
}: Readonly<{ canAdd: boolean; onAdd: () => void; create: ReactNode }>) {
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
        distributes nothing.{' '}
        {canAdd
          ? 'Pick standards, commands or skills the space already owns, and it is distributable as soon as you add them.'
          : 'This space owns no standard, command or skill yet, so there is nothing to pick from: write the first one and it joins this package as it is created.'}
      </PMText>
      <PMBox paddingTop={4}>
        {canAdd ? (
          <PMButton variant="primary" size="sm" onClick={onAdd}>
            Add components
          </PMButton>
        ) : (
          create
        )}
      </PMBox>
    </PMBox>
  );
}
