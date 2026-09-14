import { useMemo, useState } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
  PMLink,
  PMPortal,
  PMSpinner,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { GitProviderId, PackageResponse } from '@packmind/types';
import { useAuthContext } from '../../../accounts/hooks/useAuthContext';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { usePackageMarketplacePublications } from '@packmind/proprietary/frontend/domain/marketplaces/components/usePackageMarketplacePublications';
import { useMarketplaceBatchDistribution } from '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/useMarketplaceBatchDistribution';
import { useSpaceMarketplaces } from '@packmind/proprietary/frontend/domain/spaces/components/overview/useSpaceMarketplaces';
import { PackageDistributionList } from '../PackageDistributionList';
import {
  SyncSurface,
  type SyncScope,
} from '../redesign/components/SyncSurface';
import { installDriftEntries } from '../redesign/selectors/installDriftEntries';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import type { PackageDrift } from '../redesign/types';
import { ContextDestinationList } from './ContextDestinationList';
import { buildPackageDestinations } from './buildPackageDestinations';
import { buildPackageSyncScope } from './buildPackageSyncScope';
import { toPackagePublications } from './toPackagePublications';

/**
 * Where a package has got to, as one list.
 *
 * It was two: the repositories it is installed in behind one chip, the
 * marketplaces it is published to behind another, each with its own pane and
 * its own idea of what a row looks like. They answer one question, and a reader
 * holding it had to ask twice and add the answers up. Worse, the two panes
 * could not be compared: a package could be behind on both and the tab would
 * only ever show one of them at a time.
 *
 * So the chips are gone and the rows are peers. What is left of the choice they
 * offered is a filter over one list, which is the thing a reader wanted from
 * them in the first place.
 *
 * The events that put the package in either place were once a third chip, and
 * they are not a third place. They answer "what happened", where the list
 * answers "where is it". They open in a drawer over the list, from the link
 * above it, which is where a reader asks for them: a row failed, they want to
 * know why, they read it and go on with the list still behind them.
 *
 * A drawer and not a takeover, even though at full width it covers as much.
 * What was wrong with the takeover this replaced is not that it filled the
 * screen, it is that it was somewhere to be: reached by a button and left by a
 * chevron. A drawer is not left, it is closed, and closing it puts back exactly
 * the state it opened over.
 *
 * The same file in both editions, which it was not until the marketplace half
 * moved behind the `@packmind/proprietary/frontend` alias. Two copies that read
 * alike but cannot be diffed put a conflict on every upstream sync, seven hunks
 * wide, whose resolution was always "keep ours" and whose one wrong resolution
 * would take the marketplaces out of this edition. What is edition-shaped is
 * three hook imports and the mapping behind them; the Open Source build answers
 * those with stubs that report no marketplace, and everything below reads the
 * publications as a plain shape that names no domain.
 */
export function ContextPackageDistribution({
  pkg,
  drift,
  packages,
  isLoading,
  isError,
  syncScope,
  onStartSync,
  onSyncClose,
}: Readonly<{
  pkg: PackageResponse;
  /** Null when the package has never been distributed anywhere. */
  drift: PackageDrift | null;
  /** Every package of the space: the redistribute flow reads across them. */
  packages: PackageDrift[];
  isLoading: boolean;
  isError: boolean;
  /**
   * The redistribute flow in progress, or null when there is none.
   *
   * Held by the pane above rather than here, even though this is what renders
   * it: the header sitting above both tabs is what will carry the package-wide
   * push, and a flow two controls can start cannot be owned by one of the two
   * halves it can be started from.
   */
  syncScope: SyncScope | null;
  /**
   * Asks the pane above to start the flow over what this tab hands it.
   *
   * A whole scope and not a package with keys, which is what it used to take.
   * A pick can now carry catalogs as well as landings, and those travel in a
   * lane of their own: a plugin is not written by the call that writes a
   * repository, and the confirmation states the two apart precisely because one
   * is finished when it returns and the other waits on a merge.
   */
  onStartSync: (scope: SyncScope) => void;
  /** The flow is over, whether it ran or was cancelled. */
  onSyncClose: () => void;
}>) {
  const { organization } = useAuthContext();
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo<Set<GitProviderId>>(
    () => providersWithTokenSet(providersResponse),
    [providersResponse],
  );
  const [isHistoryOpen, setHistoryOpen] = useState(false);

  /*
   * An empty organization id disables the query rather than asking about
   * nobody's marketplaces, which is what lets this be called unconditionally in
   * a pane that can render without an organization. It used to live inside a
   * chip for want of that guard, and the chip then had to report its count
   * upwards for the tab to know what to open on.
   */
  const { publications, isLoading: isPublicationsLoading } =
    usePackageMarketplacePublications(organization?.id ?? '', pkg.id);
  /*
   * Membership and staleness are two different questions here, and only the
   * first has an answer scoped to this package: the publications say which
   * marketplaces carry it, and the space's drift says which of the copies have
   * been overtaken. Both hooks fan out over the same distribution queries, so
   * React Query answers the second one from the cache of the first.
   */
  const { marketplaces } = useSpaceMarketplaces();
  /*
   * Withheld rather than passed with no organization, which is what the
   * Distribution rail does with it: the confirmation hides its whole
   * marketplace lane when the callback is absent, and that is the honest answer
   * to "we cannot publish on anyone's behalf", better than a row that comes
   * back refused.
   */
  const distributeMarketplaces = useMarketplaceBatchDistribution(
    organization?.id ?? null,
  );

  const destinations = useMemo(
    () =>
      buildPackageDestinations({
        installs: drift ? installDriftEntries(drift) : [],
        publications: toPackagePublications(publications, marketplaces, pkg.id),
      }),
    [drift, publications, marketplaces, pkg.id],
  );

  /*
   * The redistribute flow takes over the pane and leaves the rail alone: the
   * package it is about is named in the header just above, and cancelling has to
   * come back to the same place it started from.
   */
  if (syncScope !== null) {
    return (
      <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
        <SyncSurface
          packages={packages}
          scope={syncScope}
          providersWithToken={providersWithToken}
          isProvidersLoading={isProvidersLoading}
          onDistributeMarketplaces={
            organization ? distributeMarketplaces : undefined
          }
          onCancel={onSyncClose}
          onConfirm={onSyncClose}
        />
      </PMBox>
    );
  }

  return (
    <PMVStack align="stretch" gap={0} flex="1" minH={0}>
      {isLoading ? (
        <PMHStack flex="1" minH={0} justify="center" align="center" gap={2}>
          <PMSpinner />
          <PMText color="secondary">Loading distributions…</PMText>
        </PMHStack>
      ) : isError ? (
        <PMBox flex="1" minH={0} padding={6}>
          <PMText color="error">Error loading distributions.</PMText>
        </PMBox>
      ) : destinations.length === 0 ? (
        <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
          {/*
            Only when both halves have answered. The git side is settled by the
            guard above; the publications are not, and a package published to a
            marketplace and to no repository would otherwise be told it stands
            nowhere for as long as that fan-out takes.
          */}
          {isPublicationsLoading ? (
            <PMHStack gap={2} align="center">
              <PMSpinner size="sm" />
              <PMText color="secondary">Loading distributions…</PMText>
            </PMHStack>
          ) : (
            <NeverDistributed />
          )}
        </PMBox>
      ) : (
        <PMBox flex="1" minH={0} overflowY="auto" padding={6}>
          {/*
            The way into the events, above the list rather than inside it. It
            was on the drift pane's summary row, which this list replaced, and
            it is the one thing that row carried which the rows themselves
            cannot: what happened here, as opposed to where things stand.
          */}
          <PMHStack justify="flex-end" paddingBottom={2}>
            <PMLink
              as="button"
              fontSize="xs"
              onClick={() => setHistoryOpen(true)}
            >
              Distribution history
            </PMLink>
          </PMHStack>
          <ContextDestinationList
            destinations={destinations}
            onUpdate={(picked) => {
              const scope = buildPackageSyncScope(picked, pkg.id, marketplaces);
              if (scope) onStartSync(scope);
            }}
          />
        </PMBox>
      )}

      {/*
        Titled with the package and not with "Distribution history": the list
        inside already carries that as its section heading, and the one thing
        the drawer can add is which package these events belong to.

        Rendered whatever is on screen, including the readings that cannot open
        it. A drawer that only exists once something has asked for it has to be
        mounted by the same click that opens it, and that is one frame of an
        empty panel sliding in.
      */}
      <PMDrawer.Root
        open={isHistoryOpen}
        onOpenChange={(event) => setHistoryOpen(event.open)}
        placement="end"
        /*
         * Full width, because `xl` caps the panel at 56rem and the events table
         * carries a repository, a target, a version, an author, a date and a
         * status across it. Below that it wraps into something you read column
         * by column, which is not how you scan a log.
         *
         * There is no step between the two: the sizes go from 56rem to the
         * viewport, so this is the narrower of the two honest answers.
         */
        size="full"
      >
        <PMPortal>
          <PMDrawer.Backdrop />
          <PMDrawer.Positioner>
            <PMDrawer.Content>
              <PMDrawer.Header
                borderBottom="1px solid"
                borderColor="border.tertiary"
              >
                <PMHeading level="h3">{pkg.name}</PMHeading>
                <PMDrawer.CloseTrigger asChild>
                  <PMCloseButton size="sm" />
                </PMDrawer.CloseTrigger>
              </PMDrawer.Header>
              {/*
                No padding at the top of the scrolling region, because the
                events table pins its header to it. Sticky sits against the
                padding box, so twenty pixels there left a band above the
                header where the rows underneath showed through. The gap moves
                inside, where it scrolls away with the heading it belongs to.
              */}
              <PMDrawer.Body paddingX={5} paddingBottom={5} paddingTop={0}>
                <PMBox paddingTop={5}>
                  <PackageDistributionList
                    packageId={pkg.id}
                    title="Distribution history"
                  />
                </PMBox>
              </PMDrawer.Body>
            </PMDrawer.Content>
          </PMDrawer.Positioner>
        </PMPortal>
      </PMDrawer.Root>
    </PMVStack>
  );
}

/**
 * A package that stands nowhere at all.
 *
 * It used to have a second sentence, for the package held by a marketplace and
 * by no repository, because the repositories pane was reached on its own and
 * had to explain that its emptiness was not the whole story. The list has no
 * such half: a marketplace that carries the package is a row in it, so the
 * empty state is only ever the honest one.
 */
function NeverDistributed() {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMVStack align="start" gap={1}>
        <PMText fontWeight="medium">Nothing distributed yet.</PMText>
        <PMText color="secondary">
          It has never been distributed, so nothing reads it outside Packmind.
          Distributing it writes its components into a repository, where the
          agents working there pick them up.
        </PMText>
      </PMVStack>
    </PMBox>
  );
}
