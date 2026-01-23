import { useState } from 'react';
import { Link } from 'react-router';
import {
  PMAlert,
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMRadioCard,
  PMButton,
  PMGrid,
  PMIcon,
} from '@packmind/ui';
import { StartTrialCommandAgents } from '@packmind/types';
import { useStartTrialMutation } from '../../api/queries';
import { StartTrialAgentSelectorDataTestIds } from '@packmind/frontend';
import { AGENT_ICONS } from './AgentIcons';
import { useAnalytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/AnalyticsProvider';

interface IAgentOption {
  value: StartTrialCommandAgents;
  label: string;
}

const AGENT_OPTIONS: IAgentOption[] = [
  {
    value: 'claude',
    label: 'Claude',
  },
  {
    value: 'vs-code',
    label: 'Github Copilot for VSCode',
  },

  {
    value: 'cursor',
    label: 'Cursor',
  },
  {
    value: 'jetbrains',
    label: 'Github Copilot for JetBrains',
  },
  {
    value: 'continue-dev',
    label: 'Continue.dev',
  },
  {
    value: 'other',
    label: 'Other',
  },
];

interface IStartTrialAgentSelectorProps {
  onTokenAvailable: (
    agent: StartTrialCommandAgents,
    token: string,
    mcpUrl: string,
    cliLoginCode?: string,
  ) => void;
}

export function StartTrialAgentSelector({
  onTokenAvailable,
}: IStartTrialAgentSelectorProps) {
  const [selectedAgent, setSelectedAgent] =
    useState<StartTrialCommandAgents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate: startTrial, isPending } = useStartTrialMutation();
  const analytics = useAnalytics();

  const handleContinue = () => {
    if (!selectedAgent) return;

    setError(null);
    startTrial(
      { agent: selectedAgent },
      {
        onSuccess: (result) => {
          if (result.user && result.organization) {
            analytics.setUserId(result.user.id);
            analytics.setUserOrganizations([result.organization.id]);
          }

          if (result.mcpToken && result.mcpUrl) {
            onTokenAvailable(
              selectedAgent,
              result.mcpToken,
              result.mcpUrl,
              result.cliLoginCode,
            );
          }
        },
        onError: () => {
          setError('Unable to start your trial, please try again');
        },
      },
    );
  };

  return (
    <PMVStack gap={6} align="stretch">
      <PMBox textAlign="center">
        <PMHeading level="h2">Select your AI assistant</PMHeading>
        <PMText color="secondary" mt={2}>
          Packmind adapts the generated playbook to your AI coding agent.
        </PMText>
      </PMBox>

      <PMRadioCard.Root
        size="md"
        variant="outline"
        value={selectedAgent ?? undefined}
        onValueChange={(e) =>
          setSelectedAgent(e.value as StartTrialCommandAgents)
        }
      >
        <PMGrid gridTemplateColumns="repeat(3, 1fr)" gap={3}>
          {AGENT_OPTIONS.map((option) => (
            <PMRadioCard.Item
              key={option.value}
              value={option.value}
              data-testid={`${StartTrialAgentSelectorDataTestIds.AgentOption}.${option.value}`}
            >
              <PMRadioCard.ItemHiddenInput />
              <PMRadioCard.ItemControl>
                <PMRadioCard.ItemContent>
                  <PMIcon
                    as={AGENT_ICONS[option.value]}
                    size="2xl"
                    color={'text.tertiary'}
                    marginBottom={1}
                  />
                  <PMRadioCard.ItemText fontWeight="semibold">
                    {option.label}
                  </PMRadioCard.ItemText>
                </PMRadioCard.ItemContent>
                <PMRadioCard.ItemIndicator />
              </PMRadioCard.ItemControl>
            </PMRadioCard.Item>
          ))}
        </PMGrid>
      </PMRadioCard.Root>

      <PMButton
        disabled={!selectedAgent || isPending}
        loading={isPending}
        width="full"
        onClick={handleContinue}
        data-testid={StartTrialAgentSelectorDataTestIds.ContinueButton}
      >
        {isPending ? 'Setting up...' : 'Continue with setup'}
      </PMButton>

      {error && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{error}</PMAlert.Title>
        </PMAlert.Root>
      )}

      <PMBox mt={4} textAlign="center">
        <Link to="/sign-up" prefetch="intent">
          <PMButton variant="tertiary" size={'xs'} tabIndex={-1}>
            Back to options
          </PMButton>
        </Link>
      </PMBox>
    </PMVStack>
  );
}
