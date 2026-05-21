import React, { useState } from 'react';
import { PMVStack, PMHStack, PMRadioCard, PMInput, PMText } from '@packmind/ui';
import {
  ScheduleSelectorValue,
  SchedulePresetKind,
  DEFAULT_CRON,
} from './constants';
import { isValidCron } from './cron';

const CUSTOM_VALUE = 'custom';

type ScheduleRadioValue = SchedulePresetKind | typeof CUSTOM_VALUE;

const PRESETS: ReadonlyArray<{ value: SchedulePresetKind; label: string }> = [
  { value: 'weeknights', label: 'Weeknights at 2am UTC' },
  { value: 'mondays', label: 'Every Monday at 9am UTC' },
];

interface IScheduleSelectorProps {
  value: ScheduleSelectorValue;
  onChange: (next: ScheduleSelectorValue) => void;
}

export const ScheduleSelector: React.FC<IScheduleSelectorProps> = ({
  value,
  onChange,
}) => {
  const [customCron, setCustomCron] = useState<string>(
    value.kind === 'custom' ? value.cron : DEFAULT_CRON,
  );

  const radioValue: ScheduleRadioValue =
    value.kind === 'custom' ? CUSTOM_VALUE : value.kind;

  const handleRadioChange = (next: ScheduleRadioValue): void => {
    if (next === CUSTOM_VALUE) {
      onChange({
        kind: 'custom',
        cron: customCron,
        isValid: isValidCron(customCron),
      });
      return;
    }
    onChange({ kind: next });
  };

  const handleCustomCronChange = (input: string): void => {
    setCustomCron(input);
    onChange({
      kind: 'custom',
      cron: input,
      isValid: isValidCron(input),
    });
  };

  const showCustomError =
    value.kind === 'custom' && !value.isValid && value.cron.length > 0;

  return (
    <PMVStack align="flex-start" gap={3} width="full">
      <PMRadioCard.Root
        size="sm"
        variant="outline"
        value={radioValue}
        onValueChange={(e) => handleRadioChange(e.value as ScheduleRadioValue)}
      >
        <PMRadioCard.Label>Schedule</PMRadioCard.Label>
        <PMHStack gap={2} alignItems="stretch">
          {PRESETS.map((preset) => (
            <PMRadioCard.Item key={preset.value} value={preset.value}>
              <PMRadioCard.ItemHiddenInput />
              <PMRadioCard.ItemControl>
                <PMRadioCard.ItemText>{preset.label}</PMRadioCard.ItemText>
                <PMRadioCard.ItemIndicator />
              </PMRadioCard.ItemControl>
            </PMRadioCard.Item>
          ))}
          <PMRadioCard.Item value={CUSTOM_VALUE}>
            <PMRadioCard.ItemHiddenInput />
            <PMRadioCard.ItemControl>
              <PMRadioCard.ItemText>Custom</PMRadioCard.ItemText>
              <PMRadioCard.ItemIndicator />
            </PMRadioCard.ItemControl>
          </PMRadioCard.Item>
        </PMHStack>
      </PMRadioCard.Root>

      {value.kind === 'custom' && (
        <PMVStack align="flex-start" gap={1} width="full">
          <PMInput
            value={customCron}
            onChange={(e) => handleCustomCronChange(e.target.value)}
            placeholder={DEFAULT_CRON}
            aria-invalid={showCustomError || undefined}
            aria-label="Custom cron expression"
            width="auto"
          />
          {showCustomError && (
            <PMText variant="small" color="error">
              Invalid cron expression. Use five fields, e.g. {`"0 2 * * 1-5"`}.
            </PMText>
          )}
        </PMVStack>
      )}
    </PMVStack>
  );
};
