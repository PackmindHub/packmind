import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PMBox,
  PMVStack,
  PMHeading,
  PMText,
  PMRadioCard,
  PMButton,
  PMGrid,
} from '@packmind/ui';
import { StartTrialCommand } from '@packmind/types';
import { routes } from '../../src/shared/utils/routes';

type Agent = StartTrialCommand['agent'];

interface IAgentOption {
  value: Agent;
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

export default function StartTrialRouteModule() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedAgent) return;
    // Token will be computed server-side in a future iteration
    const token = 'aaaa-bbbb-cccc-dddd';
    navigate(routes.auth.toStartTrialAgent(selectedAgent, token));
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
        onValueChange={(e) => setSelectedAgent(e.value as Agent)}
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

      <PMButton disabled={!selectedAgent} width="full" onClick={handleContinue}>
        Continue
      </PMButton>
    </PMVStack>
  );
}
