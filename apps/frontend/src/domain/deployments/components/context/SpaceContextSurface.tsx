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
import { PackagesBlankState } from '../PackagesBlankState';
import { ContextPackageRail } from './ContextPackageRail';
import { ContextPackagePane } from './ContextPackagePane';

/** The rail's selection, in the URL rather than in state — see below. */
const SELECTED_PACKAGE_PARAM = 'package';

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
  const requestedId = searchParams.get(SELECTED_PACKAGE_PARAM);
  const selectedPackage =
    packages.find((pkg) => pkg.id === requestedId) ?? packages[0] ?? null;

  const selectPackage = useCallback(
    (packageId: PackageId) => {
      // Mutating the params we were handed, so `?nav=` and anything else the
      // user arrived with survives the selection.
      setSearchParams(
        (previous) => {
          previous.set(SELECTED_PACKAGE_PARAM, packageId);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (isLoadingSpace || isLoadingPackages) {
    return (
      <PMVStack padding={10} align="center">
        <PMSpinner />
      </PMVStack>
    );
  }

  if (isError) {
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
          selectedPackageId={selectedPackage?.id ?? null}
          onSelect={selectPackage}
          createPackageHref={routes.space.toCreatePackage(orgSlug, spaceSlug)}
        />
        <PMBox flex="1" minW={0} minH={0} overflowY="auto">
          {selectedPackage && (
            <ContextPackagePane
              key={selectedPackage.id}
              pkg={selectedPackage}
              catalogue={catalogue}
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
            />
          )}
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}
