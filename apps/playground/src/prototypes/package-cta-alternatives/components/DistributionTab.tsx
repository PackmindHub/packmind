import { useMemo, useState, type ReactNode } from 'react';
import {
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMText,
  PMVStack,
} from '@packmind/ui';
import {
  LuChevronDown,
  LuChevronRight,
  LuRotateCw,
  LuTag,
} from 'react-icons/lu';
import { needsAHand } from '../data';
import type { Destination, HeaderApproach } from '../types';
import { Chip } from './Chip';
import { DestinationRow } from './DestinationRow';

type Filter = 'all' | 'needs-a-hand' | 'up-to-date';

/**
 * Where the package has got to, as one list — and, in every approach but the
 * status quo, where the two verbs the header used to carry now live.
 *
 * `Distribute` rides the tab strip above (drawn by the pane, opposite the tab,
 * the way `Add components` already does for the other half). What is here is
 * the corrective side: a one-gesture catch-up beside the filter chips, and the
 * narrower pick through the checkboxes.
 */
export function DistributionTab({
  approach,
  destinations,
  onUpdate,
  onReleaseAndUpdate,
  distributeControl,
}: Readonly<{
  approach: HeaderApproach;
  destinations: readonly Destination[];
  onUpdate: (picked: readonly Destination[]) => void;
  onReleaseAndUpdate: (picked: readonly Destination[]) => void;
  /** The `Distribute` menu, for the blank state to offer a way out. */
  distributeControl: ReactNode;
}>) {
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [isAlignedOpen, setAlignedOpen] = useState(false);

  const pending = useMemo(
    () => destinations.filter((d) => needsAHand(d.state)),
    [destinations],
  );
  const aligned = useMemo(
    () => destinations.filter((d) => !needsAHand(d.state)),
    [destinations],
  );

  const shown =
    filter === 'all'
      ? destinations
      : filter === 'needs-a-hand'
        ? pending
        : aligned;

  const failed = shown.filter((d) => d.state === 'failed');
  const waiting = shown.filter(
    (d) =>
      d.state === 'behind' || d.state === 'drifted' || d.state === 'waiting',
  );
  const current = shown.filter((d) => !needsAHand(d.state));

  const pickable = shown.filter((d) => needsAHand(d.state));
  const picked = pickable.filter((d) => selectedIds.has(d.id));

  const toggle = (destination: Destination) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(destination.id)) next.add(destination.id);
      return next;
    });

  const clear = () => setSelectedIds(new Set());

  if (destinations.length === 0) {
    return (
      <PMBox padding={6}>
        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          padding={6}
          maxWidth="68ch"
        >
          <PMVStack align="start" gap={3}>
            <PMText variant="body-important">Nothing distributed yet.</PMText>
            <PMText color="secondary">
              It has never been distributed, so nothing reads it outside
              Packmind. Distributing it writes its components into a repository,
              where the agents working there pick them up.
            </PMText>
            {/*
              The production blank state explains and offers nothing: the only
              door is the header CTA. Take that away and this paragraph is a
              dead end, so every approach that drops the CTA has to put the door
              here. `today` keeps the dead end, faithfully, so the difference is
              visible.
            */}
            {approach === 'today' ? (
              <PMText variant="small" color="faded">
                (No action here today — the only way in is the header button.)
              </PMText>
            ) : (
              distributeControl
            )}
          </PMVStack>
        </PMBox>
      </PMBox>
    );
  }

  return (
    <PMBox padding={6}>
      <PMVStack align="stretch" gap={3}>
        <PMHStack justify="space-between" align="center" gap={3}>
          <PMHStack gap={1}>
            <Chip
              label="All"
              count={destinations.length}
              isActive={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <Chip
              label="Needs a hand"
              count={pending.length}
              isActive={filter === 'needs-a-hand'}
              onClick={() => setFilter('needs-a-hand')}
            />
            <Chip
              label="Up to date"
              count={aligned.length}
              isActive={filter === 'up-to-date'}
              onClick={() => setFilter('up-to-date')}
            />
          </PMHStack>
          {/*
            The one-gesture catch-up the header used to own. Without it, pushing
            everything behind costs a chip, a tick, a `Select all` and a bar
            button — four gestures for what was one, which is the cost the move
            has to pay back.
          */}
          {approach !== 'today' && pending.length > 0 && (
            <PMButton
              variant="secondary"
              size="xs"
              onClick={() => onUpdate(pending)}
            >
              <PMIcon fontSize="xs">
                <LuRotateCw />
              </PMIcon>
              Update all {pending.length} behind
            </PMButton>
          )}
        </PMHStack>

        {picked.length > 0 && (
          <SelectionBar
            count={picked.length}
            total={pickable.length}
            canRelease={picked.some((d) => d.canReleaseAndUpdate)}
            onSelectAll={() =>
              setSelectedIds(new Set(pickable.map((d) => d.id)))
            }
            onClear={clear}
            onUpdate={() => {
              onUpdate(picked);
              clear();
            }}
            onReleaseAndUpdate={() => {
              onReleaseAndUpdate(picked);
              clear();
            }}
          />
        )}

        <PMBox
          borderWidth="1px"
          borderColor="border.tertiary"
          borderRadius="sm"
          overflow="hidden"
        >
          <Band
            label="Failed"
            rows={failed}
            selectedIds={selectedIds}
            onToggle={toggle}
          />
          <Band
            label="Behind or waiting"
            rows={waiting}
            selectedIds={selectedIds}
            onToggle={toggle}
          />
          {current.length > 0 && (
            <>
              <PMBox
                as="button"
                width="100%"
                textAlign="left"
                paddingX={3}
                paddingY={2}
                bg="background.secondary"
                cursor="pointer"
                onClick={() => setAlignedOpen((open) => !open)}
              >
                <PMHStack gap={2}>
                  <PMIcon fontSize="xs" color="text.faded">
                    {isAlignedOpen ? <LuChevronDown /> : <LuChevronRight />}
                  </PMIcon>
                  <PMText variant="small" color="secondary">
                    Up to date — {current.length} destination
                    {current.length === 1 ? '' : 's'}
                  </PMText>
                </PMHStack>
              </PMBox>
              {isAlignedOpen &&
                current
                  .slice(0, 40)
                  .map((destination, index) => (
                    <DestinationRow
                      key={destination.id}
                      destination={destination}
                      isSelected={false}
                      isLast={index === Math.min(current.length, 40) - 1}
                    />
                  ))}
            </>
          )}
          {shown.length === 0 && (
            <PMText variant="small" color="faded" padding={4} as="div">
              No destination under this reading.
            </PMText>
          )}
        </PMBox>
      </PMVStack>
    </PMBox>
  );
}

function Band({
  label,
  rows,
  selectedIds,
  onToggle,
}: Readonly<{
  label: string;
  rows: readonly Destination[];
  selectedIds: ReadonlySet<string>;
  onToggle: (destination: Destination) => void;
}>) {
  if (rows.length === 0) return null;
  return (
    <>
      <PMBox paddingX={3} paddingY={2} bg="background.secondary">
        <PMText variant="small" color="secondary">
          {label} — {rows.length}
        </PMText>
      </PMBox>
      {rows.map((destination, index) => (
        <DestinationRow
          key={destination.id}
          destination={destination}
          isSelected={selectedIds.has(destination.id)}
          onToggle={() => onToggle(destination)}
          isLast={index === rows.length - 1}
        />
      ))}
    </>
  );
}

/**
 * The two gestures over a pick, on one bar rather than down the rows. `Release
 * & Update` appears only when a cut would actually move one of the picked rows
 * forward — on a package with nothing unreleased, `Update` is the whole answer.
 */
function SelectionBar({
  count,
  total,
  canRelease,
  onSelectAll,
  onClear,
  onUpdate,
  onReleaseAndUpdate,
}: Readonly<{
  count: number;
  total: number;
  canRelease: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onUpdate: () => void;
  onReleaseAndUpdate: () => void;
}>) {
  return (
    <PMHStack
      bg="background.tertiary"
      borderRadius="sm"
      paddingX={3}
      paddingY={2}
      gap={3}
      align="center"
    >
      <PMText variant="small-important">
        {count} of {total} selected
      </PMText>
      {count < total && (
        <PMButton variant="tertiary" size="xs" onClick={onSelectAll}>
          Select all
        </PMButton>
      )}
      <PMBox flex="1" />
      {canRelease && (
        <PMButton variant="secondary" size="xs" onClick={onReleaseAndUpdate}>
          <PMIcon fontSize="xs">
            <LuTag />
          </PMIcon>
          Release &amp; Update
        </PMButton>
      )}
      <PMButton
        variant={canRelease ? 'secondary' : 'primary'}
        size="xs"
        onClick={onUpdate}
      >
        <PMIcon fontSize="xs">
          <LuRotateCw />
        </PMIcon>
        Update {count} destination{count === 1 ? '' : 's'}
      </PMButton>
      <PMButton variant="tertiary" size="xs" onClick={onClear}>
        Clear
      </PMButton>
    </PMHStack>
  );
}
