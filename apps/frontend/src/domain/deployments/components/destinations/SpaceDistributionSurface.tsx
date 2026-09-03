import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  PMAlert,
  PMBox,
  PMButton,
  PMHStack,
  PMHeading,
  PMIcon,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuFolderGit2 } from 'react-icons/lu';
import type {
  GitProviderId,
  GitRepoId,
  PackageId,
  TargetId,
} from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useCurrentSpace } from '../../../spaces/hooks/useCurrentSpace';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useSpaceMarketplaces } from '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceMarketplaces';
import { useMarketplaceBatchDistribution } from '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/useMarketplaceBatchDistribution';
import { MarketplaceDetailPane } from '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/MarketplaceDetailPane';
import { routes } from '../../../../shared/utils/routes';
import { getEnvVar } from '../../../../shared/utils/getEnvVar';
import { useListActiveDistributedPackagesBySpaceQuery } from '../../api/queries/DeploymentsQueries';
import { buildPackageDriftOverview } from '../redesign/selectors/buildPackageDriftOverview';
import { buildRepositoryDriftOverview } from '../redesign/selectors/buildRepositoryDriftOverview';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import { RepositoryDetailPane } from '../redesign/components/RepositoryDetailPane';
import {
  SyncSurface,
  type SyncScope,
} from '../redesign/components/SyncSurface';
import {
  STUB_PACKAGES,
  STUB_PROVIDER_OK,
  STUB_REPOSITORIES,
} from '../redesign/stubPackages';
import { DestinationRail } from './DestinationRail';
import { buildDestinationSyncScope } from './buildDestinationSyncScope';
import {
  buildSpaceDestinations,
  destinationReachSummary,
  type Destination,
} from './buildSpaceDestinations';

/** Which destination the pane is showing. In the URL, see below. */
const DESTINATION_PARAM = 'destination';

/**
 * Where this space's packages landed, indexed by the place rather than by the
 * package.
 *
 * The surface it replaces asked the same question three ways — by package, by
 * repository, by marketplace — and the first of those now has a better home:
 * a package's landings are a tab of the package itself, in Context. What is
 * left is one axis, the destination, and the two kinds of destination belong in
 * one list rather than behind two tabs. A tab strip that only ever offered "the
 * same thing, grouped differently" is a question the screen was asking the user
 * instead of answering.
 *
 * The tab surface stays where it is, mounted by the navigation this one
 * replaces. Both have to work until the old one goes, at step 10.
 *
 * It is its own layout, like Context and for the same reasons: a rail beside a
 * pane, claiming the height the shell hands it, with no page heading above it
 * and nothing scrolling except the two regions that own their scroll. The
 * space-level line that used to sit in that heading is in the rail now, against
 * the list it counts, and the two batch actions that sat beside it are in the
 * rail's footer with the rest of the batch. What is left of the heading is a
 * word the sidebar already has highlighted, so there is no heading.
 */
export function SpaceDistributionSurface() {
  const { organization } = useAuthContext();
  const { spaceId, spaceSlug, isReady } = useCurrentSpace();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * The same escape hatch the tab surface carries, and for the same reason: a
   * space with nothing distributed shows one sentence, so the rail, the batch
   * and the drift states cannot be looked at on a fresh install without it. The
   * hook that resolves marketplace drift honours the flag on its own.
   */
  const isStubMode =
    getEnvVar('MODE') === 'development' && searchParams.get('stub') === '1';

  const { data, isLoading, isError } =
    useListActiveDistributedPackagesBySpaceQuery(
      isStubMode ? undefined : spaceId,
    );
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  /*
   * Every marketplace this space publishes to, and not only the ones with
   * something outdated: this screen is a list of destinations, so a marketplace
   * that is up to date is a row with nothing to repair, not an absent row.
   */
  const { marketplaces, isReady: marketplacesReady } = useSpaceMarketplaces();

  const providersWithToken = useMemo<Set<GitProviderId>>(
    () =>
      isStubMode
        ? new Set([STUB_PROVIDER_OK])
        : providersWithTokenSet(providersResponse),
    [providersResponse, isStubMode],
  );

  /*
   * The package pivot is only here to feed the confirmation surface, which
   * takes packages because a distribution writes one package into one place.
   * Nothing on this screen is indexed by it.
   */
  const packages = useMemo(() => {
    if (isStubMode) return STUB_PACKAGES;
    return data ? buildPackageDriftOverview(data) : [];
  }, [data, isStubMode]);
  const repositories = useMemo(() => {
    if (isStubMode) return STUB_REPOSITORIES;
    return data ? buildRepositoryDriftOverview(data) : [];
  }, [data, isStubMode]);
  const destinations = useMemo(
    () => buildSpaceDestinations(repositories, marketplaces),
    [repositories, marketplaces],
  );
  const summary = useMemo(
    () => destinationReachSummary(destinations),
    [destinations],
  );

  /*
   * The open destination lives in the URL, as the open package does on Context.
   * "This repository is three versions behind" is a thing one person says to
   * another, and a selection held in state cannot be sent, does not survive a
   * reload, and is lost by the link the sidebar badge will want to carry.
   */
  const requestedId = searchParams.get(DESTINATION_PARAM);
  const selected =
    destinations.find((destination) => destination.id === requestedId) ??
    destinations[0] ??
    null;

  const selectDestination = useCallback(
    (destinationId: string) => {
      setSearchParams(
        (previous) => {
          previous.set(DESTINATION_PARAM, destinationId);
          return previous;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [syncScope, setSyncScope] = useState<SyncScope | null>(null);

  const togglePicked = useCallback((destinationId: string) => {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(destinationId)) next.delete(destinationId);
      else next.add(destinationId);
      return next;
    });
  }, []);

  const distribute = useCallback(
    (pickedIds: Set<string>) => {
      const scope = buildDestinationSyncScope(destinations, pickedIds);
      if (scope) setSyncScope(scope);
    },
    [destinations],
  );

  const packageHistoryHref = useCallback(
    (packageId: PackageId) =>
      organization && spaceSlug
        ? `${routes.space.toPackage(organization.slug, spaceSlug, packageId)}?tab=distributions`
        : null,
    [organization, spaceSlug],
  );

  const handleSyncPackageOnTarget = useCallback(
    (packageId: PackageId, repoId: GitRepoId, targetId: TargetId) => {
      setSyncScope({
        kind: 'package',
        packageId,
        installKeys: [`${repoId}::${targetId}`],
      });
    },
    [],
  );

  const handleSyncRepository = useCallback(
    (repoId: GitRepoId) => distribute(new Set([`r:${repoId}`])),
    [distribute],
  );

  const distributeMarketplaces = useMarketplaceBatchDistribution(
    organization?.id ?? null,
  );

  if (!isStubMode && (!isReady || isLoading)) {
    return <SurfaceSpinner />;
  }

  if (!isStubMode && isError) {
    return (
      <PMBox padding={6}>
        <PMText color="error">Error loading distributions.</PMText>
      </PMBox>
    );
  }

  /*
   * A space with no repository can still publish to a marketplace, so the empty
   * state waits for that second dimension before claiming nothing was ever
   * distributed. Otherwise the screen would say "nothing here" and then grow a
   * marketplace section under the sentence.
   */
  if (destinations.length === 0) {
    if (!marketplacesReady) {
      return <SurfaceSpinner />;
    }
    return (
      <NothingDistributed
        contextHref={
          organization && spaceSlug
            ? routes.space.toContext(organization.slug, spaceSlug)
            : null
        }
      />
    );
  }

  /*
   * The confirmation takes over the whole surface, the way it does inside the
   * Context package pane: the rail behind it lists the destinations it is about
   * to write to, and leaving it visible would invite a second selection on top
   * of the one being confirmed.
   *
   * Padded and scrollable here, because the surface itself is not: full bleed
   * means there is no page padding for a bordered panel to sit inside, and the
   * confirmation is a long document rather than a pane with a fixed head.
   */
  if (syncScope !== null) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
        <SyncSurface
          packages={packages}
          scope={syncScope}
          providersWithToken={providersWithToken}
          isProvidersLoading={isProvidersLoading}
          onCancel={() => setSyncScope(null)}
          /*
           * Every repair made from here clears the selection: the rows that were
           * picked because they were behind are not behind any more, and a tick
           * left on a row that is now green claims work that no longer exists.
           */
          onConfirm={() => setPicked(new Set())}
          /*
           * The offer that used to sit in this surface's header, moved to the
           * one screen where it describes what the reader has just done rather
           * than advertising a feature over a list.
           */
          autoUpdateHref={
            organization
              ? routes.org.toSetupAutoUpdate(organization.slug)
              : null
          }
          /*
           * Withheld rather than passed with a null organization: the surface
           * hides its whole marketplace lane when the callback is absent, which
           * is the honest answer to "we cannot distribute on anyone's behalf" —
           * better than checkboxes that would come back refused.
           */
          onDistributeMarketplaces={
            organization ? distributeMarketplaces : undefined
          }
        />
      </PMBox>
    );
  }

  return (
    /*
     * The height the page hands down, rather than the viewport minus a guess at
     * what sits above. The guess used to be `calc(100vh - 130px)`, and the
     * distance it stood in for moved with the stub banner and with a header
     * line that wrapped: it was out by 68px with the banner up, which is
     * exactly the height of the rail's action bar, so the batch was pushed off
     * screen. There is nothing above the surface to guess at any more.
     *
     * No border and no radius with it, as on Context. The surface meets the
     * window on three sides, and a rounded corner against the edge of the
     * screen is a card drawn where there is no card.
     */
    <PMVStack gap={0} align="stretch" flex="1" minHeight={0}>
      {isStubMode && (
        <PMAlert.Root status="warning" flexShrink={0} borderRadius={0}>
          <PMAlert.Indicator />
          <PMAlert.Title>
            Stub mode: fictional data. Clicking Distribute will hit the real
            backend with non-existent IDs and fail.
          </PMAlert.Title>
        </PMAlert.Root>
      )}
      <PMBox bg="background.primary" overflow="hidden" flex="1" minH={0}>
        <PMHStack gap={0} align="stretch" height="100%">
          <DestinationRail
            destinations={destinations}
            summary={summary}
            selectedDestinationId={selected?.id ?? null}
            bulkSelected={picked}
            providersWithToken={providersWithToken}
            isProvidersLoading={isProvidersLoading}
            onSelect={selectDestination}
            onToggleBulk={togglePicked}
            onSetBulkSelection={setPicked}
            onDistributeBulk={distribute}
          />
          {/*
            No scroll here: the pane owns its own, because both kinds of pane
            keep a header in place and a footer stuck to the bottom while only
            the body between them moves. A scroller on this box would be a
            second one under their feet, and the sticky footer would settle
            against the wrong one.
          */}
          <PMBox
            flex="1"
            minW={0}
            minH={0}
            display="flex"
            flexDirection="column"
          >
            {selected && (
              <DestinationPane
                destination={selected}
                providersWithToken={providersWithToken}
                isProvidersLoading={isProvidersLoading}
                organizationSlug={organization?.slug ?? null}
                organizationId={organization?.id ?? null}
                packageHistoryHref={packageHistoryHref}
                onSyncPackageOnTarget={handleSyncPackageOnTarget}
                onSyncRepository={handleSyncRepository}
              />
            )}
          </PMBox>
        </PMHStack>
      </PMBox>
    </PMVStack>
  );
}

/**
 * Centred in the surface it stands in for, rather than dropped at the top of
 * it. Full bleed means there is no page padding to sit inside, so a spinner in
 * the flow lands in the top-left corner of the window and reads as a fragment
 * of a screen that failed rather than as a screen on its way in.
 */
function SurfaceSpinner() {
  return (
    <PMVStack flex="1" minH={0} justify="center" align="center">
      <PMSpinner />
    </PMVStack>
  );
}

/**
 * One destination, read through the pane its kind already had. The two are not
 * merged: a repository shows targets and versions, a marketplace shows
 * published plugins, and the only thing they have in common is being the place
 * something landed — which is the rail's job, not the pane's.
 */
function DestinationPane({
  destination,
  providersWithToken,
  isProvidersLoading,
  organizationSlug,
  organizationId,
  packageHistoryHref,
  onSyncPackageOnTarget,
  onSyncRepository,
}: Readonly<{
  destination: Destination;
  providersWithToken: Set<GitProviderId>;
  isProvidersLoading: boolean;
  organizationSlug: string | null;
  organizationId: string | null;
  packageHistoryHref: (packageId: PackageId) => string | null;
  onSyncPackageOnTarget: (
    packageId: PackageId,
    repoId: GitRepoId,
    targetId: TargetId,
  ) => void;
  onSyncRepository: (repoId: GitRepoId) => void;
}>) {
  if (destination.kind === 'marketplace') {
    /*
     * Unreachable in this edition: a destination is a marketplace only if
     * `useSpaceMarketplaces` returned one, and here it returns none. Kept
     * rather than removed so the branch stays where the other edition has it,
     * and the href is null because there is no marketplace page to link to.
     */
    return (
      <MarketplaceDetailPane
        key={destination.id}
        marketplace={destination.marketplace}
        marketplaceHref={null}
        organizationId={organizationId}
      />
    );
  }

  return (
    <RepositoryDetailPane
      key={destination.id}
      repo={destination.repository}
      providersWithToken={providersWithToken}
      isProvidersLoading={isProvidersLoading}
      onSyncPackageOnTarget={onSyncPackageOnTarget}
      onSyncRepository={onSyncRepository}
      packageHistoryHref={packageHistoryHref}
    />
  );
}

/**
 * What a space that has never distributed sees. It says where the list comes
 * from rather than offering a button that would create nothing: a destination
 * appears the first time a package lands in it, and landing one starts from the
 * package.
 *
 * The same composition as the Context blank state, and it had to change to get
 * there. It was a bordered panel capped at 68ch at the top of a padded page;
 * under a full-bleed surface there is no page padding for it to sit inside, so
 * it landed against the top-left corner of the window with the room empty
 * around it: a panel drawn where there is no panel, and small enough to read as
 * a fragment of a screen that failed to load rather than as the state of the
 * space. Here the empty room is the composition.
 *
 * The rail is deliberately not beside it. With no destination it would be a
 * search over nothing, two section headings with no rows, and a line counting
 * zero.
 */
function NothingDistributed({
  contextHref,
}: Readonly<{ contextHref: string | null }>) {
  return (
    <PMVStack
      flex="1"
      minH={0}
      justify="center"
      align="center"
      gap={0}
      paddingX={6}
      /*
       * Centred, then lifted off the true centre, as on Context: the eye reads
       * the middle of the words as the middle of the block, so a mathematically
       * centred composition with a control under it sits visibly low.
       */
      paddingBottom={12}
      bg="background.primary"
    >
      {/*
        The object being named rather than an ornament above it: the same mark
        the rail puts on every repository row, so the first thing on screen is
        the kind of thing the list will fill up with.
      */}
      <PMBox
        width="40px"
        height="40px"
        borderRadius="md"
        bg="background.tertiary"
        color="text.tertiary"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <PMIcon fontSize="lg">
          <LuFolderGit2 />
        </PMIcon>
      </PMBox>

      <PMHeading
        level="h2"
        textAlign="center"
        paddingTop={5}
        textWrap="balance"
      >
        Nothing distributed yet
      </PMHeading>

      {/*
        Capped well inside the reading measure: centred text is taken in at a
        glance rather than scanned, and it only reads that way while the lines
        are short enough that the eye does not hunt for the next one.
      */}
      <PMText
        as="div"
        color="secondary"
        textAlign="center"
        maxWidth="46ch"
        lineHeight={1.6}
        paddingTop={2}
        textWrap="pretty"
      >
        This list fills itself: a repository or a marketplace appears here the
        first time a package lands in it. Distributing starts from the package,
        in Context.
      </PMText>

      {contextHref && (
        <PMBox paddingTop={6}>
          <PMButton variant="primary" asChild>
            <Link to={contextHref}>Go to Context</Link>
          </PMButton>
        </PMBox>
      )}
    </PMVStack>
  );
}
