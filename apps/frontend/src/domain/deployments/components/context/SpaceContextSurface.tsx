import { useCallback, useMemo, useState } from 'react';
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
import { useListPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { PACKAGE_PARAM } from '../../hooks/useCreateIntoPackage';
import { buildPackageContext } from './buildPackageContext';
import {
  countComponentsInNoPackage,
  type InventoryCoverage,
} from './buildSpaceInventory';
import {
  COMPONENT_PARAM,
  FILE_PARAM,
  packageDetailHref,
  selectDetailComponent,
  selectSkillFile,
  sortFilesByPath,
} from './buildComponentDetail';
import { ContextBlankState } from './ContextBlankState';
import { resolveContextView } from './resolveContextView';
import { CreatePackageDrawer } from './CreatePackageDrawer';
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
 * Why a package is being created, which decides what happens to it once it
 * exists: `open-it` for the reader who asked for a package, `stay` for the one
 * who asked for somewhere to put something and is still looking at the drawer
 * they asked from.
 */
type CreateIntent = 'open-it' | 'stay';

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

  const { data: standardsResponse, isLoading: isLoadingStandards } =
    useGetStandardsQuery();
  const { data: commandsResponse, isLoading: isLoadingCommands } =
    useGetCommandsQuery();
  const { data: skillsResponse, isLoading: isLoadingSkills } =
    useGetSkillsQuery();

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
   * Counted here rather than beside the rail that shows the number, because the
   * branch below needs it: whether this space is empty is not a question about
   * its packages. Both the rail and the pane recount their own rows from the
   * same catalogue, so nothing can disagree with it.
   */
  const inventoryCount =
    catalogue.standards.length +
    catalogue.commands.length +
    catalogue.skills.length;

  /*
   * Falling back to the first package rather than to an empty pane: arriving on
   * Context with nothing open would make the surface look like it failed, and
   * landing on a package is what says the package is the unit here.
   */
  const requestedId = searchParams.get(PACKAGE_PARAM);
  const view = resolveContextView({
    packageCount: packages.length,
    componentCount: inventoryCount,
    requestsInventory: requestedId === INVENTORY_VALUE,
  });
  const showingInventory = view === 'inventory';

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
    (value: string, coverage: InventoryCoverage = 'all') => {
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
          // A rail click asks for the whole of what it names unless it names
          // the filtered part itself, so a filter left over from the previous
          // selection would answer a question the click did not ask. Clicking
          // "All components" is what turns it back off.
          if (coverage === NO_PACKAGE_VALUE)
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

  /*
   * Naming a new package, held here and not in the rail that opens it, because
   * what happens once it exists is a selection and the selection is this
   * component's to make.
   *
   * Which is not the same answer everywhere, hence an intent rather than a
   * boolean. Asked for from the rail or the blank state, the new package is what
   * the reader wants to look at next. Asked for from a move with nowhere to go,
   * it is a target for the drawer still open on screen: opening it would remount
   * the pane under that drawer and throw away the components picked to move.
   */
  const [creating, setCreating] = useState<CreateIntent | null>(null);
  const createAndOpen = useCallback(() => setCreating('open-it'), []);
  const createAndStay = useCallback(() => setCreating('stay'), []);
  const showInventory = useCallback(() => show(INVENTORY_VALUE), [show]);
  const showOrphans = useCallback(
    () => show(INVENTORY_VALUE, NO_PACKAGE_VALUE),
    [show],
  );

  /*
   * Counted for the rail, which needs the number and not the rows. The pane
   * counts it again from the same memberships when it is on screen, so the two
   * cannot disagree.
   */
  const orphanCount = useMemo(
    () => countComponentsInNoPackage(packages, catalogue),
    [packages, catalogue],
  );

  /*
   * The three catalogues are in the gate beside the packages, and not only the
   * packages, because what the surface shows now depends on both: a space whose
   * packages have arrived and whose components have not looks like a space with
   * nothing in it, and would show the blank state for as long as that lasts
   * before replacing it with the inventory. They are all requested together, so
   * the wait is the slowest of the four rather than their sum, and it also
   * spares the rail the count that used to tick from zero to its real number.
   */
  if (
    isLoadingSpace ||
    isLoadingPackages ||
    isLoadingStandards ||
    isLoadingCommands ||
    isLoadingSkills
  ) {
    return (
      /*
       * Centred in the surface it is standing in for, rather than dropped at
       * the top of it. Full bleed means there is no page padding to sit inside,
       * so a spinner in the flow lands in the top-left corner of the window and
       * reads as a fragment of a screen that failed rather than as a screen on
       * its way in.
       */
      <PMVStack flex="1" minH={0} justify="center" align="center">
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

  /*
   * Mounted only while it is open, like the drawers the pane holds, so the name
   * field starts empty every time. Built here rather than twice below because
   * the blank state is one of the two places that opens it, and that branch
   * returns before the surface itself does.
   */
  const packageDrawer = creating !== null && (
    <CreatePackageDrawer
      spaceId={spaceId}
      organizationId={organization.id}
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) setCreating(null);
      }}
      onCreated={(packageId) => {
        if (creating === 'open-it') selectPackage(packageId);
      }}
    />
  );

  /*
   * Only for a space with nothing in it. A space with no package but with
   * components is not empty, and `resolveContextView` says why it opens on the
   * inventory instead: those components are the work, and this branch used to
   * hide the only list that shows them.
   */
  if (view === 'blank') {
    return (
      <>
        <ContextBlankState onCreate={createAndOpen} />
        {packageDrawer}
      </>
    );
  }

  return (
    <>
      {/*
        The height the page hands down, rather than the viewport minus a guess
        at what sits above. That guess was 120px against a header that measured
        133, so the shell scrolled by the difference: thirteen pixels, enough
        for the trackpad to catch the page instead of the list, not enough to
        reach anything.

        No border and no radius with it. The surface now meets the window on
        three sides, and a rounded corner against the edge of the screen is a
        card drawn where there is no card.
      */}
      <PMBox bg="background.primary" overflow="hidden" flex="1" minHeight={0}>
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
              orphanCount={orphanCount}
              showingOrphans={showingInventory && coverage === NO_PACKAGE_VALUE}
              onSelect={selectPackage}
              onShowInventory={showInventory}
              onShowOrphans={showOrphans}
              onCreatePackage={createAndOpen}
            />
          )}
          {/*
          No scroll here: each pane owns its own, because the package pane keeps
          a header and a tab strip in place while only the body below them moves.
        */}
          <PMBox
            flex="1"
            minW={0}
            minH={0}
            display="flex"
            flexDirection="column"
          >
            {showingInventory ? (
              <SpaceInventoryPane
                packages={packages}
                catalogue={catalogue}
                coverage={coverage}
                onCoverageChange={setCoverage}
                onCreatePackage={createAndStay}
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
                  catalogue={catalogue}
                  groups={groups}
                  total={total}
                  detail={detail}
                  detailFile={selectedFile}
                  spaceId={spaceId}
                  organizationId={organization.id}
                  orgSlug={orgSlug}
                  spaceSlug={spaceSlug}
                  onCreatePackage={createAndStay}
                  onDeleted={forgetPackage}
                />
              )
            )}
          </PMBox>
        </PMHStack>
      </PMBox>
      {packageDrawer}
    </>
  );
}
