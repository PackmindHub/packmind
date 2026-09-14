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
import type {
  GitProviderId,
  PackageId,
  PackageResponse,
} from '@packmind/types';
import { useGetGitProvidersQuery } from '../../../git/api/queries/GitProviderQueries';
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

/**
 * Where a package has got to, as one list.
 *
 * It was the drift pane the Distribution surface reads, which was the right
 * call while the two screens showed the same state and the one that could push
 * was that pane. What it is not built for is the size this one reaches: a
 * package landing in three hundred places is three hundred rows of a table, and
 * the four that need a hand are somewhere in them.
 *
 * So this list instead, shared with the edition that also publishes to
 * marketplaces. The exceptions are the page, what is fine folds into a count,
 * and the rest is reached by a name. That pane is unchanged and still answers
 * the two screens it was written for.
 *
 * The distribution events open in a drawer over the list, from the link above
 * it. They are not a second place the package is: they answer "what happened"
 * where the list answers "where is it", and the reader asks for them when a row
 * failed, reads them, and goes on with the list still behind them.
 *
 * A drawer and not a takeover, even though at full width it covers as much.
 * What was wrong with the takeover this replaced is not that it filled the
 * screen, it is that it was somewhere to be: reached by a button and left by a
 * chevron. A drawer is not left, it is closed, and closing it puts back exactly
 * the state it opened over.
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
   * The edition that also publishes to marketplaces has picks this cannot
   * express, and the two tabs keep one shape so the pane above them can stay
   * one file.
   */
  onStartSync: (scope: SyncScope) => void;
  /** The flow is over, whether it ran or was cancelled. */
  onSyncClose: () => void;
}>) {
  const { data: providersResponse, isLoading: isProvidersLoading } =
    useGetGitProvidersQuery();
  const providersWithToken = useMemo<Set<GitProviderId>>(
    () => providersWithTokenSet(providersResponse),
    [providersResponse],
  );
  const [isHistoryOpen, setHistoryOpen] = useState(false);

  /*
   * No publications in this edition, so the list is the repositories alone. The
   * model takes them as an optional argument for exactly this: one list, one
   * set of rules about what is behind, and a marketplace half only where there
   * is one.
   */
  const destinations = useMemo(
    () =>
      buildPackageDestinations({
        installs: drift ? installDriftEntries(drift) : [],
      }),
    [drift],
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
        <PMBox flex="1" minH={0} paddingX={6} paddingBottom={6}>
          <PMText color="error">Error loading distributions.</PMText>
        </PMBox>
      ) : destinations.length === 0 ? (
        <PMBox
          flex="1"
          minH={0}
          overflowY="auto"
          paddingX={6}
          paddingBottom={6}
        >
          <NeverDistributed />
        </PMBox>
      ) : (
        <PMBox
          flex="1"
          minH={0}
          overflowY="auto"
          paddingX={6}
          paddingBottom={6}
        >
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
              const installKeys = picked
                .map((destination) => destination.installKey)
                .filter((key): key is string => key !== null);
              if (installKeys.length > 0) {
                onStartSync({
                  kind: 'package',
                  packageId: pkg.id,
                  installKeys,
                });
              }
            }}
          />
        </PMBox>
      )}

      {/*
        Titled with the package and not with "Distribution history": the list
        inside already carries that as its section heading, and the one thing
        the drawer can add is which package these events belong to.

        Rendered whether or not anything has asked for it. A drawer mounted by
        the same click that opens it is one frame of an empty panel sliding in.
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
 * A package that exists but has never been pushed anywhere. It says what that
 * costs rather than reporting an absence of rows: the package is readable here
 * and by nothing else.
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
