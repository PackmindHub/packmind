import { useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { PMBox, PMHStack, PMSpinner, PMText, PMVStack } from '@packmind/ui';
import type { PackageId, SkillId } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetCommandsQuery } from '../../../commands/api/queries/CommandsQueries';
import {
  useGetSkillsQuery,
  useGetSkillWithFilesByIdQuery,
} from '../../../skills/api/queries/SkillsQueries';
import {
  buildVirtualSkillMdFile,
  SKILL_MD_FILENAME,
} from '../../../skills/utils/skillMdUtils';
import { useGetStandardsQuery } from '../../../standards/api/queries/StandardsQueries';
import { routes } from '../../../../shared/utils/routes';
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_PARAM } from '../../hooks/useCreateIntoPackage';
import { buildPackageContext } from './buildPackageContext';
import type { InventoryCoverage } from './buildSpaceInventory';
import {
  COMPONENT_PARAM,
  FILE_PARAM,
  packageDetailHref,
  selectDetailComponent,
  selectSkillFile,
  sortFilesByPath,
} from './buildComponentDetail';
import { PackagesBlankState } from '../PackagesBlankState';
import { ContextPackageRail } from './ContextPackageRail';
import { ContextSkillFileRail } from './ContextSkillFileRail';
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
 * What the inventory is filtered on, when it is.
 *
 * A parameter of its own rather than another value of the one above, which says
 * what the pane shows: this says how much of it, and folding the two into one
 * would make "the inventory" and "the part of it nothing carries" two places
 * instead of one place read two ways. Absent means unfiltered, so the plain
 * inventory has one address and not two.
 */
const COVERAGE_PARAM = 'coverage';
const NO_PACKAGE_VALUE: InventoryCoverage = 'none';

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

  /*
   * Anything other than the one value it takes reads as unfiltered, rather than
   * as an error: a hand-edited or truncated address answers with the inventory,
   * which is what the parameter it sits beside already asked for.
   */
  const coverage: InventoryCoverage =
    searchParams.get(COVERAGE_PARAM) === NO_PACKAGE_VALUE
      ? NO_PACKAGE_VALUE
      : 'all';
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

  /*
   * The files of the open skill, when that is what is open.
   *
   * The query is the one the pane's own body runs, by the same id, so the two
   * read one cache entry rather than two answers that could differ. It is
   * disabled for the other two types, which have no files.
   */
  const { data: skillWithFiles } = useGetSkillWithFilesByIdQuery(
    detail?.type === 'skill' ? (detail.key as SkillId) : undefined,
  );

  /*
   * The tree the rail shows, or null to leave the packages in place.
   *
   * Null when the skill has nothing beside its instructions: most skills are a
   * single SKILL.md, and a tree of one row would cost the reader their place in
   * the space for nothing. Null too while the query is in flight, so the rail
   * does not flash an empty tree on the way in.
   *
   * SKILL.md is put back at the head of the list. It is not one of the files the
   * API returns, it is the component, and the tree pins it above the rest for
   * exactly that reason.
   */
  const treeFiles = useMemo(() => {
    if (!skillWithFiles || skillWithFiles.files.length === 0) return null;
    return [
      buildVirtualSkillMdFile(skillWithFiles.latestVersion),
      ...sortFilesByPath(skillWithFiles.files),
    ];
  }, [skillWithFiles]);

  /*
   * Resolved against the files themselves and not against the tree, so the row
   * for SKILL.md answers with nothing to show: the instructions are the
   * component, and the component is what the pane shows when no file is open.
   */
  const selectedFile = skillWithFiles
    ? selectSkillFile(skillWithFiles.files, searchParams.get(FILE_PARAM))
    : null;

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
          previous.delete(FILE_PARAM);
          // A rail click asks for the whole of what it names, so a filter left
          // over from the previous selection would answer a question the click
          // did not ask. Clicking "All components" is what turns it back off.
          previous.delete(COVERAGE_PARAM);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /*
   * Turning the coverage filter on and off. Off deletes the parameter rather
   * than writing `all`, so the unfiltered inventory keeps one address.
   */
  const setCoverage = useCallback(
    (next: InventoryCoverage) => {
      setSearchParams(
        (previous) => {
          if (next === NO_PACKAGE_VALUE)
            previous.set(COVERAGE_PARAM, NO_PACKAGE_VALUE);
          else previous.delete(COVERAGE_PARAM);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /*
   * Choosing a file in the tree, and choosing its first row, which is the same
   * gesture with the opposite meaning: SKILL.md is the component, so asking for
   * it is asking for no file at all.
   */
  const selectFile = useCallback(
    (path: string) => {
      setSearchParams(
        (previous) => {
          if (path === SKILL_MD_FILENAME) previous.delete(FILE_PARAM);
          else previous.set(FILE_PARAM, path);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /*
   * The open package was deleted, so the address stops naming it: left in
   * place, a shared link would ask for a package the space no longer has, and
   * the surface would answer with the first one under a URL that says
   * otherwise. Dropping the parameter falls back to the first package, or to
   * the blank state when that was the last one.
   */
  const forgetPackage = useCallback(() => {
    setSearchParams(
      (previous) => {
        previous.delete(PACKAGE_PARAM);
        previous.delete(COMPONENT_PARAM);
        previous.delete(FILE_PARAM);
        previous.delete(COVERAGE_PARAM);
        return previous;
      },
      { replace: true },
    );
  }, [setSearchParams]);

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
        {/*
          The rail is the open skill's file tree while there is one with files
          in it, and the space's packages the rest of the time. The inventory
          holds it back: an address can name a component and the inventory at
          once, and the tree of something the pane is not showing would be a
          third thing on screen, answering to nobody.
        */}
        {selectedPackage && detail && treeFiles && !showingInventory ? (
          <ContextSkillFileRail
            skillName={detail.name}
            packageName={selectedPackage.name}
            backHref={packageDetailHref(searchParams, selectedPackage.id)}
            files={treeFiles}
            selectedPath={selectedFile?.path ?? SKILL_MD_FILENAME}
            onSelectFile={selectFile}
          />
        ) : (
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
        )}
        {/*
          No scroll here: each pane owns its own, because the package pane keeps
          a header and a tab strip in place while only the body below them moves.
        */}
        <PMBox flex="1" minW={0} minH={0} display="flex" flexDirection="column">
          {showingInventory ? (
            <SpaceInventoryPane
              packages={packages}
              catalogue={catalogue}
              coverage={coverage}
              onCoverageChange={setCoverage}
              spaceId={spaceId}
              organizationId={organization.id}
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
                detailFile={selectedFile}
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
                onDeleted={forgetPackage}
              />
            )
          )}
        </PMBox>
      </PMHStack>
    </PMBox>
  );
}
