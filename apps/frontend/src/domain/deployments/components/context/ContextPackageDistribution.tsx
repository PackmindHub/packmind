import { useMemo, useState } from 'react';
import { PMBox, PMHStack, PMSpinner, PMText, PMVStack } from '@packmind/ui';
import { LuGitBranch, LuHistory } from 'react-icons/lu';
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
import { ContextChip } from './ContextChip';

/**
 * The two readings of where a package has got to: the targets it is installed in
 * and their drift, and the events that put it there.
 *
 * Peers rather than one screen with a way out of it. The first version made the
 * history a takeover, reached by a button and left by a chevron, which put a
 * button and a destructive control above a pane that already carries its own. A
 * chip per reading says the same thing with none, and there is nothing to go
 * back from, because nothing was left.
 *
 * Still not sections stacked under each other: the drift pane owns its height
 * and scrolls inside it, and a second scrolling region under a scrolling region
 * is how a reader loses both.
 */
type DistributionView = 'targets' | 'history';

/**
 * The other half of a package: not what it holds, but where it landed and what
 * is stale there.
 *
 * It reuses the drift pane built for the Distribution surface rather than
 * showing a lighter summary here. Two readings of the same state, one per
 * screen, is how a package ends up looking up to date in one place and behind in
 * the other; and the answer to "this is behind" has to be the redistribute
 * gesture, which only that pane carries.

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
  const [view, setView] = useState<DistributionView>('targets');

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
      {/*
        Which reading is on screen, above the pane and not inside it, because the
        pane is the Distribution surface's and is read by two other screens.

        Shown whatever the git side says, including while it is still loading and
        when nothing has ever been distributed: the count is what answers "how
        many places is this in" without a click.
      */}
      <PMHStack
        paddingX={6}
        paddingTop={4}
        paddingBottom={3}
        gap={1}
        align="center"
        flexShrink={0}
      >
        <ContextChip
          label="Targets"
          /*
           * Absent rather than zero while the query is out: a chip reading
           * zero and then three is a wrong answer followed by a right one.
           */
          count={isLoading ? undefined : (drift?.installLocations.length ?? 0)}
          icon={<LuGitBranch />}
          isActive={view === 'targets'}
          onClick={() => setView('targets')}
        />
        <ContextChip
          label="History"
          icon={<LuHistory />}
          isActive={view === 'history'}
          onClick={() => setView('history')}
        />
      </PMHStack>

      {view === 'history' ? (
        <PMBox
          flex="1"
          minH={0}
          overflowY="auto"
          paddingX={6}
          paddingBottom={6}
        >
          <PackageDistributionList
            packageId={pkg.id}
            title="Distribution history"
          />
        </PMBox>
      ) : isLoading ? (
        <PMHStack flex="1" minH={0} justify="center" align="center" gap={2}>
          <PMSpinner />
          <PMText color="secondary">Loading distributions...</PMText>
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
             * The header above this pane carries `Distribute`, so the pane does
             * not need a second package-wide push of its own. Its footer takes
             * that job over for the drifted ones.
             */
            surfaceOwnsDistribute
            providersWithToken={providersWithToken}
            isProvidersLoading={isProvidersLoading}
            onSyncPackage={onSyncPackage}
            /*
             * The events are read on this tab rather than on the package's page,
             * which is what this used to link out to. Reading why a distribution
             * failed is the one thing the reader does next after being told that
             * it did, and leaving the surface to do it drops everything else
             * they had open.
             */
            distributionHistory={{ onOpen: () => setView('history') }}
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
        <PMText fontWeight="medium">This package is nowhere yet.</PMText>
        <PMText color="secondary">
          It has never been distributed, so nothing reads it outside Packmind.
          Distributing it writes its components into a repository, where the
          agents working there pick them up.
        </PMText>
      </PMVStack>
    </PMBox>
  );
}
