import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMMenu,
  PMPopover,
  PMPortal,
  PMText,
  PMTooltip,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuChevronRight,
  LuRotateCw,
  LuTag,
  LuTerminal,
} from 'react-icons/lu';
import { nextVersion, pendingDestinations } from '../data';
import type { HeaderApproach, PackageSnapshot } from '../types';
import { SPLIT_BUTTON_SEAM, splitButtonHalf } from './splitButton';

export interface HeaderActionHandlers {
  /** Push every destination that is not current. One gesture, from anywhere. */
  onUpdateAll: () => void;
  /** Open the two channels: Packmind pushing, or a developer installing. */
  onPush: () => void;
  onCopyInstall: () => void;
  onCreateRelease: () => void;
  onOpenDistribution: () => void;
}

/**
 * Whatever the chosen approach puts in the header's primary slot.
 *
 * Each branch is a complete answer rather than a variation on one control: the
 * point of switching between them in a browser is to feel a header that acts,
 * a header that states, and a header that does neither.
 */
export function HeaderActions({
  approach,
  snapshot,
  handlers,
}: Readonly<{
  approach: HeaderApproach;
  snapshot: PackageSnapshot;
  handlers: HeaderActionHandlers;
}>) {
  const pending = pendingDestinations(snapshot.destinations);
  const isDistributedSomewhere = snapshot.destinations.length > 0;

  switch (approach) {
    case 'today':
      return (
        <TodayCta
          snapshot={snapshot}
          pendingCount={pending.length}
          handlers={handlers}
        />
      );

    /*
     * Nothing at all. The overflow menu beside this slot is still there, drawn
     * by the pane, so the header is not actionless — it is verbless, which is
     * the claim being tested.
     */
    case 'none':
      return null;

    case 'release':
      return <ReleaseCta snapshot={snapshot} handlers={handlers} />;

    case 'reach':
      return (
        <ReachSummary
          total={snapshot.destinations.length}
          pendingCount={pending.length}
          onOpen={handlers.onOpenDistribution}
        />
      );

    case 'install':
      return (
        <InstallCta
          isDistributedSomewhere={isDistributedSomewhere}
          onCopy={handlers.onCopyInstall}
        />
      );
  }
}

/**
 * The status quo: one slot, three sentences. Worth rendering faithfully, since
 * every alternative is read against it.
 */
function TodayCta({
  snapshot,
  pendingCount,
  handlers,
}: Readonly<{
  snapshot: PackageSnapshot;
  pendingCount: number;
  handlers: HeaderActionHandlers;
}>) {
  const behind = snapshot.destinations.filter(
    (destination) =>
      destination.state === 'behind' || destination.state === 'drifted',
  ).length;

  if (behind > 0) {
    return (
      <PMHStack gap={SPLIT_BUTTON_SEAM}>
        <PMButton
          variant="primary"
          size="sm"
          onClick={handlers.onUpdateAll}
          {...splitButtonHalf('leading')}
        >
          <PMIcon fontSize="xs">
            <LuRotateCw />
          </PMIcon>
          Update {behind} distribution{behind === 1 ? '' : 's'}
        </PMButton>
        <DistributeMenu trigger="split" variant="primary" handlers={handlers} />
      </PMHStack>
    );
  }

  return (
    <DistributeMenu
      trigger="standalone"
      variant={
        pendingCount > 0 || snapshot.destinations.length === 0
          ? 'primary'
          : 'secondary'
      }
      handlers={handlers}
    />
  );
}

/**
 * The two channels a package travels by, under one control. The same menu the
 * Distribution tab's own `Distribute` opens, because they are one act asked for
 * from two places.
 */
export function DistributeMenu({
  trigger,
  variant,
  label = 'Distribute',
  handlers,
}: Readonly<{
  trigger: 'standalone' | 'split';
  variant: 'primary' | 'secondary' | 'tertiary';
  label?: string;
  handlers: Pick<HeaderActionHandlers, 'onPush' | 'onCopyInstall'>;
}>) {
  return (
    <PMMenu.Root>
      <PMMenu.Trigger asChild>
        {trigger === 'split' ? (
          <PMButton
            size="sm"
            variant={variant}
            aria-label={label}
            paddingInline={2}
            {...splitButtonHalf('trailing')}
          >
            <LuChevronDown aria-hidden />
          </PMButton>
        ) : (
          <PMButton size="sm" variant={variant}>
            {label}
            <LuChevronDown aria-hidden />
          </PMButton>
        )}
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content minW="22rem">
            <PMMenu.Item value="push" onClick={handlers.onPush}>
              <PMVStack align="start" gap={0} paddingY={1}>
                <PMText variant="body-important">Push from Packmind</PMText>
                <PMText variant="small" color="faded">
                  Pick a repository or a marketplace. Packmind writes it there.
                </PMText>
              </PMVStack>
            </PMMenu.Item>
            <PMMenu.Item value="cli" onClick={handlers.onCopyInstall}>
              <PMVStack align="start" gap={0} paddingY={1}>
                <PMText variant="body-important">Install with the CLI</PMText>
                <PMText variant="small" color="faded">
                  Run it yourself, from a checkout, when you choose.
                </PMText>
              </PMVStack>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}

/**
 * Approach B. The cut is the hinge between the two tabs — it freezes what the
 * content half holds so the distribution half has something to send — and it is
 * the only package-wide act that belongs to neither of them.
 *
 * Disabled rather than absent when nothing has moved, because the dead state is
 * half of what is being evaluated: a header whose one control is grey most of
 * the time has not solved very much.
 */
function ReleaseCta({
  snapshot,
  handlers,
}: Readonly<{
  snapshot: PackageSnapshot;
  handlers: HeaderActionHandlers;
}>) {
  const { currentVersion, changesSinceRelease } = snapshot;

  if (currentVersion === null) {
    return (
      <PMButton variant="primary" size="sm" onClick={handlers.onCreateRelease}>
        <PMIcon fontSize="xs">
          <LuTag />
        </PMIcon>
        Cut the first release
      </PMButton>
    );
  }

  if (changesSinceRelease === 0) {
    return (
      <PMTooltip
        label={`Nothing has changed since ${currentVersion}.`}
        placement="top"
        showArrow
      >
        <PMButton variant="secondary" size="sm" disabled>
          <PMIcon fontSize="xs">
            <LuTag />
          </PMIcon>
          Create release
        </PMButton>
      </PMTooltip>
    );
  }

  return (
    <PMButton variant="primary" size="sm" onClick={handlers.onCreateRelease}>
      <PMIcon fontSize="xs">
        <LuTag />
      </PMIcon>
      Release {changesSinceRelease} change
      {changesSinceRelease === 1 ? '' : 's'} as {nextVersion(currentVersion)}
    </PMButton>
  );
}

/**
 * Approach C. Not a verb: where the package has got to, in one line, linking to
 * the tab that proves it. The slot stops competing with the tab strip for the
 * reader's next click and starts telling them whether they need one.
 */
function ReachSummary({
  total,
  pendingCount,
  onOpen,
}: Readonly<{ total: number; pendingCount: number; onOpen: () => void }>) {
  return (
    <PMBox
      as="button"
      onClick={onOpen}
      textAlign="right"
      borderRadius="sm"
      paddingX={3}
      paddingY="6px"
      cursor="pointer"
      _hover={{ bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
    >
      <PMHStack gap={2} align="center">
        <PMVStack align="end" gap={0}>
          <PMText variant="body-important">
            {total === 0
              ? 'Nowhere yet'
              : `${total} destination${total === 1 ? '' : 's'}`}
          </PMText>
          <PMText
            variant="small"
            color={pendingCount > 0 ? 'warning' : 'faded'}
          >
            {total === 0
              ? 'Nothing reads it outside Packmind'
              : pendingCount > 0
                ? `${pendingCount} need${pendingCount === 1 ? 's' : ''} a hand`
                : 'All current'}
          </PMText>
        </PMVStack>
        <PMIcon color="text.faded">
          <LuChevronRight />
        </PMIcon>
      </PMHStack>
    </PMBox>
  );
}

/**
 * Approach D. The one channel Packmind does not perform itself, pulled out of
 * the popover and given the slot. It never changes label and never makes a
 * claim about drift — which is its whole argument, and also its whole ceiling.
 */
function InstallCta({
  isDistributedSomewhere,
  onCopy,
}: Readonly<{ isDistributedSomewhere: boolean; onCopy: () => void }>) {
  return (
    <PMPopover.Root>
      <PMPopover.Trigger asChild>
        <PMButton
          variant={isDistributedSomewhere ? 'secondary' : 'primary'}
          size="sm"
        >
          <PMIcon fontSize="xs">
            <LuTerminal />
          </PMIcon>
          Install…
        </PMButton>
      </PMPopover.Trigger>
      <PMPortal>
        <PMPopover.Positioner>
          <PMPopover.Content width="26rem">
            <PMPopover.Body>
              <PMVStack align="stretch" gap={2}>
                <PMText variant="small" color="secondary">
                  Run this in any checkout to install the package there.
                </PMText>
                <PMBox
                  bg="background.secondary"
                  borderRadius="sm"
                  padding={3}
                  fontFamily="mono"
                  fontSize="xs"
                >
                  packmind install web/frontend-conventions
                </PMBox>
                <PMButton variant="secondary" size="xs" onClick={onCopy}>
                  Copy command
                </PMButton>
              </PMVStack>
            </PMPopover.Body>
          </PMPopover.Content>
        </PMPopover.Positioner>
      </PMPortal>
    </PMPopover.Root>
  );
}
