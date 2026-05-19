import React, { useCallback } from 'react';
import { PMVStack, PMTabs } from '@packmind/ui';
import { useApiKey } from '../../../accounts/components/LocalEnvironmentSetup/hooks';
import { ProviderPanel } from './ProviderPanel';
import { AutoUpdateProvider, PROVIDER_METADATA } from './constants';
import { useAutomateUpdatesState } from './useAutomateUpdatesState';

export const AutomateUpdatesStep: React.FC = () => {
  const apiKey = useApiKey();
  const { provider, setProvider, schedule, setSchedule, effectiveCron } =
    useAutomateUpdatesState();

  const handleProviderChange = useCallback(
    (next: string): void => {
      if (next === 'github' || next === 'gitlab') {
        setProvider(next);
      }
    },
    [setProvider],
  );

  const tabs = (['github', 'gitlab'] as AutoUpdateProvider[]).map(
    (tabProvider) => ({
      value: tabProvider,
      triggerLabel: PROVIDER_METADATA[tabProvider].label,
      content: (
        <ProviderPanel
          provider={tabProvider}
          effectiveCron={effectiveCron}
          schedule={schedule}
          onScheduleChange={setSchedule}
          apiKey={apiKey}
        />
      ),
    }),
  );

  return (
    <PMVStack align="flex-start" gap={4} width="full">
      <PMTabs
        defaultValue={provider}
        value={provider}
        onValueChange={(details) => handleProviderChange(details.value)}
        tabs={tabs}
        width="full"
      />
    </PMVStack>
  );
};
