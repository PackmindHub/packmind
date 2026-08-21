import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
import {
  PMBox,
  PMButton,
  PMCloseButton,
  PMDialog,
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
  type MoveTarget,
} from './buildMoveTargets';
import {
  COMPONENT_TYPE_LABELS_SINGULAR,
  type ContextComponent,
} from './buildPackageContext';

/** Above this many candidates the list gets a filter rather than a scroll. */
const SEARCHABLE_FROM = 7;

/**
 * Moving one component out of the package it is being read from and into
 * another one of the same space.
 *
 * There is no move endpoint: the server knows how to add a component to a
 * package and how to remove it from one. The order is what makes it a move
 * rather than a gap — the add goes first, so a failure between the two leaves
 * the component in both packages instead of in none. That state is recoverable
 * from this same dialog, which then offers to remove it from here.
 *
 * One dialog and no second confirmation, unlike the manage-packages drawer.
 * What that drawer confirms is a removal it presents as a removal; here the
 * word on the button is already "move", the destination is already picked, and
 * what a removal would cost is on screen before the click: the banner names the
 * repositories the source is live on, and each row names the ones the
 * destination is live on.
 */
export function MoveComponentDialog({
  open,
  onOpenChange,
  component,
  source,
  packages,
  spaceId,
  organizationId,
  orgSlug,
  spaceSlug,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: ContextComponent;
  /** The package the component is being read from, and the one it leaves. */
  source: PackageResponse;
  /** Every package of the space, membership ids included. */
  packages: readonly PackageResponse[];
  spaceId: SpaceId;
  organizationId: OrganizationId;
  orgSlug: string;
  spaceSlug: string;
}>) {
  const [query, setQuery] = useState('');
  const [busyPackageId, setBusyPackageId] = useState<PackageId | null>(null);

  const { mutateAsync: addArtefacts } = useAddArtefactsToPackagesMutation();
  const { mutateAsync: removeArtefacts } =
    useRemoveArtefactsFromPackageMutation();
  const { getDeployedTargets, getDeployedMarketplaces } =
    usePackageDeploymentStatus(spaceId, organizationId);

  const targets = useMemo(
    () => buildMoveTargets(packages, component, source.id),
    [packages, component, source.id],
  );
  const shown = useMemo(
    () => filterMoveTargets(targets, query),
    [targets, query],
  );

  const kind = COMPONENT_TYPE_LABELS_SINGULAR[component.type].toLowerCase();
  const sourcePlaces = deployedPlaceParts(
    getDeployedTargets(source.id),
    getDeployedMarketplaces(source.id),
  ).join(' and ');

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) setQuery('');
  };

  const move = async (target: MoveTarget) => {
    setBusyPackageId(target.pkg.id);
    let added = false;
    try {
      if (!target.alreadyHolds) {
        const outcomes = await addArtefacts({
          spaceId,
          entries: [
            {
              packageId: target.pkg.id,
              ...componentIdsPayload(component),
            },
          ],
        });
        if (outcomes.some((outcome) => !outcome.ok)) {
          pmToaster.create({
            type: 'error',
            title: `Couldn't add to ${target.pkg.name}`,
            description: `${component.name} is still in ${source.name}.`,
          });
          return;
        }
        added = true;
      }

      await removeArtefacts({
        spaceId,
        packageId: source.id,
        ...componentIdsPayload(component),
      });

      pmToaster.create({
        type: 'success',
        title: target.alreadyHolds
          ? `Removed from ${source.name}`
          : `Moved to ${target.pkg.name}`,
        description: `${component.name} now ships with ${target.pkg.name}.`,
      });
      handleOpenChange(false);
    } catch {
      pmToaster.create({
        type: 'error',
        // The half-done state, said in full. The component is in both packages
        // and the dialog can finish the job: reopening it on the same
        // destination now offers to remove it from here.
        title: added
          ? `${component.name} is in both packages`
          : `Couldn't remove from ${source.name}`,
        description: added
          ? `It was added to ${target.pkg.name} but could not be removed from ${source.name}. Move it again to finish.`
          : 'Try again, or check your space access.',
      });
    } finally {
      setBusyPackageId(null);
    }
  };

  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => handleOpenChange(details.open)}
      closeOnInteractOutside={busyPackageId === null}
      size="md"
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Move {component.name}</PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton disabled={busyPackageId !== null} />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>

            <PMDialog.Body>
              <PMVStack gap={4} alignItems="stretch">
                <PMText variant="body" color="secondary">
                  This {kind} leaves{' '}
                  <PMText as="span" fontWeight={500} color="primary">
                    {source.name}
                  </PMText>{' '}
                  and joins the package you pick. It stays in your library
                  either way.
                </PMText>

                {sourcePlaces ? (
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
                  <NowhereToGo orgSlug={orgSlug} spaceSlug={spaceSlug} />
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
                            deployedPlaces={deployedPlaceParts(
                              getDeployedTargets(target.pkg.id),
                              getDeployedMarketplaces(target.pkg.id),
                            ).join(' and ')}
                            isBusy={busyPackageId === target.pkg.id}
                            disabled={
                              busyPackageId !== null &&
                              busyPackageId !== target.pkg.id
                            }
                            onPick={() => void move(target)}
                          />
                        ))}
                      </PMVStack>
                    )}
                  </PMVStack>
                )}
              </PMVStack>
            </PMDialog.Body>

            <PMDialog.Footer>
              <PMDialog.CloseTrigger asChild>
                <PMButton
                  variant="tertiary"
                  size="sm"
                  disabled={busyPackageId !== null}
                >
                  Cancel
                </PMButton>
              </PMDialog.CloseTrigger>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
}

/**
 * One candidate. The button says what will happen rather than always saying
 * "Move here": on a package that already carries the component, the only thing
 * left to do is to detach it from the source, and calling that a move would
 * promise a second membership the component already has.
 */
function TargetRow({
  target,
  isFirst,
  deployedPlaces,
  isBusy,
  disabled,
  onPick,
}: Readonly<{
  target: MoveTarget;
  isFirst: boolean;
  deployedPlaces: string;
  isBusy: boolean;
  disabled: boolean;
  onPick: () => void;
}>) {
  const { pkg, alreadyHolds } = target;

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
          {alreadyHolds
            ? 'Already in this package'
            : deployedPlaces
              ? `Deployed to ${deployedPlaces}`
              : pkg.description || 'Not deployed anywhere'}
        </PMText>
      </PMBox>
      <PMButton
        variant={alreadyHolds ? 'tertiary' : 'secondary'}
        size="xs"
        loading={isBusy}
        disabled={disabled}
        onClick={onPick}
      >
        {alreadyHolds ? 'Remove from source' : 'Move here'}
      </PMButton>
    </PMHStack>
  );
}

/**
 * A space with a single package. Nothing to move into, and the honest answer is
 * that a second package has to exist first.
 */
function NowhereToGo({
  orgSlug,
  spaceSlug,
}: Readonly<{ orgSlug: string; spaceSlug: string }>) {
  return (
    <PMVStack gap={2} alignItems="flex-start">
      <PMText variant="body">This space has only one package.</PMText>
      <PMLink asChild variant="underline" fontSize="sm">
        <RouterLink to={routes.space.toCreatePackage(orgSlug, spaceSlug)}>
          Create another one
        </RouterLink>
      </PMLink>
    </PMVStack>
  );
}
