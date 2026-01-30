import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMCard,
  PMHStack,
  PMIcon,
  PMGrid,
  PMGridItem,
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
    <PMGrid templateColumns="1fr 1fr" gap={8} align="start" width="full">
      <PMGridItem>
        <PMVStack gap={6} align="start">
          <PMVStack gap={3} align="start">
            <PMHeading level="h2">Welcome to Packmind</PMHeading>
            <PMText color="secondary" fontSize="md">
              Train AI agents to code right
            </PMText>
          </PMVStack>

          <PMVStack gap={3} align="stretch" width="full">
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
      </PMGridItem>

      <PMGridItem>
        <PMVStack gap={3} align="stretch">
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
      </PMGridItem>
    </PMGrid>
  );
}
