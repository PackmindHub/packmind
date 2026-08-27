import { useMemo, useState } from 'react';
import { LuSearch, LuTriangleAlert } from 'react-icons/lu';
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
import { componentIdsPayload } from './buildMoveTargets';
import {
  componentSelectionKey,
  componentSetKind,
  componentSetSubject,
  type ContextComponent,
  type ContextGroup,
  type SpaceCatalogue,
} from './buildPackageContext';
import { COMPONENT_TYPE_ICONS } from './ContextComponentList';

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
 * One call for the whole selection, not one per component: the mutation takes a
 * bag of ids grouped by type, so a mixed pick joins the package in a single
 * request and cannot half-join it.
 */
export function AddComponentsDrawer({
  open,
  onOpenChange,
  pkg,
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
    () => buildAddableComponents(pkg, catalogue, { orgSlug, spaceSlug }),
    [pkg, catalogue, orgSlug, spaceSlug],
  );
  const shown = useMemo(
    () => filterAddableComponents(addable.groups, query),
    [addable.groups, query],
  );
  const picked = useMemo(
    () =>
      addable.groups
        .flatMap((group) => group.components)
        .filter((component) =>
          pickedKeys.has(componentSelectionKey(component)),
        ),
    [addable.groups, pickedKeys],
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
                    <PMText variant="body" color="secondary">
                      What you pick joins{' '}
                      <PMText as="span" fontWeight={500} color="primary">
                        {pkg.name}
                      </PMText>{' '}
                      and stays in every other package already carrying it. Only
                      what this package does not hold yet is listed.
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
                          {pkg.name} is deployed to {places}. They keep the old
                          content until the package is distributed again.
                        </PMText>
                      </PMHStack>
                    ) : null}

                    {addable.total >= SEARCHABLE_FROM && (
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

/**
 * One type's candidates, headed the way the pane heads the same type. The count
 * is the group's own, so a filtered list says how much of itself it is showing.
 */
function CandidateGroup({
  group,
  pickedKeys,
  onToggle,
  disabled,
}: Readonly<{
  group: ContextGroup;
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
          {group.components.length}
        </PMText>
      </PMHStack>
      <PMBox
        marginTop={1}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {group.components.map((component, index) => (
          <CandidateRow
            key={componentSelectionKey(component)}
            component={component}
            isFirst={index === 0}
            isPicked={pickedKeys.has(componentSelectionKey(component))}
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
  component,
  isFirst,
  isPicked,
  onToggle,
  disabled,
}: Readonly<{
  component: ContextComponent;
  isFirst: boolean;
  isPicked: boolean;
  onToggle: (component: ContextComponent) => void;
  disabled: boolean;
}>) {
  return (
    <PMCheckbox
      size="sm"
      checked={isPicked}
      onCheckedChange={() => onToggle(component)}
      disabled={disabled}
      inputProps={{ 'aria-label': `Add ${component.name}` }}
      width="full"
      gap={3}
      alignItems="center"
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
          ? 'Create one from the Create button on this package, and it joins the package as it is created.'
          : 'Anything created from now on can be added here.'}
      </PMText>
    </PMVStack>
  );
}
