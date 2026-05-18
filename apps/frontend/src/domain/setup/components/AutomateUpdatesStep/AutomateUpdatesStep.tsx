import React, { useCallback } from 'react';
import { PMVStack, PMTabs } from '@packmind/ui';
import { useNavigate, useParams } from 'react-router';
import { useApiKey } from '../../../accounts/components/LocalEnvironmentSetup/hooks';
import { routes } from '../../../../shared/utils/routes';
import { ProviderPanel } from './ProviderPanel';
import {
  API_KEY_HASH,
  AutoUpdateProvider,
  PROVIDER_METADATA,
} from './constants';
import { useAutomateUpdatesState } from './useAutomateUpdatesState';

export const AutomateUpdatesStep: React.FC = () => {
  const { hasExistingKey } = useApiKey();
  const navigate = useNavigate();
  const { orgSlug } = useParams();
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

  const handleNavigateToApiKey = useCallback(() => {
    if (!orgSlug) return;
    navigate(`${routes.org.toSetupCLI(orgSlug)}#${API_KEY_HASH}`);
  }, [navigate, orgSlug]);

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
          hasActiveApiKey={hasExistingKey}
          onNavigateToApiKey={handleNavigateToApiKey}
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
