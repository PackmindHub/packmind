import React, { useMemo } from 'react';
import {
  PMVStack,
  PMText,
  PMBox,
  PMLink,
  PMAlert,
  PMButton,
} from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../../shared/components/inputs';
import { SectionCard } from '../../../accounts/components/LocalEnvironmentSetup/components';
import { ScheduleSelector } from './ScheduleSelector';
import {
  AutoUpdateProvider,
  DOCS_URL,
  PROVIDER_METADATA,
  ScheduleSelectorValue,
} from './constants';
import { buildWorkflowYaml } from './yaml';

interface IProviderPanelProps {
  provider: AutoUpdateProvider;
  effectiveCron: string;
  schedule: ScheduleSelectorValue;
  onScheduleChange: (next: ScheduleSelectorValue) => void;
  hasActiveApiKey: boolean;
  onNavigateToApiKey: () => void;
}

const formatSecretsReminder = (
  secretNames: ReadonlyArray<string>,
  locationPath: string,
): string => {
  const joined =
    secretNames.length <= 1
      ? secretNames.join('')
      : `${secretNames.slice(0, -1).join(', ')} and ${secretNames[secretNames.length - 1]}`;
  return `Don't forget to set ${joined} in ${locationPath}.`;
};

export const ProviderPanel: React.FC<IProviderPanelProps> = ({
  provider,
  effectiveCron,
  schedule,
  onScheduleChange,
  hasActiveApiKey,
  onNavigateToApiKey,
}) => {
  const metadata = PROVIDER_METADATA[provider];
  const yaml = useMemo(
    () => buildWorkflowYaml(provider, effectiveCron),
    [provider, effectiveCron],
  );
  const secretsReminder = formatSecretsReminder(
    metadata.secretNames,
    metadata.secretsLocationPath,
  );

  return (
    <PMVStack align="flex-start" gap={4} width="full" paddingY={4}>
      <SectionCard
        title="Workflow file"
        description={`Add this file to your repository at ${metadata.workflowFilePath}`}
        backgroundColor="background.primary"
      >
        {!hasActiveApiKey && (
          <PMAlert.Root status="info">
            <PMAlert.Indicator />
            <PMAlert.Content>
              <PMAlert.Title>You need an API key first</PMAlert.Title>
              <PMAlert.Description>
                Generate one on the CLI Setup page (Environment Variable tab),
                then come back here.
              </PMAlert.Description>
              <PMBox mt={2}>
                <PMButton
                  size="xs"
                  variant="outline"
                  onClick={onNavigateToApiKey}
                >
                  Go to CLI Setup
                </PMButton>
              </PMBox>
            </PMAlert.Content>
          </PMAlert.Root>
        )}
        {metadata.cronInYaml && (
          <ScheduleSelector value={schedule} onChange={onScheduleChange} />
        )}
        <PMBox width="full">
          <CopiableTextarea value={yaml} readOnly rows={12} />
        </PMBox>
        <PMText variant="small" color="tertiary">
          {secretsReminder}
        </PMText>
      </SectionCard>

      {!metadata.cronInYaml && (
        <SectionCard
          title="Schedule the pipeline"
          description={metadata.scheduleLocationHint}
          backgroundColor="background.primary"
        >
          <ScheduleSelector value={schedule} onChange={onScheduleChange} />
          <PMVStack align="flex-start" gap={1} width="full">
            <PMText variant="small" color="primary">
              Cron expression to paste in GitLab:
            </PMText>
            <PMBox width="full" maxWidth="sm">
              <CopiableTextField value={effectiveCron} readOnly />
            </PMBox>
          </PMVStack>
        </SectionCard>
      )}

      <PMText variant="small" color="tertiary">
        Trigger it manually from your repo or wait for the next scheduled run.{' '}
        <PMLink href={DOCS_URL} target="_blank" rel="noopener noreferrer">
          See the full guide ↗
        </PMLink>
      </PMText>
    </PMVStack>
  );
};
