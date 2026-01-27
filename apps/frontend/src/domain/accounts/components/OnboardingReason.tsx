import { useState } from 'react';
import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMCard,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import { LuCheck } from 'react-icons/lu';

export interface OnboardingReasonChoice {
  key: string;
  label: string;
}

export const ONBOARDING_REASONS: OnboardingReasonChoice[] = [
  {
    key: 'governance_messy_edits',
    label: 'Instructions are becoming messy as more people edit them',
  },
  {
    key: 'instruction_clarity',
    label: "I know instructions matter, but I'm not sure what to write",
  },
  {
    key: 'instruction_maintenance',
    label: 'I already have instructions, but maintaining them is painful',
  },
  {
    key: 'multi_assistant_centralization',
    label: 'I use multiple AI coding assistants and want one source of truth',
  },
  {
    key: 'instruction_impact',
    label: 'I want to understand the impact of instructions on generated code',
  },
  {
    key: 'exploring',
    label: "I'm just exploring",
  },
];

interface OnboardingReasonProps {
  onContinue: (reasonKey: string) => void;
  onSkip: () => void;
}

export function OnboardingReason({
  onContinue,
  onSkip,
}: OnboardingReasonProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  return (
    <PMVStack gap={8} align="stretch" maxW="600px" mx="auto">
      <PMVStack gap={3} textAlign="center">
        <PMHeading level="h2">
          What made you want to try Packmind today?
        </PMHeading>
        <PMText color="secondary" fontSize="md">
          This helps us tailor your experience.
        </PMText>
      </PMVStack>

      <PMVStack gap={3} align="stretch">
        {ONBOARDING_REASONS.map((reason) => (
          <PMCard.Root
            key={reason.key}
            cursor="pointer"
            onClick={() => setSelectedReason(reason.key)}
            borderWidth="2px"
            borderColor={
              selectedReason === reason.key ? 'purple.500' : 'gray.700'
            }
            bg={
              selectedReason === reason.key
                ? 'purple.900'
                : 'background.secondary'
            }
            _hover={{
              borderColor: 'purple.400',
              bg: selectedReason === reason.key ? 'purple.900' : 'gray.800',
            }}
            transition="all 0.2s"
          >
            <PMCard.Body padding={4}>
              <PMHStack justify="space-between" align="center">
                <PMText fontSize="md">{reason.label}</PMText>
                {selectedReason === reason.key && (
                  <PMIcon as={LuCheck} color="purple.400" size="lg" />
                )}
              </PMHStack>
            </PMCard.Body>
          </PMCard.Root>
        ))}
      </PMVStack>

      <PMVStack gap={3} align="stretch">
        <PMButton
          size="lg"
          variant="primary"
          disabled={!selectedReason}
          onClick={() => selectedReason && onContinue(selectedReason)}
          data-testid="OnboardingReason.ContinueButton"
        >
          Continue
        </PMButton>
        <PMButton
          size="md"
          variant="tertiary"
          onClick={onSkip}
          data-testid="OnboardingReason.SkipButton"
        >
          Skip for now
        </PMButton>
      </PMVStack>
    </PMVStack>
  );
}
