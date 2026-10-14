import { useEffect, useMemo, useState } from 'react';
import {
  PMBadge,
  PMBox,
  PMButton,
  PMDialog,
  PMHStack,
  PMHeading,
  PMIcon,
  PMIconButton,
  PMMenu,
  PMPortal,
  PMTabsCompound,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuEllipsisVertical,
  LuPackageMinus,
  LuPencil,
  LuTag,
  LuTrash2,
} from 'react-icons/lu';
import { needsAHand, nextVersion } from '../data';
import type { Destination, HeaderApproach, PackageSnapshot } from '../types';
import { DistributeMenu, HeaderActions } from './HeaderActions';
import { ComponentsTab } from './ComponentsTab';
import { DistributionTab } from './DistributionTab';

const COMPONENTS_TAB = 'components';
const DISTRIBUTION_TAB = 'distribution';

/**
 * The package pane, as faithful a reproduction as the question needs: name and
 * description on the left, the contested slot plus the overflow menu on the
 * right, a version bar under both, and a tab strip whose far end carries
 * whichever control belongs to the tab that is open.
 */
export function PackagePane({
  approach,
  snapshot,
  onUpdate,
  onRelease,
  onLog,
}: Readonly<{
  approach: HeaderApproach;
  snapshot: PackageSnapshot;
  /** Marks the given destinations current, so an action has a visible result. */
  onUpdate: (destinations: readonly Destination[]) => void;
  onRelease: () => void;
  onLog: (text: string) => void;
}>) {
  const [tab, setTab] = useState<string>(COMPONENTS_TAB);
  /** The confirmation taking over the Distribution tab, or null. */
  const [syncing, setSyncing] = useState<readonly Destination[] | null>(null);
  const [isReleaseOpen, setReleaseOpen] = useState(false);
  /** Rows a `Release & Update` was pressed on, held while the drawer is up. */
  const [pendingPush, setPendingPush] = useState<readonly Destination[] | null>(
    null,
  );

  // A scenario change rebuilds the package under whatever flow was open.
  useEffect(() => {
    setSyncing(null);
    setPendingPush(null);
    setReleaseOpen(false);
  }, [snapshot]);

  const pendingCount = useMemo(
    () => snapshot.destinations.filter((d) => needsAHand(d.state)).length,
    [snapshot.destinations],
  );

  const openDistribution = () => setTab(DISTRIBUTION_TAB);

  const startSync = (destinations: readonly Destination[]) => {
    setTab(DISTRIBUTION_TAB);
    setSyncing(destinations);
  };

  const handlers = {
    onUpdateAll: () =>
      startSync(snapshot.destinations.filter((d) => needsAHand(d.state))),
    onPush: () => onLog('Opened the destination picker (push from Packmind).'),
    onCopyInstall: () =>
      onLog('Copied: packmind install web/frontend-conventions'),
    onCreateRelease: () => setReleaseOpen(true),
    onOpenDistribution: openDistribution,
  };

  const distributeControl = (
    <DistributeMenu
      trigger="standalone"
      variant={snapshot.destinations.length === 0 ? 'primary' : 'secondary'}
      handlers={handlers}
    />
  );

  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      bg="background.primary"
      overflow="hidden"
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <PMTabsCompound.Root
        value={tab}
        onValueChange={(details) => setTab(details.value)}
        variant="line"
        height="100%"
        minH={0}
        display="flex"
        flexDirection="column"
      >
        <PMBox paddingX={6} paddingTop={6} flexShrink={0}>
          <PMHStack align="start" justify="space-between" gap={6}>
            <PMBox minW={0} maxWidth="68ch">
              <PMHeading level="h2">{snapshot.name}</PMHeading>
              <PMText variant="small" color="faded">
                Updated 2 days ago · {snapshot.componentCount} components
              </PMText>
              <PMBox paddingTop={2}>
                <PMText color="secondary">{snapshot.description}</PMText>
              </PMBox>
            </PMBox>
            <PMHStack flexShrink={0} gap={2} align="center">
              <HeaderActions
                approach={approach}
                snapshot={snapshot}
                handlers={handlers}
              />
              <PMMenu.Root>
                <PMMenu.Trigger asChild>
                  <PMIconButton
                    aria-label={`More actions for ${snapshot.name}`}
                    variant="tertiary"
                    size="sm"
                  >
                    <LuEllipsisVertical />
                  </PMIconButton>
                </PMMenu.Trigger>
                <PMPortal>
                  <PMMenu.Positioner>
                    <PMMenu.Content>
                      <PMMenu.Item value="edit">
                        <PMHStack gap={2}>
                          <PMIcon>
                            <LuPencil />
                          </PMIcon>
                          Edit details
                        </PMHStack>
                      </PMMenu.Item>
                      {snapshot.destinations.length > 0 && (
                        <PMMenu.Item value="remove">
                          <PMHStack gap={2}>
                            <PMIcon>
                              <LuPackageMinus />
                            </PMIcon>
                            Remove from targets
                          </PMHStack>
                        </PMMenu.Item>
                      )}
                      <PMMenu.Item value="delete" color="text.error">
                        <PMHStack gap={2}>
                          <PMIcon>
                            <LuTrash2 />
                          </PMIcon>
                          Delete package
                        </PMHStack>
                      </PMMenu.Item>
                    </PMMenu.Content>
                  </PMMenu.Positioner>
                </PMPortal>
              </PMMenu.Root>
            </PMHStack>
          </PMHStack>

          <PMBox paddingTop={4}>
            <VersionBar
              approach={approach}
              snapshot={snapshot}
              onCreateRelease={() => setReleaseOpen(true)}
            />
          </PMBox>

          <PMBox paddingTop={5}>
            <PMHStack
              justify="space-between"
              align="center"
              gap={4}
              borderBottomWidth="1px"
              borderColor="border.secondary"
            >
              <PMTabsCompound.List borderBottomWidth={0}>
                <PMTabsCompound.Trigger value={COMPONENTS_TAB}>
                  Components
                  <PMText fontSize="xs" color="faded">
                    {snapshot.componentCount}
                  </PMText>
                </PMTabsCompound.Trigger>
                <PMTabsCompound.Trigger value={DISTRIBUTION_TAB}>
                  Distribution
                  {pendingCount > 0 && (
                    <PMBadge colorPalette="orange" size="sm">
                      {pendingCount}
                    </PMBadge>
                  )}
                </PMTabsCompound.Trigger>
              </PMTabsCompound.List>
              {/*
                The far end of the tab strip already belongs to whichever tab is
                open: `Add components` has lived here since it left the header.
                Every approach but the status quo gives the Distribution half
                its own occupant, which is the move this prototype is testing.
              */}
              {tab === COMPONENTS_TAB && (
                <PMButton variant="secondary" size="sm">
                  Add components
                </PMButton>
              )}
              {tab === DISTRIBUTION_TAB &&
                approach !== 'today' &&
                snapshot.destinations.length > 0 &&
                distributeControl}
            </PMHStack>
          </PMBox>
        </PMBox>

        <PMTabsCompound.Content
          value={COMPONENTS_TAB}
          flex="1"
          minH={0}
          overflowY="auto"
        >
          <ComponentsTab
            approach={approach}
            destinations={snapshot.destinations}
            onOpenDistribution={openDistribution}
          />
        </PMTabsCompound.Content>

        <PMTabsCompound.Content
          value={DISTRIBUTION_TAB}
          flex="1"
          minH={0}
          overflowY="auto"
        >
          {syncing ? (
            <SyncConfirmation
              destinations={syncing}
              onCancel={() => {
                setSyncing(null);
                onLog('Cancelled the push.');
              }}
              onConfirm={() => {
                onUpdate(syncing);
                onLog(
                  `Pushed to ${syncing.length} destination${
                    syncing.length === 1 ? '' : 's'
                  }.`,
                );
                setSyncing(null);
              }}
            />
          ) : (
            <DistributionTab
              approach={approach}
              destinations={snapshot.destinations}
              distributeControl={distributeControl}
              onUpdate={startSync}
              onReleaseAndUpdate={(picked) => {
                setPendingPush(picked);
                setReleaseOpen(true);
              }}
            />
          )}
        </PMTabsCompound.Content>
      </PMTabsCompound.Root>

      <ReleaseDialog
        open={isReleaseOpen}
        snapshot={snapshot}
        pendingPushCount={pendingPush?.length ?? 0}
        onOpenChange={(open) => {
          setReleaseOpen(open);
          if (!open) setPendingPush(null);
        }}
        onConfirm={() => {
          onRelease();
          onLog(`Cut ${nextVersion(snapshot.currentVersion)}.`);
          setReleaseOpen(false);
          if (pendingPush) {
            startSync(pendingPush);
            setPendingPush(null);
          }
        }}
      />
    </PMBox>
  );
}

/**
 * Which version is on screen, and — unless the header has taken it — the way to
 * cut a new one. Approach B moves that button upstairs, and the bar has to lose
 * it there: two places to cut is the problem this whole exercise is about.
 */
function VersionBar({
  approach,
  snapshot,
  onCreateRelease,
}: Readonly<{
  approach: HeaderApproach;
  snapshot: PackageSnapshot;
  onCreateRelease: () => void;
}>) {
  return (
    <PMHStack
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      paddingX={3}
      paddingY={2}
      gap={3}
      align="center"
    >
      <PMText variant="small" color="secondary">
        Reading
      </PMText>
      <PMText variant="small-important">
        {snapshot.currentVersion
          ? `Latest (${snapshot.currentVersion})`
          : 'Unreleased working copy'}
      </PMText>
      {snapshot.changesSinceRelease > 0 && snapshot.currentVersion && (
        <PMText variant="small" color="warning">
          {snapshot.changesSinceRelease} component
          {snapshot.changesSinceRelease === 1 ? '' : 's'} changed since
        </PMText>
      )}
      <PMBox flex="1" />
      {approach === 'release' ? (
        <PMText variant="small" color="faded">
          Release moved to the header →
        </PMText>
      ) : (
        <PMButton variant="secondary" size="xs" onClick={onCreateRelease}>
          <PMIcon fontSize="xs">
            <LuTag />
          </PMIcon>
          Create release
        </PMButton>
      )}
    </PMHStack>
  );
}

/** The flow the push opens, standing in for the production Sync surface. */
function SyncConfirmation({
  destinations,
  onCancel,
  onConfirm,
}: Readonly<{
  destinations: readonly Destination[];
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  return (
    <PMBox padding={6}>
      <PMVStack align="stretch" gap={4} maxWidth="68ch">
        <PMHeading level="h3">
          Push to {destinations.length} destination
          {destinations.length === 1 ? '' : 's'}
        </PMHeading>
        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          overflow="hidden"
        >
          {destinations.slice(0, 8).map((destination, index) => (
            <PMHStack
              key={destination.id}
              paddingX={3}
              paddingY={2}
              borderBottomWidth={
                index === Math.min(destinations.length, 8) - 1 ? 0 : '1px'
              }
              borderColor="border.tertiary"
              gap={3}
            >
              <PMText variant="small" flex="1" truncate>
                {destination.name}
              </PMText>
              <PMText variant="small" color="faded">
                {destination.version} → latest
              </PMText>
            </PMHStack>
          ))}
          {destinations.length > 8 && (
            <PMBox paddingX={3} paddingY={2}>
              <PMText variant="small" color="faded">
                and {destinations.length - 8} more
              </PMText>
            </PMBox>
          )}
        </PMBox>
        <PMHStack gap={2}>
          <PMButton variant="primary" size="sm" onClick={onConfirm}>
            Confirm push
          </PMButton>
          <PMButton variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </PMButton>
        </PMHStack>
      </PMVStack>
    </PMBox>
  );
}

function ReleaseDialog({
  open,
  snapshot,
  pendingPushCount,
  onOpenChange,
  onConfirm,
}: Readonly<{
  open: boolean;
  snapshot: PackageSnapshot;
  pendingPushCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}>) {
  const version = nextVersion(snapshot.currentVersion);
  return (
    <PMDialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title>Cut {version}</PMDialog.Title>
            </PMDialog.Header>
            <PMDialog.Body>
              <PMVStack align="start" gap={2}>
                <PMText color="secondary">
                  Freezes the {snapshot.componentCount} components as they stand
                  and gives them a version destinations can be pinned to.
                </PMText>
                {pendingPushCount > 0 && (
                  <PMText variant="small" color="warning">
                    Then pushes it to the {pendingPushCount} destination
                    {pendingPushCount === 1 ? '' : 's'} you picked.
                  </PMText>
                )}
              </PMVStack>
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="tertiary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </PMButton>
              <PMButton variant="primary" size="sm" onClick={onConfirm}>
                Cut {version}
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );
}
