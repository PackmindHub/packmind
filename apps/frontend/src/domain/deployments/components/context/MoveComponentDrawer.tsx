import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMIcon,
  PMInput,
  PMLink,
  PMPortal,
  PMText,
  PMVStack,
  pmToaster,
} from '@packmind/ui';
import type {
  OrganizationId,
  PackageId,
  PackageResponse,
  SpaceId,
} from '@packmind/types';
import { routes } from '../../../../shared/utils/routes';
import {
  useAddArtefactsToPackagesMutation,
  useRemoveArtefactsFromPackageMutation,
} from '../../api/queries/DeploymentsQueries';
import { usePackageDeploymentStatus } from '../../hooks/usePackageDeploymentStatus';
import { deployedPlaceParts } from '../PackagesPopover';
import {
  buildMoveTargets,
  componentIdsPayload,
  filterMoveTargets,
  holdsEverything,
  movedComponentCount,
  packageHoldsComponent,
  type MoveTarget,
} from './buildMoveTargets';
import {
  COMPONENT_TYPE_LABELS,
  COMPONENT_TYPE_LABELS_SINGULAR,
  type ContextComponent,
} from './buildPackageContext';

/** Above this many candidates the list gets a filter rather than a scroll. */
const SEARCHABLE_FROM = 7;

/**
 * Moving what is picked out of the package it is being read from and into
 * another one of the same space: one component, or a whole selection.
 *
 * A drawer, like the other panels that edit something in place. What is on
 * screen is a list of candidate packages with notes on each, which is a panel to
 * work through rather than a question to answer, and it leaves the surface it
 * was opened from visible beside it: the package the components are leaving
 * stays in view while the destination is picked.
 *
 * With no source it is the same drawer with one half missing. Components read
 * from the space inventory are not being read out of a package, so there is
 * nothing for them to leave: the add is the whole operation and the wording says
 * join rather than move. Most of them will be components no package carries,
 * which is what the inventory's filter is for, but not all, so the drawer counts
 * how many have none rather than assuming. Same drawer rather than a second one:
 * the list of candidates, the already-holds notes and the deployment warnings
 * are the same question asked of the same packages, and two of them would have
 * answered it two ways.
 *
 * There is no move endpoint: the server knows how to add components to a
 * package and how to remove them from one. The order is what makes it a move
 * rather than a gap: the add goes first, so a failure between the two leaves
 * the components in both packages instead of in none. That state is recoverable
 * from this same drawer, which then offers to remove them from here.
 *
 * A selection is two calls, not two calls per component. Both mutations take a
 * bag of ids grouped by type, so a mixed selection leaves the source in one
 * request and cannot half-leave it.
 *
 * One drawer and no second confirmation, unlike the manage-packages drawer.
 * What that one confirms is a removal it presents as a removal; here the
 * word on the button is already "move", the destination is already picked, and
 * what a removal would cost is on screen before the click: the banner names the
 * repositories the source is live on, and each row names the ones the
 * destination is live on.
 */
export function MoveComponentDrawer({
  open,
  onOpenChange,
  components,
  source,
  packages,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
  onMoved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being moved, in the order it was read. Never empty. */
  components: readonly ContextComponent[];
  /**
   * The package the components are being read from, and the one they leave.
   * Null when they are read from the space inventory and belong to none.
   */
  source: PackageResponse | null;
  /** Every package of the space, membership ids included. */
  packages: readonly PackageResponse[];
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
  /**
   * The move went through, so whoever holds the selection can drop it. Called
   * before the drawer closes, and only on the path where the source no longer
   * holds what was picked.
   */
  onMoved?: () => void;
}>) {
  const [query, setQuery] = useState('');
  const [busyPackageId, setBusyPackageId] = useState<PackageId | null>(null);

  const { mutateAsync: addArtefacts } = useAddArtefactsToPackagesMutation();
  const { mutateAsync: removeArtefacts } =
    useRemoveArtefactsFromPackageMutation();
  const { getDeployedTargets, getDeployedMarketplaces } =
    usePackageDeploymentStatus(spaceId, organizationId);
  /* Read often enough below that the comparison is worth a name. */
  const single = components.length === 1;

  const targets = useMemo(
    () => buildMoveTargets(packages, components, source?.id ?? null),
    [packages, components, source],
  );
  const shown = useMemo(
    () => filterMoveTargets(targets, query),
    [targets, query],
  );

  /*
   * What the selection is called. A mixed one has no kind of its own, so it is
   * "components": naming the first type would say something untrue about the
   * rest, and counting the types would read as a summary of the list the user
   * just built.
   */
  const types = new Set(components.map((picked) => picked.type));
  const kind =
    components.length === 1
      ? COMPONENT_TYPE_LABELS_SINGULAR[components[0].type].toLowerCase()
      : types.size === 1
        ? COMPONENT_TYPE_LABELS[components[0].type].toLowerCase()
        : 'components';
  /* What a message calls them: one is named, several are counted. */
  const subject =
    components.length === 1
      ? components[0].name
      : `${components.length} ${kind}`;
  /*
   * How many of the picked components no package carries. Read off the same
   * package list the candidates are built from, so the sentence and the rows
   * cannot disagree. Only used without a source: with one, every picked
   * component is in at least that package.
   */
  const unplaced = components.filter(
    (component) =>
      !packages.some((pkg) => packageHoldsComponent(pkg, component)),
  ).length;

  const sourcePlaces = source
    ? deployedPlaceParts(
        getDeployedTargets(source.id),
        getDeployedMarketplaces(source.id),
      ).join(' and ')
    : '';

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setQuery('');
  };

  const apply = async (target: MoveTarget) => {
    setBusyPackageId(target.pkg.id);
    let added = false;
    try {
      /*
       * Only what the destination does not carry yet. Sending the whole
       * selection would be harmless for the server and wrong for the reader:
       * the outcome it reports would cover memberships this move did not
       * create.
       */
      if (target.missing.length > 0) {
        const outcomes = await addArtefacts({
          spaceId,
          entries: [
            {
              packageId: target.pkg.id,
              ...componentIdsPayload(target.missing),
            },
          ],
        });
        if (outcomes.some((outcome) => !outcome.ok)) {
          pmToaster.create({
            type: 'error',
            title: `Couldn't add to ${target.pkg.name}`,
            description: source
              ? `${subject} ${
                  components.length === 1 ? 'is' : 'are'
                } still in ${source.name}.`
              : 'Nothing was added.',
          });
          return;
        }
        added = true;
      }

      /*
       * Skipped without a source: what was picked is in no package, so there is
       * nothing to leave and the add was the whole operation.
       */
      if (source) {
        await removeArtefacts({
          spaceId,
          packageId: source.id,
          ...componentIdsPayload(components),
        });
      }

      pmToaster.create({
        type: 'success',
        title: !source
          ? `Added to ${target.pkg.name}`
          : holdsEverything(target)
            ? `Removed from ${source.name}`
            : `Moved to ${target.pkg.name}`,
        description: `${subject} now ${
          components.length === 1 ? 'ships' : 'ship'
        } with ${target.pkg.name}.`,
      });
      onMoved?.();
      handleOpenChange(false);
    } catch {
      pmToaster.create({
        type: 'error',
        // The half-done state, said in full. What was picked is in both
        // packages and the drawer can finish the job: reopening it on the same
        // destination now offers to remove it from here.
        title: !source
          ? `Couldn't add to ${target.pkg.name}`
          : added
            ? `${subject} ${components.length === 1 ? 'is' : 'are'} in both packages`
            : `Couldn't remove from ${source.name}`,
        description:
          source && added
            ? `Added to ${target.pkg.name} but not removed from ${source.name}. Move again to finish.`
            : 'Try again, or check your space access.',
      });
    } finally {
      setBusyPackageId(null);
    }
  };

  return (
    <PMDrawer.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={busyPackageId === null}
      placement="end"
      size="lg"
    >
      <PMPortal>
        <PMDrawer.Backdrop />
        <PMDrawer.Positioner>
          <PMDrawer.Content>
            <PMDrawer.Header>
              <PMDrawer.Title>
                {source ? `Move ${subject}` : `Add ${subject} to a package`}
              </PMDrawer.Title>
              <PMDrawer.CloseTrigger asChild>
                <PMCloseButton disabled={busyPackageId !== null} />
              </PMDrawer.CloseTrigger>
            </PMDrawer.Header>

            <PMDrawer.Body>
              <PMVStack gap={4} alignItems="stretch">
                {targets.length > 0 && (
                  <PMText variant="body" color="secondary">
                    {source ? (
                      <>
                        {single ? 'This' : 'These'} {single ? kind : subject}{' '}
                        {single ? 'leaves' : 'leave'}{' '}
                        <PMText as="span" fontWeight={500} color="primary">
                          {source.name}
                        </PMText>{' '}
                        and {single ? 'joins' : 'join'} the package you pick.{' '}
                        {single ? 'It stays' : 'They stay'} in your library
                        either way.
                      </>
                    ) : unplaced === components.length ? (
                      <>
                        {single ? 'This' : 'These'} {single ? kind : subject}{' '}
                        {single ? 'is' : 'are'} in no package, so nothing
                        distributes {single ? 'it' : 'them'} yet.{' '}
                        {single ? 'It joins' : 'They join'} the package you
                        pick.
                      </>
                    ) : (
                      <>
                        {single ? 'This' : 'These'} {single ? kind : subject}{' '}
                        {single ? 'joins' : 'join'} the package you pick and{' '}
                        {single ? 'stays' : 'stay'} in the ones already carrying{' '}
                        {single ? 'it' : 'them'}.
                        {unplaced > 0 &&
                          ` ${unplaced} of them ${
                            unplaced === 1 ? 'is' : 'are'
                          } in no package today.`}
                      </>
                    )}
                  </PMText>
                )}

                {/*
                  `sourcePlaces` is only ever set when there is a source, but
                  naming the source in the condition is what says so to the
                  reader and to the compiler.
                */}
                {source && sourcePlaces ? (
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
                      {source.name} is deployed to {sourcePlaces}. They keep the
                      old content until the packages are distributed again.
                    </PMText>
                  </PMHStack>
                ) : null}

                {targets.length === 0 ? (
                  <NowhereToGo
                    hasSource={source !== null}
                    orgSlug={orgSlug}
                    spaceSlug={spaceSlug}
                  />
                ) : (
                  <PMVStack gap={2} alignItems="stretch">
                    {targets.length >= SEARCHABLE_FROM && (
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
                          placeholder="Search packages"
                          aria-label="Search packages"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                        />
                      </PMBox>
                    )}
                    {shown.length === 0 ? (
                      <PMText variant="small" color="faded">
                        No package matches “{query.trim()}”.
                      </PMText>
                    ) : (
                      <PMVStack
                        gap={0}
                        alignItems="stretch"
                        maxHeight="320px"
                        overflowY="auto"
                        borderWidth="1px"
                        borderColor="border.tertiary"
                        borderRadius="sm"
                      >
                        {shown.map((target, index) => (
                          <TargetRow
                            key={target.pkg.id}
                            target={target}
                            isFirst={index === 0}
                            picked={components.length}
                            hasSource={source !== null}
                            deployedPlaces={deployedPlaceParts(
                              getDeployedTargets(target.pkg.id),
                              getDeployedMarketplaces(target.pkg.id),
                            ).join(' and ')}
                            isBusy={busyPackageId === target.pkg.id}
                            disabled={
                              busyPackageId !== null &&
                              busyPackageId !== target.pkg.id
                            }
                            onPick={() => void apply(target)}
                          />
                        ))}
                      </PMVStack>
                    )}
                  </PMVStack>
                )}
              </PMVStack>
            </PMDrawer.Body>

            <PMDrawer.Footer>
              {/*
                A plain button, not a CloseTrigger: Chakra pins the close
                trigger to the top-right corner of the content, so one placed
                in the footer lands on top of the header's own close button.
              */}
              <PMButton
                variant="tertiary"
                size="sm"
                disabled={busyPackageId !== null}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </PMButton>
            </PMDrawer.Footer>
          </PMDrawer.Content>
        </PMDrawer.Positioner>
      </PMPortal>
    </PMDrawer.Root>
  );
}

/**
 * One candidate. The button says what will happen rather than always saying
 * "Move here": on a package that already carries everything picked, the only
 * thing left to do is to detach it from the source, and calling that a move
 * would promise memberships the components already have.
 *
 * The partial case is the one a selection adds, and it is the one that has to
 * be readable before the click: "already holds 2 of 5" says that three
 * memberships are about to be created and two are not, which is the difference
 * between this row and the one below it.
 *
 * With no source the same row has one fewer thing to offer: a package that
 * already carries everything picked leaves nothing to do, since there is no
 * membership to detach, so the button is spent rather than renamed. The note
 * beside it already says why.
 */
function TargetRow({
  target,
  isFirst,
  picked,
  hasSource,
  deployedPlaces,
  isBusy,
  disabled,
  onPick,
}: Readonly<{
  target: MoveTarget;
  isFirst: boolean;
  /** How many components are being moved, so the row can say how many it has. */
  picked: number;
  /** There is a package to leave, so a held component can still be detached. */
  hasSource: boolean;
  deployedPlaces: string;
  isBusy: boolean;
  disabled: boolean;
  onPick: () => void;
}>) {
  const { pkg, held } = target;
  const alreadyHolds = holdsEverything(target);
  const isSettled = alreadyHolds && !hasSource;
  const heldNote = alreadyHolds
    ? picked === 1
      ? 'Already in this package'
      : `Already holds all ${movedComponentCount(target)}`
    : held.length > 0
      ? `Already holds ${held.length} of ${movedComponentCount(target)}`
      : '';

  return (
    <PMHStack
      gap={3}
      align="center"
      paddingX={3}
      paddingY="10px"
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
    >
      <PMBox flex={1} minW={0}>
        <PMText as="div" fontSize="sm" fontWeight="medium" truncate>
          {pkg.name}
        </PMText>
        <PMText as="div" fontSize="xs" color="faded" truncate>
          {heldNote ||
            (deployedPlaces
              ? `Deployed to ${deployedPlaces}`
              : pkg.description || 'Not deployed anywhere')}
        </PMText>
      </PMBox>
      <PMButton
        variant={alreadyHolds ? 'tertiary' : 'secondary'}
        size="xs"
        loading={isBusy}
        disabled={disabled || isSettled}
        onClick={onPick}
      >
        {!hasSource
          ? 'Add here'
          : alreadyHolds
            ? 'Remove from source'
            : 'Move here'}
      </PMButton>
    </PMHStack>
  );
}

/**
 * A space with nowhere to put anything: a single package when the components
 * are being moved out of it, none at all otherwise. The honest answer either
 * way is that another package has to exist first.
 */
function NowhereToGo({
  hasSource,
  orgSlug,
  spaceSlug,
}: Readonly<{ hasSource: boolean; orgSlug: string; spaceSlug: string }>) {
  return (
    <PMVStack gap={2} alignItems="flex-start">
      <PMText variant="body">
        {hasSource
          ? 'This space has only one package.'
          : 'This space has no package.'}
      </PMText>
      <PMLink asChild variant="underline" fontSize="sm">
        <RouterLink to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
          {hasSource ? 'Create another one' : 'Create one'}
        </RouterLink>
      </PMLink>
    </PMVStack>
  );
}
