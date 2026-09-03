import { useMemo, useState } from 'react';
import {
  PMBox,
  PMCloseButton,
  PMDrawer,
  PMHStack,
  PMHeading,
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
import { PackageDetailPane } from '../redesign/components/PackageDetailPane';
import {
  SyncSurface,
  type SyncScope,
} from '../redesign/components/SyncSurface';
import { providersWithTokenSet } from '../redesign/selectors/providerAuth';
import type { PackageDrift } from '../redesign/types';

/**
 * The other half of a package: not what it holds, but where it landed and what
 * is stale there.
 *
 * It reuses the drift pane built for the Distribution surface rather than
 * showing a lighter summary here. Two readings of the same state, one per
 * screen, is how a package ends up looking up to date in one place and behind in
 * the other; and the answer to "this is behind" has to be the redistribute
 * gesture, which only that pane carries.
 *
 * One reading and no chip row above it. The targets used to share that row with
 * the distribution events, which are not a second place the package is: they
 * answer "what happened" where the targets answer "where is it", and the row
 * showed it, since the events were the one chip that could carry no count. They
 * open in a drawer now, from the pane's own link and from its failure alert,
 * which is where a reader asks for them: a row failed, they want to know why,
 * they read it and go on with the list still behind them. That left one chip,
 * always active, choosing between itself and nothing, so the row went with it.
 *
 * A drawer and not the takeover the events used to be, even though at full
 * width it covers as much. What was wrong with that one is not that it filled
 * the screen, it is that it was somewhere to be: reached by a button and left
 * by a chevron. A drawer is not left, it is closed, and closing it puts back
 * exactly the state it opened over.
 */
export function ContextPackageDistribution({
  pkg,
  drift,
  packages,
  isLoading,
  isError,
  syncScope,
  onSyncPackage,
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
   * Asks the pane above to start the flow, for every drifted destination or for
   * the subset the list has ticked.
   */
  onSyncPackage: (packageId: PackageId, installKeys?: string[]) => void;
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
      ) : drift ? (
        <PMBox flex="1" minH={0}>
          <PackageDetailPane
            pkg={drift}
            hideIdentityHeader
            /*
             * The header above this pane carries both `Distribute` and, when
             * something is behind, `Update N destinations`, so the pane does not
             * need a package-wide push of its own. What it keeps acts on a
             * selection, which is a different question.
             */
            surfaceOwnsDistribute
            /*
             * `Artifacts` is the count on the Components tab two rows up, and it
             * is the size of the half you are not looking at.
             *
             * `Distributions` stays. There is no chip row in this edition, so
             * the summary is the only place the destination count is stated,
             * and the list below it is somewhere to count rather than somewhere
             * to read a number.
             *
             * What the summary keeps besides it is state rather than
             * inventory: what is behind, what failed, when this last went out.
             */
            surfaceOwnsStats={['artifacts']}
            providersWithToken={providersWithToken}
            isProvidersLoading={isProvidersLoading}
            onSyncPackage={onSyncPackage}
            /*
             * The pane's standing link and its failure alert both land here, and
             * this surface no longer claims to own the entry, so the link is
             * back in the summary row. That link is the whole of what the chip
             * used to be, one row lower and next to what prompts it.
             */
            distributionHistory={{ onOpen: () => setHistoryOpen(true) }}
          />
        </PMBox>
      ) : (
        <PMBox
          flex="1"
          minH={0}
          overflowY="auto"
          paddingX={6}
          paddingBottom={6}
        >
          <NeverDistributed />
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
