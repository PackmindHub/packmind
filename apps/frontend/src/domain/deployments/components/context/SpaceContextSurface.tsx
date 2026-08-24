import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PMBox, PMHStack, PMSpinner, PMText, PMVStack } from '@packmind/ui';
import type { PackageId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetCommandsQuery } from '../../../commands/api/queries/CommandsQueries';
import { useGetSkillsQuery } from '../../../skills/api/queries/SkillsQueries';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { routes } from '../../../../shared/utils/routes';
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_PARAM } from '../../hooks/useCreateIntoPackage';
import { buildPackageContext } from './buildPackageContext';
import { COMPONENT_PARAM, selectDetailComponent } from './buildComponentDetail';
import { PackagesBlankState } from '../PackagesBlankState';
import { ContextPackageRail } from './ContextPackageRail';
import { ContextPackagePane } from './ContextPackagePane';
import { SpaceInventoryPane } from './SpaceInventoryPane';

/**
 * What the same parameter says when the pane shows the space-wide inventory
 * instead of one package. One parameter, one meaning — "what the pane shows" —
 * rather than two that have to be reconciled when they disagree. Package ids
 * are generated, so nothing can collide with it.
 *
 * Arriving on Context without the parameter still lands on a package, which is
 * what says the package is the unit here. The inventory is a way of reading it,
 * reachable by link but never the default.
 */
const INVENTORY_VALUE = 'all';

/**
 * The Context surface of a space: its packages on the left, what the selected
 * one holds on the right.
 *
 * The whole point of the arrangement is that the rail indexes containers and the
 * pane indexes their contents. The navigation above it no longer names a kind of
 * object, so a new component type appears as a new group in the pane and changes
 * nothing else.
 *
 * The selected package lives in the URL. A rail selection held in state cannot
 * be linked to, does not survive a reload, and — the reason that matters here —
 * cannot be sent to someone: this surface is where a space's content is read,
 * and "look at this package" is the most common thing to say about it.
 */
export function SpaceContextSurface() {
  const { orgSlug, spaceSlug } = useParams() as {
    orgSlug: string;
    spaceSlug: string;
  };
  const { organization } = useAuthContext();
  const { spaceId, isLoading: isLoadingSpace } = useCurrentSpace();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: packagesResponse,
    isLoading: isLoadingPackages,
    isError,
  } = useListPackagesBySpaceQuery(spaceId, organization?.id);

  const { data: standardsResponse } = useGetStandardsQuery();
  const { data: commandsResponse } = useGetCommandsQuery();
  const { data: skillsResponse } = useGetSkillsQuery();

  const packages = useMemo(
    () =>
      [...(packagesResponse?.packages ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [packagesResponse?.packages],
  );

  const catalogue = useMemo(
    () => ({
      standards: standardsResponse?.standards ?? [],
      commands: commandsResponse ?? [],
      skills: skillsResponse ?? [],
    }),
    [standardsResponse?.standards, commandsResponse, skillsResponse],
  );

  /*
   * Falling back to the first package rather than to an empty pane: arriving on
   * Context with nothing open would make the surface look like it failed, and
   * landing on a package is what says the package is the unit here.
   */
  const requestedId = searchParams.get(PACKAGE_PARAM);
  const showingInventory = requestedId === INVENTORY_VALUE;
  const selectedPackage =
    packages.find((pkg) => pkg.id === requestedId) ?? packages[0] ?? null;

  /*
   * The contents of the open package, and the one of them the address asks for.
   *
   * Resolved here rather than in the pane because the rail needs the answer
   * too: a skill open in the pane takes the rail with it. Two resolutions of
   * the same parameter would be two chances to disagree about what is open, so
   * there is one, and the pane is handed its result.
   */
  const { groups, total } = useMemo(
    () =>
      selectedPackage
        ? buildPackageContext(selectedPackage, catalogue, {
            orgSlug,
            spaceSlug,
          })
        : { groups: [], total: 0 },
    [selectedPackage, catalogue, orgSlug, spaceSlug],
  );

  const detail = selectDetailComponent(
    groups,
    searchParams.get(COMPONENT_PARAM),
  );

  const show = useCallback(
    (value: string) => {
      // Mutating the params we were handed, so `?nav=` and anything else the
      // user arrived with survives the selection.
      setSearchParams(
        (previous) => {
          previous.set(PACKAGE_PARAM, value);
          // A rail click asks for a container, so whatever component was open
          // in the previous one stops being the answer. Left in place it would
          // reopen in the package clicked next, the one case where the key is
          // in both.
          previous.delete(COMPONENT_PARAM);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectPackage = useCallback(
    (packageId: PackageId) => show(packageId),
    [show],
  );
  const showInventory = useCallback(() => show(INVENTORY_VALUE), [show]);

  const inventoryCount =
    catalogue.standards.length +
    catalogue.commands.length +
    catalogue.skills.length;

  if (isLoadingSpace || isLoadingPackages) {
    return (
      <PMVStack padding={10} align="center">
        <PMSpinner />
      </PMVStack>
    );
  }

  /*
   * The space and the organization are folded into the same branch as a failed
   * query on purpose: without them the package query never ran, so there is
   * nothing to show and nothing else to say about it.
   */
  if (isError || !spaceId || !organization) {
    return (
      <PMBox padding={6}>
        <PMText color="error">Error loading packages.</PMText>
      </PMBox>
    );
  }

  if (packages.length === 0) {
    return <PackagesBlankState orgSlug={orgSlug} spaceSlug={spaceSlug} />;
  }

  return (
    <PMBox
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      overflow="hidden"
      height="calc(100vh - 120px)"
      minHeight="480px"
    >
      <PMHStack gap={0} align="stretch" height="100%">
        <ContextPackageRail
          packages={packages}
          catalogue={catalogue}
          orgSlug={orgSlug}
          spaceSlug={spaceSlug}
          selectedPackageId={selectedPackage?.id ?? null}
          showingInventory={showingInventory}
          inventoryCount={inventoryCount}
          onSelect={selectPackage}
          onShowInventory={showInventory}
          createPackageHref={routes.space.toCreatePackage(orgSlug, spaceSlug)}
        />
        {/*
          No scroll here: each pane owns its own, because the package pane keeps
          a header and a tab strip in place while only the body below them moves.
        */}
        <PMBox flex="1" minW={0} minH={0} display="flex" flexDirection="column">
          {showingInventory ? (
            <SpaceInventoryPane
              packages={packages}
              catalogue={catalogue}
              orgSlug={orgSlug}
              spaceSlug={spaceSlug}
            />
          ) : (
            selectedPackage && (
              <ContextPackagePane
                key={selectedPackage.id}
                pkg={selectedPackage}
                packages={packages}
                groups={groups}
                total={total}
                detail={detail}
                spaceId={spaceId}
                organizationId={organization.id}
                orgSlug={orgSlug}
                spaceSlug={spaceSlug}
                packageHref={routes.space.toPackage(
                  orgSlug,
                  spaceSlug,
                  selectedPackage.id,
                )}
                packageEditHref={routes.space.toPackageEdit(
                  orgSlug,
                  spaceSlug,
                  selectedPackage.id,
                )}
                distributionHistoryHref={`${routes.space.toPackage(
                  orgSlug,
                  spaceSlug,
                  selectedPackage.id,
                )}?tab=distributions`}
              />
            )
          )}
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}
