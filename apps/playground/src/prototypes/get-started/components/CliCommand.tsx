import {
  PMBox,
  PMCopiable,
  PMHStack,
  PMIcon,
  PMIconButton,
  PMText,
} from '@packmind/ui';
import { LuCopy, LuTerminal } from 'react-icons/lu';

interface CliCommandProps {
  command: string;
}

// A single copyable shell command. Mono on a tertiary surface, flat, no chrome.
// Intentionally shows only the command, never a token or auth step.
export function CliCommand({ command }: Readonly<CliCommandProps>) {
  return (
    <PMCopiable.Root value={command}>
      <PMHStack
        gap={3}
        align="center"
        bg="background.tertiary"
        borderRadius="md"
        paddingY={2}
        paddingX={3}
      >
        <PMIcon fontSize="sm" color="text.faded">
          <LuTerminal />
        </PMIcon>
        <PMBox
          flex={1}
          minW={0}
          fontFamily="mono"
          fontSize="sm"
          color="text.primary"
          overflowX="auto"
          whiteSpace="nowrap"
        >
          {command}
        </PMBox>
        <PMCopiable.Trigger asChild>
          <PMIconButton
            aria-label={`Copy: ${command}`}
            variant="ghost"
            size="xs"
          >
            <PMCopiable.Indicator>
              <LuCopy />
            </PMCopiable.Indicator>
          </PMIconButton>
        </PMCopiable.Trigger>
      </PMHStack>
    </PMCopiable.Root>
  );
}

// A small "Step N of the terminal flow" caption above a command pair.
export function CliCaption({ children }: Readonly<{ children: string }>) {
  return (
    <PMText fontSize="xs" color="faded">
      {children}
    </PMText>
  );
}
