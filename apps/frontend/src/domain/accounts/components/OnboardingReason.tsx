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
    key: 'control_at_scale',
    label: 'Keeping instructions under control as our setup grows',
  },
  {
    key: 'create_better_instructions',
    label: 'Figuring out what good AI instructions look like',
  },
  {
    key: 'assess_instruction_quality',
    label: 'Checking whether our current instructions are good enough',
  },
  {
    key: 'exploring',
    label: "I'm just exploring",
  },
];

interface OnboardingReasonProps {
  onContinue: (reasonKey: string) => void;
}

export function OnboardingReason({ onContinue }: OnboardingReasonProps) {
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
            borderWidth="1px"
            borderColor={
              selectedReason === reason.key ? 'branding.primary' : 'gray.700'
            }
            bg={
              selectedReason === reason.key
                ? 'blue.800'
                : 'background.secondary'
            }
            _hover={{
              borderColor: 'brand.primary',
              bg: selectedReason === reason.key ? 'blue.800' : 'blue.900',
            }}
            transition="all 0.2s"
          >
            <PMCard.Body padding={4}>
              <PMHStack justify="space-between" align="center">
                <PMText fontSize="md">{reason.label}</PMText>
                {selectedReason === reason.key && (
                  <PMIcon as={LuCheck} color="brand.primary" size="lg" />
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
      </PMVStack>
    </PMVStack>
  );
}
