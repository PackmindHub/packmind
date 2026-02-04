import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMCard,
  PMHStack,
  PMIcon,
  PMLink,
} from '@packmind/ui';
import { LuBookOpen, LuBrainCircuit, LuUsers } from 'react-icons/lu';

export interface OnboardingValueProp {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

export const ONBOARDING_VALUE_PROPS: OnboardingValueProp[] = [
  {
    key: 'knowledge_centralized',
    icon: LuBookOpen,
    title: 'Your knowledge in one place',
    description: 'Capture team standards, patterns, coding preferences',
  },
  {
    key: 'ai_friendly_docs',
    icon: LuBrainCircuit,
    title: 'AI-friendly documentation',
    description: 'Transform knowledge into AI-actionable instructions',
  },
  {
    key: 'genai_at_scale',
    icon: LuUsers,
    title: 'GenAI at scale',
    description: 'Ensure AI agents respect rules across teams/repos',
  },
];

interface OnboardingWelcomeProps {
  onDiscover: () => void;
  onSkip: () => void;
}

export function OnboardingWelcome({
  onDiscover,
  onSkip,
}: OnboardingWelcomeProps) {
  return (
    <PMHStack
      gap="10%"
      align="center"
      justify="space-between"
      width="full"
      height="full"
    >
      <PMVStack gap={10} align="start" height="full" justify="center" flex={1}>
        <PMVStack gap={0} align="start">
          <PMHeading level="h1">Welcome to Packmind</PMHeading>
          <PMHeading level="h5">Train AI agents to code right</PMHeading>
        </PMVStack>

        <PMVStack gap={4} align="stretch" width="full" maxWidth="400px">
          <PMButton
            size="lg"
            variant="primary"
            onClick={onDiscover}
            data-testid="OnboardingWelcome.DiscoverButton"
          >
            Discover
          </PMButton>
          <PMLink
            variant="underline"
            cursor="pointer"
            onClick={onSkip}
            textAlign="center"
            data-testid="OnboardingWelcome.SkipLink"
          >
            I just want to explore
          </PMLink>
        </PMVStack>
      </PMVStack>

      <PMVStack gap={4} align="stretch" flex={1} maxWidth="450px">
        {ONBOARDING_VALUE_PROPS.map((valueProp) => (
          <PMCard.Root
            key={valueProp.key}
            borderWidth="1px"
            borderColor="gray.700"
            bg="background.secondary"
            data-testid={`OnboardingWelcome.ValuePropCard.${valueProp.key}`}
          >
            <PMCard.Body padding={4}>
              <PMHStack gap={3} align="start">
                <PMIcon as={valueProp.icon} size="lg" color="brand.primary" />
                <PMVStack gap={1} align="start">
                  <PMText fontSize="md" fontWeight="medium">
                    {valueProp.title}
                  </PMText>
                  <PMText fontSize="sm" color="secondary">
                    {valueProp.description}
                  </PMText>
                </PMVStack>
              </PMHStack>
            </PMCard.Body>
          </PMCard.Root>
        ))}
      </PMVStack>
    </PMHStack>
  );
}
