import { useState } from 'react';
import {
  PMAlert,
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMRadioCard,
  PMButton,
  PMGrid,
} from '@packmind/ui';
import { StartTrialCommandAgents } from '@packmind/types';
import { useStartTrialMutation } from '../../api/queries';

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
  ) => void;
}

export function StartTrialAgentSelector({
  onTokenAvailable,
}: IStartTrialAgentSelectorProps) {
  const [selectedAgent, setSelectedAgent] =
    useState<StartTrialCommandAgents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate: startTrial, isPending } = useStartTrialMutation();

  const handleContinue = () => {
    if (!selectedAgent) return;

    setError(null);
    startTrial(
      { agent: selectedAgent },
      {
        onSuccess: (result) => {
          if (result.mcpToken && result.mcpUrl) {
            onTokenAvailable(selectedAgent, result.mcpToken, result.mcpUrl);
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
        <PMHeading level="h2">Start your free trial</PMHeading>
        <PMText color="secondary" mt={2}>
          Select the AI coding agent you use to get started with Packmind
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
            <PMRadioCard.Item key={option.value} value={option.value}>
              <PMRadioCard.ItemHiddenInput />
              <PMRadioCard.ItemControl>
                <PMRadioCard.ItemContent>
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
      >
        Continue
      </PMButton>

      {error && (
        <PMAlert.Root status="error">
          <PMAlert.Indicator />
          <PMAlert.Title>{error}</PMAlert.Title>
        </PMAlert.Root>
      )}
    </PMVStack>
  );
}
