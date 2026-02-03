import {
  PMVStack,
  PMHeading,
  PMText,
  PMButton,
  PMHStack,
  PMIcon,
  PMGrid,
  PMGridItem,
} from '@packmind/ui';
import { LuBookCheck, LuTerminal, LuWandSparkles } from 'react-icons/lu';

interface PlaybookItem {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  example: string;
}

const PLAYBOOK_ITEMS: PlaybookItem[] = [
  {
    key: 'standards',
    icon: LuBookCheck,
    title: 'Standards',
    description: 'Rules the AI should always follow.',
    example: '"Always validate user input."',
  },
  {
    key: 'commands',
    icon: LuTerminal,
    title: 'Commands',
    description: 'Reusable prompts the AI can execute.',
    example: '"Generate a compliant API endpoint."',
  },
  {
    key: 'skills',
    icon: LuWandSparkles,
    title: 'Skills',
    description: 'Expert modules for recurring needs.',
    example: '"Secure authentication flow."',
  },
];

interface OnboardingPlaybookProps {
  onBuildPlaybook: () => void;
  onPrevious: () => void;
}

export function OnboardingPlaybook({
  onBuildPlaybook,
  onPrevious,
}: OnboardingPlaybookProps) {
  return (
    <PMVStack
      align="stretch"
      width="full"
      height="full"
      justify="space-between"
    >
      <PMVStack gap={2} textAlign="center">
        <PMHeading level="h2">Build and evolve your playbook</PMHeading>
        <PMText color="secondary" fontStyle="italic">
          A Playbook is where your engineering knowledge lives — so AI can
          generate code that matches your standards. A Playbook contains:
        </PMText>
      </PMVStack>

      <PMGrid templateColumns="repeat(3, 1fr)" gap={8}>
        {PLAYBOOK_ITEMS.map((item) => (
          <PMGridItem
            key={item.key}
            data-testid={`OnboardingPlaybook.ItemCard.${item.key}`}
            border={'solid 1px'}
            borderColor={'border.tertiary'}
            p={10}
            borderRadius={'md'}
          >
            <PMVStack gap={4} align="center" textAlign="center">
              <PMIcon
                as={item.icon}
                boxSize={12}
                color="secondary"
                strokeWidth={1}
              />
              <PMText fontSize="lg" fontWeight="semibold">
                {item.title}
              </PMText>
              <PMVStack gap={1}>
                <PMText fontSize="sm" color="secondary">
                  {item.description}
                </PMText>
                <PMText fontSize="sm" color="secondary" fontStyle="italic">
                  Ex: {item.example}
                </PMText>
              </PMVStack>
            </PMVStack>
          </PMGridItem>
        ))}
      </PMGrid>

      <PMHStack gap={4}>
        <PMButton
          size="lg"
          variant="secondary"
          onClick={onPrevious}
          data-testid="OnboardingPlaybook.PreviousButton"
        >
          Previous
        </PMButton>
        <PMButton
          size="lg"
          variant="primary"
          onClick={onBuildPlaybook}
          data-testid="OnboardingPlaybook.BuildButton"
        >
          Build my playbook
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
}
