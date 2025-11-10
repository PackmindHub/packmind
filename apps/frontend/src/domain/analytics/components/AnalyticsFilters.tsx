import React from 'react';
import {
  PMVStack,
  PMHStack,
  PMField,
  PMNativeSelect,
  PMHeading,
} from '@packmind/ui';
import { TimePeriod, TargetId } from '@packmind/types';

export const TIME_PERIOD_OPTIONS = [
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_MONTH', label: 'Last 30 days' },
  { value: 'LAST_3_MONTHS', label: 'Last 3 months' },
];

type RepositoryOption = {
  value: string;
  label: string;
};

type TargetOption = {
  value: string;
  label: string;
};

type AnalyticsFiltersProps = {
  selectedTimePeriod: TimePeriod;
  onTimePeriodChange: (timePeriod: TimePeriod) => void;
  selectedRepository?: string | null;
  onRepositoryChange?: (repoKey: string) => void;
  repositoryOptions?: RepositoryOption[];
  selectedTarget?: TargetId | null;
  onTargetChange?: (targetId: TargetId | null) => void;
  targetOptions?: TargetOption[];
  isTargetsLoading?: boolean;
};

export const AnalyticsFilters: React.FC<AnalyticsFiltersProps> = ({
  selectedTimePeriod,
  onTimePeriodChange,
  selectedRepository,
  onRepositoryChange,
  repositoryOptions = [],
  selectedTarget,
  onTargetChange,
  targetOptions = [],
  isTargetsLoading = false,
}) => {
  const showRepository = onRepositoryChange !== undefined;
  const showTarget = onTargetChange !== undefined;

  return (
    <PMVStack
      marginTop={4}
      padding={4}
      border={'solid 1px'}
      borderColor={'border.primary'}
      backgroundColor={'background.primary'}
      alignItems={'flex-start'}
      gap={4}
      borderRadius={'sm'}
    >
      <PMHeading level="h5">Filters</PMHeading>
      <PMHStack justify="flex-start" gap={2}>
        <PMField.Root width="auto">
          <PMField.Label>Time Period</PMField.Label>
          <PMNativeSelect
            value={selectedTimePeriod}
            onChange={(e) => onTimePeriodChange(e.target.value as TimePeriod)}
            items={TIME_PERIOD_OPTIONS}
            width={'auto'}
            border={'solid 1px'}
            borderColor={'border.secondary'}
          />
        </PMField.Root>

        {showRepository &&
          onRepositoryChange &&
          repositoryOptions.length > 0 && (
            <PMField.Root width="auto">
              <PMField.Label>Repository</PMField.Label>
              <PMNativeSelect
                value={selectedRepository || repositoryOptions[0].value}
                onChange={(e) => onRepositoryChange(e.target.value)}
                items={repositoryOptions}
                width={'auto'}
                border={'solid 1px'}
                borderColor={'border.secondary'}
              />
            </PMField.Root>
          )}

        {showTarget && onTargetChange && targetOptions.length > 0 && (
          <PMField.Root width="auto">
            <PMField.Label>Target</PMField.Label>
            <PMNativeSelect
              value={selectedTarget || targetOptions[0].value}
              onChange={(e) =>
                onTargetChange(
                  e.target.value ? (e.target.value as TargetId) : null,
                )
              }
              items={targetOptions}
              width={'auto'}
              border={'solid 1px'}
              borderColor={'border.secondary'}
              disabled={!selectedRepository || isTargetsLoading}
            />
          </PMField.Root>
        )}
      </PMHStack>
    </PMVStack>
  );
};
