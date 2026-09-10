import {
  PMBox,
  PMHStack,
  PMSegmentedBar,
  PMText,
  PMVStack,
} from '@packmind/ui';
import type { StatusFilter } from '../../types';
import type { AdoptionSummary } from '../../utils/adoption';
import { shortRevision } from '../../utils/adoption';

// The headline answers the only question this surface exists for — how much of
// the fleet is on what we published — and every number in it is a filter. The
// old design put that answer in the version trail above the tabs and the
// filtering in a pill inside the third tab level, so the count and the list that
// could explain it never sat together.

type AdoptionCoverageProps = {
  summary: AdoptionSummary;
  publishedRevision: string | null;
  status: StatusFilter;
  onStatusChange: (next: StatusFilter) => void;
};

export function AdoptionCoverage({
  summary,
  publishedRevision,
  status,
  onStatusChange,
}: Readonly<AdoptionCoverageProps>) {
  const { installs, upToDate, behind, unknown, repositories, people, agents } =
    summary;
  const indeterminate = publishedRevision === null;

  return (
    <PMVStack gap={3} align="stretch">
      <PMHStack gap={4} align="baseline" wrap="wrap">
        <PMText fontSize="lg" color="primary" fontWeight="medium">
          {indeterminate
            ? `${installs} ${installs === 1 ? 'install' : 'installs'}, revision unknown`
            : `${upToDate} of ${installs} installs on revision ${shortRevision(publishedRevision)}`}
        </PMText>
        {!indeterminate && installs > 0 && (
          <PMSegmentedBar
            width="180px"
            height="8px"
            segments={[
              {
                value: upToDate,
                colorPalette: 'green',
                label: `${upToDate} up to date`,
              },
              {
                value: behind,
                colorPalette: 'orange',
                label: `${behind} behind`,
              },
            ]}
          />
        )}
      </PMHStack>

      <PMHStack gap={2} align="center" wrap="wrap">
        <CountChip
          label={`All ${installs}`}
          active={status === 'all'}
          onClick={() => onStatusChange('all')}
        />
        {!indeterminate && (
          <>
            <CountChip
              label={`${upToDate} up to date`}
              palette="green"
              active={status === 'up-to-date'}
              disabled={upToDate === 0}
              onClick={() => onStatusChange('up-to-date')}
            />
            <CountChip
              label={`${behind} behind`}
              palette="orange"
              active={status === 'behind'}
              disabled={behind === 0}
              onClick={() => onStatusChange('behind')}
            />
          </>
        )}
        {indeterminate && unknown > 0 && (
          <PMText fontSize="xs" color="faded">
            Published before revision tracking — Packmind cannot tell these
            installs apart yet.
          </PMText>
        )}
        <PMText fontSize="xs" color="faded" marginLeft="auto">
          {repositories} {repositories === 1 ? 'repository' : 'repositories'} ·{' '}
          {people} {people === 1 ? 'person' : 'people'} · {agents.length}{' '}
          {agents.length === 1 ? 'agent' : 'agents'}
        </PMText>
      </PMHStack>
    </PMVStack>
  );
}

type CountChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
  palette?: 'green' | 'orange';
  disabled?: boolean;
};

/**
 * A count that is also the filter for what it counts. Clicking "6 behind"
 * narrows the table to those six — the action the reader wanted when they read
 * the number, one click away instead of hidden in a sub-tab.
 */
function CountChip({
  label,
  active,
  onClick,
  palette,
  disabled = false,
}: Readonly<CountChipProps>) {
  const accent = palette ? `${palette}.500` : 'branding.primary';
  return (
    <PMBox
      as="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      paddingX={2.5}
      paddingY={1}
      borderRadius="sm"
      borderWidth="1px"
      borderColor={active ? accent : 'border.tertiary'}
      bg={active ? 'background.tertiary' : 'transparent'}
      color={active ? 'text.primary' : 'text.secondary'}
      fontSize="xs"
      fontWeight="medium"
      fontVariantNumeric="tabular-nums"
      cursor={disabled ? 'default' : 'pointer'}
      opacity={disabled ? 0.4 : 1}
      transition="color 120ms ease-out, background-color 120ms ease-out, border-color 120ms ease-out"
      _hover={
        disabled || active
          ? undefined
          : { color: 'text.primary', bg: 'background.secondary' }
      }
      aria-pressed={active}
    >
      {label}
    </PMBox>
  );
}
