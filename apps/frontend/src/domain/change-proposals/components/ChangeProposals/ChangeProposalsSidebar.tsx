import {
  PMBadge,
  PMHStack,
  PMLink,
  PMText,
  PMVerticalNav,
  PMVerticalNavSection,
} from '@packmind/ui';
import { RecipeId } from '@packmind/types';

interface ChangeProposalsSidebarProps {
  commands: Array<{
    artefactId: RecipeId;
    name: string;
    changeProposalCount: number;
  }>;
  selectedCommandId: RecipeId | null;
  onSelectCommand: (commandId: RecipeId) => void;
}

export function ChangeProposalsSidebar({
  commands,
  selectedCommandId,
  onSelectCommand,
}: ChangeProposalsSidebarProps) {
  const commandEntries = commands.map((command) => {
    const isActive = command.artefactId === selectedCommandId;

    return (
      <PMLink
        key={command.artefactId}
        as="button"
        type="button"
        variant="navbar"
        data-active={isActive ? 'true' : undefined}
        width="full"
        textAlign="left"
        py={2}
        display="flex"
        alignItems="center"
        textDecoration="none"
        fontWeight={isActive ? 'bold' : 'medium'}
        _hover={{
          fontWeight: isActive ? 'bold' : 'medium',
          textDecoration: 'none',
        }}
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
        overflow="hidden"
        onClick={() => onSelectCommand(command.artefactId)}
      >
        <PMHStack width="full" justifyContent="space-between" gap={2}>
          <PMText
            fontSize="sm"
            fontWeight={isActive ? 'bold' : 'medium'}
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            flex={1}
          >
            {command.name}
          </PMText>
          <PMBadge colorPalette="blue" size="sm">
            {command.changeProposalCount}
          </PMBadge>
        </PMHStack>
      </PMLink>
    );
  });

  return (
    <PMVerticalNav logo={false} showLogoContainer={false} width="270px">
      <PMVerticalNavSection title="Commands" navEntries={commandEntries} />
    </PMVerticalNav>
  );
}
