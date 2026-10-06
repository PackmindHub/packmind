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
import { useListPackageReleasesQuery } from '../../api/queries/DeploymentsQueries';
import { CreatePackageReleaseDrawer } from './CreatePackageReleaseDrawer';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
import { useMarketplaceBatchDistribution } from '@packmind/proprietary/frontend/domain/marketplaces/components/redesign/useMarketplaceBatchDistribution';
import { PackageDistributionList } from '../PackageDistributionList';
import {
  SyncSurface,
  type SyncScope,
} from '../redesign/components/SyncSurface';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import type { PackageDrift } from '../redesign/types';
import { ContextDestinationList } from './ContextDestinationList';
import type { PackageDestination } from './buildPackageDestinations';
import { buildPackageSyncScope } from './buildPackageSyncScope';
import { usePackageDestinations } from './usePackageDestinations';

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
   * The release drawer, reached from the row that raised the question. The
   * package's version bar above the tabs owns one too, and the readiness both
   * read is the same cached query rather than a second fetch: what differs is
   * only where the reader was standing when they asked for it.
   */
  const [isReleaseOpen, setReleaseOpen] = useState(false);
  /*
   * The rows a `Release & Update` was pressed on, held while the drawer is up.
   *
   * The destinations rather than the scope they build into: the scope is read
   * against the drift, and the whole point of the wait is that the drift is
   * about to change. Built on the way out instead, from the release that now
   * exists.
   *
   * Null is "no push is waiting on this drawer", which is also what the version
   * bar's own release button leaves it as — cutting from there is a release and
   * nothing more.
   */
  const [pendingRelease, setPendingRelease] = useState<
    readonly PackageDestination[] | null
  >(null);

  const { data: releases } = useListPackageReleasesQuery(
    organization?.id,
    pkg.spaceId,
    pkg.id,
  );
  /*
   * Withheld until it is known, so the row offers nothing rather than a button
   * that opens an empty form: the drawer is built from this, and a reader who
   * clicked before it arrived would be looking at a release with no versions to
   * choose from.
   */
  const releaseReadiness = releases?.readiness ?? null;

  const {
    destinations,
    marketplaces,
    isLoading: isPublicationsLoading,
  } = usePackageDestinations(pkg.id, drift);
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
          <ContextDestinationList
            destinations={destinations}
            /*
              The way into the events, above the list rather than inside it. It
              was on the drift pane's summary row, which this list replaced, and
              it is the one thing that row carried which the rows themselves
              cannot: what happened here, as opposed to where things stand.

              On the search line rather than a line of its own. Alone on a row
              it cost the list a full line of height to say one short thing,
              and it reads the same at the far end of a line that was already
              there.
            */
            headerAction={
              <PMLink
                as="button"
                fontSize="xs"
                flexShrink={0}
                onClick={() => setHistoryOpen(true)}
              >
                Distribution history
              </PMLink>
            }
            /*
              The same drawer, reached from the row that raised the question.
              The link above answers "what has happened here"; a failed row
              that has already read its reason and wants the rest of the run
              is asking about one landing, and sending it to the top of the
              list to find the same panel is a detour through nothing.
            */
            onOpenHistory={() => setHistoryOpen(true)}
            onUpdate={(picked) => {
              const scope = buildPackageSyncScope(picked, pkg.id, marketplaces);
              if (scope) onStartSync(scope);
            }}
            onReleaseAndUpdate={
              releaseReadiness
                ? (picked) => {
                    setPendingRelease(picked);
                    setReleaseOpen(true);
                  }
                : undefined
            }
          />
        </PMBox>
      )}

      {organization && releaseReadiness && (
        <CreatePackageReleaseDrawer
          packageId={pkg.id}
          spaceId={pkg.spaceId}
          organizationId={organization.id}
          readiness={releaseReadiness}
          componentsCount={
            pkg.recipes.length + pkg.standards.length + pkg.skills.length
          }
          open={isReleaseOpen}
          onOpenChange={(next) => {
            setReleaseOpen(next);
            /*
             * Cancelling the form cancels the push it was the first half of.
             * Leaving it set would make the next release cut from anywhere —
             * the version bar above included — distribute to rows the reader
             * picked for a gesture they then abandoned.
             */
            if (!next) setPendingRelease(null);
          }}
          onReleased={() => {
            if (!pendingRelease) return;
            setPendingRelease(null);
            /*
             * Against the release that was just cut, which is what the drift
             * now reads: the mutation refreshes it before resolving, so these
             * landings have moved from "on the newest release" to "a release
             * behind" by the time this runs, and that is precisely the standing
             * the confirmation can send.
             */
            const scope = buildPackageSyncScope(
              pendingRelease,
              pkg.id,
              marketplaces,
            );
            if (scope) onStartSync(scope);
          }}
        />
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
                    spaceId={pkg.spaceId}
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
