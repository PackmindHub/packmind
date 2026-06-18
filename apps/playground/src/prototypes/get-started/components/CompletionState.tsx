import { PMHStack, PMIcon, PMText, PMVStack } from '@packmind/ui';
import { LuCircleCheck } from 'react-icons/lu';

interface CompletionStateProps {
  skillCount: number;
}

// Calm activation confirmation. No confetti, no celebration theatre.
// States plainly what is true and that the surface now retires.
export function CompletionState({
  skillCount,
}: Readonly<CompletionStateProps>) {
  return (
    <PMHStack
      gap={3}
      align="flex-start"
      bg="background.primary"
      borderWidth="1px"
      borderColor="border.tertiary"
      borderRadius="md"
      padding={4}
    >
      <PMIcon fontSize="lg" color="text.success" mt="2px">
        <LuCircleCheck />
      </PMIcon>
      <PMVStack gap={1} align="stretch" flex={1}>
        <PMText fontSize="sm" fontWeight="medium" color="primary">
          You're set. {skillCount} skill{skillCount === 1 ? '' : 's'} under
          governance, shipped to a repo.
        </PMText>
        <PMText fontSize="xs" color="tertiary">
          Get started has done its job and retires from the sidebar. Find these
          steps again any time from the help menu.
        </PMText>
      </PMVStack>
    </PMHStack>
  );
}
