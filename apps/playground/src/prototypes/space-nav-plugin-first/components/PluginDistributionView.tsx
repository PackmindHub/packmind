import { useMemo, useState } from 'react';
import {
  PMBox,
  PMButton,
  PMCheckbox,
  PMHStack,
  PMIcon,
  PMInput,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuChevronRight,
  LuGitBranch,
  LuLock,
  LuPlug,
  LuSearch,
  LuTerminal,
  LuTriangleAlert,
} from 'react-icons/lu';

import {
  DISTRIBUTION_MODES,
  distributionSummary,
  isPublishableToMarketplace,
} from '../data';
import type {
  DistributionMode,
  DistributionState,
  DistributionTarget,
  PluginSummary,
} from '../types';
import { FilterChip } from './FilterChip';

type StateFilter = 'all' | 'drifted' | 'failed' | 'aligned';

const MODE_ICON: Record<DistributionMode, React.ReactNode> = {
  'git-push': <LuGitBranch />,
  'cli-install': <LuTerminal />,
  marketplace: <LuPlug />,
};

const STATE_COLOR: Record<DistributionState, string> = {
  aligned: 'green.500',
  drift: 'orange.500',
  failed: 'red.500',
};

/**
 * The second half of a plugin: where it lives. Repositories and marketplaces
 * are three sections of one list rather than two separate blocks, because they
 * answer the same question and the same action resolves them.
 */
export function PluginDistributionView({
  plugin,
  onRedistribute,
}: Readonly<{
  plugin: PluginSummary;
  onRedistribute: (targetIds: string[]) => void;
}>) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);

  const summary = distributionSummary(plugin);

  const matching = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return plugin.distributions.filter((target) => {
      if (
        needle &&
        !`${target.name} ${target.branch ?? ''} ${target.directory ?? ''} ${target.slug ?? ''}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      if (stateFilter === 'drifted') return target.state === 'drift';
      if (stateFilter === 'failed') return target.state === 'failed';
      if (stateFilter === 'aligned') return target.state === 'aligned';
      return true;
    });
  }, [plugin.distributions, query, stateFilter]);

  const selectable = matching
    .filter((target) => target.state !== 'aligned' && !target.lockedReason)
    .map((target) => target.id);
  const activeSelection = selected.filter((id) => selectable.includes(id));

  if (plugin.distributions.length === 0) {
    return (
      <NoDistributionState
        hasComponents={plugin.components.length > 0}
        canPublishToMarketplace={isPublishableToMarketplace(plugin.components)}
      />
    );
  }

  const toggle = (id: string, list: string[], set: (next: string[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <PMVStack gap={0} align="stretch">
      {summary.failed > 0 && <FailureAlert count={summary.failed} />}

      <PMHStack gap={3} align="center" wrap="wrap" paddingBottom={3}>
        <PMBox position="relative" width="280px">
          <PMBox
            position="absolute"
            left="8px"
            top="50%"
            transform="translateY(-50%)"
            pointerEvents="none"
            display="flex"
          >
            <PMIcon fontSize="xs" color="text.faded">
              <LuSearch />
            </PMIcon>
          </PMBox>
          <PMInput
            size="sm"
            paddingLeft="28px"
            placeholder="Filter by repository, branch or marketplace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Filter distributions"
          />
        </PMBox>
        <PMHStack gap={1} wrap="wrap">
          <FilterChip
            label="All"
            count={summary.total}
            isActive={stateFilter === 'all'}
            onClick={() => setStateFilter('all')}
          />
          {/*
            "Drifted", not "Behind": the chips partition the list, and a failed
            target is behind too. "Behind" names the union, which is what the
            header and the footer count.
          */}
          <FilterChip
            label="Drifted"
            count={summary.drifted}
            dotColor={STATE_COLOR.drift}
            isActive={stateFilter === 'drifted'}
            onClick={() => setStateFilter('drifted')}
          />
          <FilterChip
            label="Failed"
            count={summary.failed}
            dotColor={STATE_COLOR.failed}
            isActive={stateFilter === 'failed'}
            onClick={() => setStateFilter('failed')}
          />
          <FilterChip
            label="Up to date"
            count={summary.total - summary.behind}
            dotColor={STATE_COLOR.aligned}
            isActive={stateFilter === 'aligned'}
            onClick={() => setStateFilter('aligned')}
          />
        </PMHStack>
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
              No distribution matches this filter.
            </PMText>
          </PMBox>
        ) : (
          DISTRIBUTION_MODES.map((mode) => {
            const rows = matching.filter((target) => target.mode === mode.mode);
            if (rows.length === 0) return null;
            return (
              <PMBox key={mode.mode}>
                <ModeSectionHeader
                  mode={mode.mode}
                  title={mode.title}
                  description={mode.description}
                  count={rows.length}
                />
                {rows.map((target) => (
                  <DistributionRow
                    key={target.id}
                    target={target}
                    isSelected={activeSelection.includes(target.id)}
                    isExpanded={expanded.includes(target.id)}
                    onToggleSelected={() =>
                      toggle(target.id, selected, setSelected)
                    }
                    onToggleExpanded={() =>
                      toggle(target.id, expanded, setExpanded)
                    }
                  />
                ))}
              </PMBox>
            );
          })
        )}
      </PMBox>

      {summary.behind > 0 && (
        <SelectionFooter
          selectedCount={activeSelection.length}
          behindCount={summary.behind}
          selectableCount={selectable.length}
          onSelectAll={() => setSelected(selectable)}
          onRedistribute={() => {
            onRedistribute(activeSelection);
            setSelected([]);
          }}
        />
      )}

      <DistributionHistory plugin={plugin} />
    </PMVStack>
  );
}

function ModeSectionHeader({
  mode,
  title,
  description,
  count,
}: Readonly<{
  mode: DistributionMode;
  title: string;
  description: string;
  count: number;
}>) {
  return (
    <PMBox
      paddingX={3}
      paddingY={2}
      bg="background.secondary"
      borderBottomWidth="1px"
      borderTopWidth="1px"
      borderColor="border.tertiary"
      _first={{ borderTopWidth: 0 }}
    >
      <PMHStack gap={2} align="center">
        <PMIcon fontSize="sm" color="text.secondary">
          {MODE_ICON[mode]}
        </PMIcon>
        <PMText fontSize="sm" fontWeight="semibold">
          {title}
        </PMText>
        <PMText fontSize="xs" color="faded" fontVariantNumeric="tabular-nums">
          · {count}
        </PMText>
        <PMText fontSize="xs" color="faded" truncate>
          {description}
        </PMText>
      </PMHStack>
    </PMBox>
  );
}

function DistributionRow({
  target,
  isSelected,
  isExpanded,
  onToggleSelected,
  onToggleExpanded,
}: Readonly<{
  target: DistributionTarget;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelected: () => void;
  onToggleExpanded: () => void;
}>) {
  const isBehind = target.state !== 'aligned';

  return (
    <PMBox borderTopWidth="1px" borderColor="border.tertiary" _first={{}}>
      <PMHStack
        gap={3}
        align="center"
        paddingX={3}
        paddingY="10px"
        _hover={isBehind ? { bg: 'background.secondary' } : undefined}
        transition="background-color 150ms ease-out"
      >
        {/*
          The lock takes the checkbox's place rather than being spelled out on
          the right: it explains the missing checkbox exactly where the checkbox
          is missing.
        */}
        <PMBox width="20px" flexShrink={0} display="flex">
          {isBehind && !target.lockedReason && (
            <PMCheckbox
              size="sm"
              checked={isSelected}
              onCheckedChange={onToggleSelected}
              aria-label={`Select ${target.name}`}
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
            {target.name}
          </PMText>
          {target.branch && <Chip label={target.branch} />}
          {target.directory && <Chip label={target.directory} />}
          {target.slug && <Chip label={target.slug} />}
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
        </PMHStack>
      </PMHStack>

      {/* A redistribution can realign an expanded row: it has nothing left to show. */}
      {isExpanded && isBehind && <BehindDetail target={target} />}
    </PMBox>
  );
}

function StateLine({ target }: Readonly<{ target: DistributionTarget }>) {
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

function BehindDetail({ target }: Readonly<{ target: DistributionTarget }>) {
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
      marginBottom={3}
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
        {count} distribution{count === 1 ? '' : 's'} failed on the last attempt.
        Open the row to read the error.
      </PMText>
    </PMHStack>
  );
}

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
  // Nothing can be acted on: say why instead of offering a dead button.
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
          {behindCount} distribution{behindCount === 1 ? ' is' : 's are'}{' '}
          behind, and locked while another run finishes.
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
      {/*
        "Distribute", the product's word, and the same one in all four places
        the action appears. "Redistribute to selected" said the truth more
        precisely and cost a second verb for one operation, which is the more
        expensive inaccuracy: the line to the left already names the selection.
      */}
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

function NoDistributionState({
  hasComponents,
  canPublishToMarketplace,
}: Readonly<{ hasComponents: boolean; canPublishToMarketplace: boolean }>) {
  return (
    <PMBox
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="sm"
      padding={6}
      maxWidth="68ch"
    >
      <PMText as="div" fontWeight="medium">
        This plugin reaches nobody yet.
      </PMText>
      <PMText as="div" color="secondary" paddingTop={1}>
        {hasComponents
          ? 'Its components exist but no repository installs them and no marketplace carries them.'
          : 'Add a component first. An empty plugin distributes nothing.'}
      </PMText>
      {hasComponents && (
        <PMHStack gap={2} paddingTop={4}>
          <PMButton variant="primary" size="sm">
            Distribute to repositories
          </PMButton>
          {/*
            Marketplace eligibility comes from the type registry, not from a
            hardcoded list of types: a plugin whose components a marketplace
            cannot carry cannot be published.
          */}
          {canPublishToMarketplace && (
            <PMButton variant="secondary" size="sm">
              Publish to a marketplace
            </PMButton>
          )}
        </PMHStack>
      )}
    </PMBox>
  );
}

function DistributionHistory({ plugin }: Readonly<{ plugin: PluginSummary }>) {
  const [isOpen, setIsOpen] = useState(false);
  const events = plugin.distributions.slice(0, 6);

  return (
    <PMBox marginTop={4}>
      <PMBox
        as="button"
        display="inline-flex"
        alignItems="center"
        gap={2}
        cursor="pointer"
        color="text.secondary"
        _hover={{ color: 'text.primary' }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <PMIcon fontSize="xs">
          {isOpen ? <LuChevronDown /> : <LuChevronRight />}
        </PMIcon>
        <PMText fontSize="sm">Distribution history</PMText>
      </PMBox>
      {isOpen && (
        <PMVStack gap={0} align="stretch" paddingTop={2}>
          {events.map((target) => (
            <PMHStack
              key={target.id}
              gap={3}
              paddingY="6px"
              borderBottomWidth="1px"
              borderColor="border.tertiary"
            >
              <PMBox
                width="6px"
                height="6px"
                borderRadius="full"
                bg={STATE_COLOR[target.state]}
                flexShrink={0}
                marginTop="6px"
                aria-hidden
              />
              <PMText fontSize="xs" color="secondary" flex={1} truncate>
                {target.name}
              </PMText>
              <PMText fontSize="xs" color="faded">
                {target.lastEvent}
              </PMText>
            </PMHStack>
          ))}
          <PMText fontSize="xs" color="faded" paddingTop={2}>
            Stub: the real audit trail lists every attempt, not the last one per
            target.
          </PMText>
        </PMVStack>
      )}
    </PMBox>
  );
}
