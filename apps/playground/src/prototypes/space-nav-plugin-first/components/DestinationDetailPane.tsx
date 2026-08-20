import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMHeading,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuChevronRight,
  LuGitBranch,
  LuLock,
  LuTerminal,
  LuTriangleAlert,
} from 'react-icons/lu';

import type { Destination, DestinationLink } from '../data';
import type { DistributionMode, DistributionState } from '../types';
import { FilterChip } from './FilterChip';

type StateFilter = 'all' | 'drifted' | 'failed' | 'aligned';

const STATE_COLOR: Record<DistributionState, string> = {
  aligned: 'green.500',
  drift: 'orange.500',
  failed: 'red.500',
};

const MODE_LABEL: Record<DistributionMode, string> = {
  'git-push': 'Git push',
  'cli-install': 'CLI install',
  marketplace: 'Marketplace',
};

/**
 * One destination, and everything this space puts in it. The mirror image of
 * the plugin's Distribution view: same rows, same states, same verb, read along
 * the other axis. What differs is the unit a redistribution acts on, and that
 * difference is the reason both screens exist. Here it is "everything this repo
 * is missing", there it is "everywhere this plugin has not landed", and neither
 * selection can be expressed on the other screen.
 */
export function DestinationDetailPane({
  destination,
  focusPluginId,
  onRedistribute,
  onOpenPlugin,
}: Readonly<{
  destination: Destination;
  /** Set when the user arrived by clicking a plugin in the rail's search hits. */
  focusPluginId: string | null;
  onRedistribute: (targetIds: string[]) => void;
  onOpenPlugin: (pluginId: string) => void;
}>) {
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>(() =>
    focusPluginId ? [focusPluginId] : [],
  );

  const counts = useMemo(() => {
    const failed = destination.links.filter(
      (l) => l.target.state === 'failed',
    ).length;
    const drifted = destination.links.filter(
      (l) => l.target.state === 'drift',
    ).length;
    return {
      total: destination.links.length,
      failed,
      drifted,
      behind: failed + drifted,
      aligned: destination.links.length - failed - drifted,
    };
  }, [destination.links]);

  const matching = destination.links.filter((link) => {
    if (stateFilter === 'drifted') return link.target.state === 'drift';
    if (stateFilter === 'failed') return link.target.state === 'failed';
    if (stateFilter === 'aligned') return link.target.state === 'aligned';
    return true;
  });

  const selectable = matching
    .filter(
      (link) => link.target.state !== 'aligned' && !link.target.lockedReason,
    )
    .map((link) => link.target.id);
  const activeSelection = selected.filter((id) => selectable.includes(id));

  const toggle = (id: string, list: string[], set: (next: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <PMBox padding={6}>
      <PMBox minW={0} maxWidth="68ch">
        <PMHStack gap={2} align="baseline" wrap="wrap">
          <PMHeading level="h2">{destination.name}</PMHeading>
          {destination.branch && <Chip label={destination.branch} />}
          {destination.directory && <Chip label={destination.directory} />}
        </PMHStack>
        <PMHStack gap={2} paddingTop={2} wrap="wrap">
          <PMText fontSize="sm" color="faded">
            {counts.total} plugin{counts.total === 1 ? '' : 's'}{' '}
            {destination.kind === 'marketplace' ? 'published' : 'installed'}
          </PMText>
          <PMText fontSize="sm" color="faded" aria-hidden>
            ·
          </PMText>
          {counts.behind === 0 ? (
            <PMText fontSize="sm" color="faded">
              everything at the current version
            </PMText>
          ) : (
            <PMText fontSize="sm" color="warning">
              {counts.behind} behind
            </PMText>
          )}
        </PMHStack>
      </PMBox>

      {counts.failed > 0 && <FailureAlert count={counts.failed} />}

      {/*
        "Drifted", not "Behind". The chips partition the list, and a failed
        landing is behind too: a chip reading "Behind 0" next to a header
        reading "1 behind" teaches the user that one of the two is lying.
        "Behind" is kept for the union, which is what the header, the badge and
        the footer all count.
      */}
      <PMHStack gap={1} wrap="wrap" paddingTop={5} paddingBottom={3}>
        <FilterChip
          label="All"
          count={counts.total}
          isActive={stateFilter === 'all'}
          onClick={() => setStateFilter('all')}
        />
        <FilterChip
          label="Drifted"
          count={counts.drifted}
          dotColor={STATE_COLOR.drift}
          isActive={stateFilter === 'drifted'}
          onClick={() => setStateFilter('drifted')}
        />
        <FilterChip
          label="Failed"
          count={counts.failed}
          dotColor={STATE_COLOR.failed}
          isActive={stateFilter === 'failed'}
          onClick={() => setStateFilter('failed')}
        />
        <FilterChip
          label="Up to date"
          count={counts.aligned}
          dotColor={STATE_COLOR.aligned}
          isActive={stateFilter === 'aligned'}
          onClick={() => setStateFilter('aligned')}
        />
      </PMHStack>

      <PMBox
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        overflow="hidden"
      >
        {matching.length === 0 ? (
          <PMBox padding={5}>
            <PMText fontSize="sm" color="secondary">
              No plugin matches this filter.
            </PMText>
          </PMBox>
        ) : (
          matching.map((link, index) => (
            <PluginLandingRow
              key={link.target.id}
              link={link}
              isFirst={index === 0}
              isSelected={activeSelection.includes(link.target.id)}
              isExpanded={expanded.includes(link.plugin.id)}
              onToggleSelected={() =>
                toggle(link.target.id, selected, setSelected)
              }
              onToggleExpanded={() =>
                toggle(link.plugin.id, expanded, setExpanded)
              }
              onOpenPlugin={() => onOpenPlugin(link.plugin.id)}
            />
          ))
        )}
      </PMBox>

      {counts.behind > 0 && (
        <SelectionFooter
          selectedCount={activeSelection.length}
          behindCount={counts.behind}
          selectableCount={selectable.length}
          onSelectAll={() => setSelected(selectable)}
          onRedistribute={() => {
            onRedistribute(activeSelection);
            setSelected([]);
          }}
        />
      )}
    </PMBox>
  );
}

function PluginLandingRow({
  link,
  isFirst,
  isSelected,
  isExpanded,
  onToggleSelected,
  onToggleExpanded,
  onOpenPlugin,
}: Readonly<{
  link: DestinationLink;
  isFirst: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
  onOpenPlugin: () => void;
}>) {
  const { target, plugin } = link;
  const isBehind = target.state !== 'aligned';

  return (
    <PMBox
      borderTopWidth={isFirst ? '0' : '1px'}
      borderColor="border.tertiary"
      bg={isExpanded ? 'background.secondary' : 'transparent'}
    >
      <PMHStack
        gap={3}
        align="center"
        paddingX={3}
        paddingY="10px"
        _hover={isBehind ? { bg: 'background.secondary' } : undefined}
        transition="background-color 150ms ease-out"
      >
        <PMBox width="20px" flexShrink={0} display="flex">
          {isBehind && !target.lockedReason && (
            <PMCheckbox
              size="sm"
              checked={isSelected}
              onCheckedChange={onToggleSelected}
              aria-label={`Select ${plugin.name}`}
            />
          )}
          {isBehind && target.lockedReason && (
            <PMBox display="flex" title={target.lockedReason}>
              <PMIcon fontSize="xs" color="text.faded">
                <LuLock />
              </PMIcon>
            </PMBox>
          )}
        </PMBox>

        <PMBox
          as="button"
          display="flex"
          alignItems="center"
          gap={2}
          flex={1}
          minW={0}
          textAlign="left"
          cursor={isBehind ? 'pointer' : 'default'}
          onClick={isBehind ? onToggleExpanded : undefined}
        >
          <PMBox width="14px" flexShrink={0} display="flex">
            {isBehind && (
              <PMIcon fontSize="xs" color="text.faded">
                {isExpanded ? <LuChevronDown /> : <LuChevronRight />}
              </PMIcon>
            )}
          </PMBox>
          <PMText fontSize="sm" fontWeight="medium" truncate>
            {plugin.name}
          </PMText>
          {/*
            The mode belongs to the landing, not to the destination: the same
            repository can take one plugin by push and the next by CLI, and the
            two are not fixed the same way.
          */}
          <ModeChip mode={target.mode} />
          {/*
            The slug only when it is not the plugin's own name. A marketplace
            usually publishes under the name it was given, and repeating it puts
            the same word twice on the same line for nothing.
          */}
          {target.slug && target.slug !== plugin.name && (
            <Chip label={target.slug} />
          )}
          {target.version && <Chip label={`v${target.version}`} />}
        </PMBox>

        <PMHStack gap={3} align="center" flexShrink={0}>
          <StateLine target={target} />
          <PMText
            fontSize="xs"
            color="faded"
            width="176px"
            textAlign="right"
            truncate
          >
            {target.lastEvent}
          </PMText>
          {/*
            The way back to the other axis. Without it this screen is a dead end:
            a plugin behind in four repositories is a plugin problem, and it is
            fixed once from the plugin rather than four times from here.
          */}
          <PMBox
            as="button"
            display="inline-flex"
            alignItems="center"
            gap="4px"
            bg="transparent"
            border="none"
            padding={0}
            cursor="pointer"
            fontSize="xs"
            color="text.faded"
            whiteSpace="nowrap"
            _hover={{ color: 'text.primary' }}
            transition="color 150ms ease-out"
            onClick={onOpenPlugin}
            aria-label={`Open ${plugin.name} in Context`}
          >
            Open
            <PMIcon fontSize="xs">
              <LuChevronRight />
            </PMIcon>
          </PMBox>
        </PMHStack>
      </PMHStack>

      {isExpanded && isBehind && <BehindDetail link={link} />}
    </PMBox>
  );
}

function StateLine({
  target,
}: Readonly<{ target: DestinationLink['target'] }>) {
  const label = (() => {
    if (target.state === 'failed') return 'Last attempt failed';
    if (target.state === 'drift')
      return `${target.behind.length} component${target.behind.length === 1 ? '' : 's'} behind`;
    return target.mode === 'marketplace' ? 'Published' : 'Up to date';
  })();

  return (
    <PMHStack gap="6px" align="center" width="150px">
      <PMBox
        width="6px"
        height="6px"
        borderRadius="full"
        bg={STATE_COLOR[target.state]}
        flexShrink={0}
        aria-hidden
      />
      <PMText fontSize="xs" color="secondary" whiteSpace="nowrap">
        {label}
      </PMText>
    </PMHStack>
  );
}

function BehindDetail({ link }: Readonly<{ link: DestinationLink }>) {
  const { target } = link;

  return (
    <PMBox
      paddingX={3}
      paddingY={3}
      paddingLeft="52px"
      bg="background.secondary"
      borderTopWidth="1px"
      borderColor="border.tertiary"
    >
      {target.error && (
        <PMText fontSize="xs" color="error" paddingBottom={2}>
          {target.error}
        </PMText>
      )}
      <PMText
        fontSize="10px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wider"
        color="faded"
      >
        Not at the current version
      </PMText>
      <PMVStack gap={1} align="stretch" paddingTop={1}>
        {target.behind.map((name) => (
          <PMText key={name} fontSize="xs" color="secondary">
            {name}
          </PMText>
        ))}
      </PMVStack>
      {target.lockedReason && (
        <PMText fontSize="xs" color="faded" paddingTop={2}>
          {target.lockedReason}
        </PMText>
      )}
    </PMBox>
  );
}

function ModeChip({ mode }: Readonly<{ mode: DistributionMode }>) {
  if (mode === 'marketplace') return null;

  return (
    <PMHStack
      gap="4px"
      flexShrink={0}
      align="center"
      color="text.faded"
      fontSize="10px"
    >
      <PMIcon fontSize="2xs">
        {mode === 'git-push' ? <LuGitBranch /> : <LuTerminal />}
      </PMIcon>
      {MODE_LABEL[mode]}
    </PMHStack>
  );
}

function Chip({ label }: Readonly<{ label: string }>) {
  return (
    <PMBox
      as="span"
      flexShrink={0}
      fontSize="10px"
      fontFamily="mono"
      color="text.faded"
      bg="background.tertiary"
      borderRadius="sm"
      paddingX="5px"
      paddingY="1px"
    >
      {label}
    </PMBox>
  );
}

function FailureAlert({ count }: Readonly<{ count: number }>) {
  return (
    <PMHStack
      gap={2}
      align="center"
      marginTop={4}
      padding={3}
      borderWidth="1px"
      borderColor="red.500"
      borderRadius="sm"
      bg="background.secondary"
    >
      <PMIcon fontSize="sm" color="red.500">
        <LuTriangleAlert />
      </PMIcon>
      <PMText fontSize="sm">
        {count} plugin{count === 1 ? '' : 's'} failed to reach this destination
        on the last attempt. Open the row to read the error.
      </PMText>
    </PMHStack>
  );
}

/**
 * Word for word the plugin view's footer, down to the verb on the button. Two
 * screens offering the same repair have to offer it in the same words, or they
 * read as two different operations.
 */
function SelectionFooter({
  selectedCount,
  behindCount,
  selectableCount,
  onSelectAll,
  onRedistribute,
}: Readonly<{
  selectedCount: number;
  behindCount: number;
  selectableCount: number;
  onSelectAll: () => void;
  onRedistribute: () => void;
}>) {
  if (selectableCount === 0) {
    return (
      <PMHStack
        align="center"
        gap={3}
        marginTop={3}
        padding={3}
        borderWidth="1px"
        borderColor="border.tertiary"
        borderRadius="sm"
        bg="background.secondary"
      >
        <PMText fontSize="sm" color="secondary">
          {behindCount} plugin{behindCount === 1 ? ' is' : 's are'} behind here,
          and locked while another run finishes.
        </PMText>
      </PMHStack>
    );
  }

  return (
    <PMHStack
      justify="space-between"
      align="center"
      gap={3}
      marginTop={3}
      padding={3}
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      bg="background.secondary"
    >
      <PMHStack gap={3} align="center">
        <PMText fontSize="sm" color="secondary">
          {selectedCount} of {behindCount} behind selected
        </PMText>
        {selectedCount < selectableCount && (
          <PMBox
            as="button"
            fontSize="sm"
            color="text.primary"
            textDecoration="underline"
            cursor="pointer"
            onClick={onSelectAll}
          >
            Select all
          </PMBox>
        )}
      </PMHStack>
      <PMButton
        variant="primary"
        size="sm"
        disabled={selectedCount === 0}
        onClick={onRedistribute}
      >
        Distribute
      </PMButton>
    </PMHStack>
  );
}
