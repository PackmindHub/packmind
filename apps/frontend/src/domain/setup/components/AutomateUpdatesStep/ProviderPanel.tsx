import React, { useMemo } from 'react';
import { PMVStack, PMText, PMBox, PMLink } from '@packmind/ui';
import {
  CopiableTextarea,
  CopiableTextField,
} from '../../../../shared/components/inputs';
import {
  SectionCard,
  ApiKeyGenerator,
} from '../../../accounts/components/LocalEnvironmentSetup/components';
import { useApiKey } from '../../../accounts/components/LocalEnvironmentSetup/hooks';
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
  apiKey: ReturnType<typeof useApiKey>;
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
  apiKey,
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
        title="Step 1: API key"
        description={`Generate an API key now. You'll paste it as the ${metadata.secretNames[0]} secret in your repository.`}
        backgroundColor="background.primary"
      >
        <ApiKeyGenerator apiKey={apiKey} />
      </SectionCard>

      <SectionCard
        title="Step 2: Workflow file"
        description={`Add this file to your repository at ${metadata.workflowFilePath}`}
        backgroundColor="background.primary"
      >
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
          title="Step 3: Schedule the pipeline"
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
