import { Fragment } from 'react';
import {
  PMAlert,
  PMBox,
  PMHeading,
  PMHStack,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { format, isToday, isYesterday } from 'date-fns';
import { GovernanceActivityRow } from './GovernanceActivityRow';
import type { ActivityEntry } from './stubActivityEntries';

const RECENT_DAY_FORMAT = 'EEEE';
const OLDER_DAY_FORMAT = 'MMM d';

interface GovernanceActivitySectionProps {
  entries: ActivityEntry[];
  isLoading: boolean;
  isError: boolean;
}

type DayGroup = {
  key: string;
  label: string;
  entries: ActivityEntry[];
};

export function GovernanceActivitySection({
  entries,
  isLoading,
  isError,
}: Readonly<GovernanceActivitySectionProps>) {
  const groups = groupByDay(entries);

  return (
    <PMVStack align="stretch" gap={3}>
      <PMHStack justify="space-between" align="baseline">
        <PMHeading
          level="h2"
          color="faded"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="0.08em"
        >
          Activity
        </PMHeading>
        <PMText fontSize="xs" color="faded" letterSpacing="0.05em">
          Stub data
        </PMText>
      </PMHStack>
      {isError ? (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Content>
            <PMAlert.Title>Couldn't load activity.</PMAlert.Title>
          </PMAlert.Content>
        </PMAlert.Root>
      ) : isLoading ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <PMText fontSize="xs" color="tertiary">
          No activity in the last 7 days.
        </PMText>
      ) : (
        <PMVStack align="stretch" gap={4}>
          {groups.map((group) => (
            <Fragment key={group.key}>
              <PMVStack align="stretch" gap={1}>
                <DayHeader label={group.label} />
                <PMVStack align="stretch" gap={0}>
                  {group.entries.map((entry) => (
                    <GovernanceActivityRow key={entry.id} entry={entry} />
                  ))}
                </PMVStack>
              </PMVStack>
            </Fragment>
          ))}
        </PMVStack>
      )}
    </PMVStack>
  );
}

function DayHeader({ label }: Readonly<{ label: string }>) {
  return (
    <PMText
      fontSize="2xs"
      color="faded"
      fontWeight="medium"
      textTransform="uppercase"
      letterSpacing="0.06em"
    >
      {label}
    </PMText>
  );
}

function SkeletonRows() {
  return (
    <PMVStack align="stretch" gap={2}>
      {[0, 1, 2].map((i) => (
        <PMBox key={i} paddingY={1}>
          <PMBox
            height="10px"
            width={`${50 + i * 5}%`}
            bg="background.secondary"
            borderRadius="sm"
          />
        </PMBox>
      ))}
    </PMVStack>
  );
}

function groupByDay(entries: ActivityEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const entry of entries) {
    const date = new Date(entry.occurredAt);
    const key = dayKey(date);
    const label = dayLabel(date);
    let group = map.get(key);
    if (!group) {
      group = { key, label, entries: [] };
      map.set(key, group);
    }
    group.entries.push(entry);
  }
  return Array.from(map.values());
}

function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  const ageDays = Math.floor(
    (Date.now() - date.getTime()) / (24 * 3600 * 1000),
  );
  if (ageDays < 7) return format(date, RECENT_DAY_FORMAT);
  return format(date, OLDER_DAY_FORMAT);
}
