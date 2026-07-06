import { useState } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMMenu,
  PMPopover,
  PMPortal,
  PMText,
  PMHStack,
  PMIcon,
  PMVStack,
  PMHeading,
} from '@packmind/ui';
import { LuBot, LuPencilLine } from 'react-icons/lu';
import { GETTING_STARTED_CREATE_COMMAND_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { routes } from '../../../shared/utils/routes';

interface RecipesCreateButtonProps {
  orgSlug: string;
  spaceSlug: string;
}

export const RecipesCreateButton = ({
  orgSlug,
  spaceSlug,
}: RecipesCreateButtonProps) => {
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);

  return (
    <PMPopover.Root
      open={isFromCodeDialogOpen}
      onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
      positioning={{ placement: 'bottom-end' }}
    >
      <PMMenu.Root>
        <PMPopover.Anchor>
          <PMMenu.Trigger asChild>
            <PMButton>Create</PMButton>
          </PMMenu.Trigger>
        </PMPopover.Anchor>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content minW="350px">
              <PMMenu.Item
                value="from-code"
                p={3}
                onClick={() => {
                  setIsFromCodeDialogOpen(true);
                }}
              >
                <PMVStack alignItems={'flex-start'} gap={0} cursor={'pointer'}>
                  <PMHStack gap={2} mb={1}>
                    <PMIcon color="branding.primary" size="lg">
                      <LuBot />
                    </PMIcon>
                    <PMText fontWeight="semibold" fontSize="sm">
                      Create from your code
                    </PMText>
                  </PMHStack>
                  <PMText fontSize="xs" color="secondary">
                    Let your agent generate commands from your codebase
                  </PMText>
                </PMVStack>
              </PMMenu.Item>
              <PMMenu.Item value="blank" p={3} asChild cursor={'pointer'}>
                <Link to={routes.space.toCreateCommand(orgSlug, spaceSlug)}>
                  <PMVStack alignItems={'flex-start'} gap={0}>
                    <PMHStack gap={2} mb={1}>
                      <PMIcon color="beige.200" size="lg">
                        <LuPencilLine />
                      </PMIcon>
                      <PMText fontWeight="semibold" fontSize="sm">
                        Create manually
                      </PMText>
                    </PMHStack>
                    <PMText fontSize="xs" color="secondary">
                      Build a custom command manually
                    </PMText>
                  </PMVStack>
                </Link>
              </PMMenu.Item>
            </PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      <PMPortal>
        <PMPopover.Positioner>
          <PMPopover.Content width="480px" maxWidth="90vw">
            <PMPopover.Arrow>
              <PMPopover.ArrowTip />
            </PMPopover.Arrow>
            <PMPopover.Body>
              <PMPopover.Title asChild>
                <PMHeading level="h4">
                  {GETTING_STARTED_CREATE_COMMAND_DIALOG.title}
                </PMHeading>
              </PMPopover.Title>
              <PMVStack align="stretch" gap={4} mt={4}>
                {GETTING_STARTED_CREATE_COMMAND_DIALOG.body}
                <PMHStack justify="flex-end">
                  <PMButton
                    variant="tertiary"
                    size="sm"
                    onClick={() => setIsFromCodeDialogOpen(false)}
                  >
                    Close
                  </PMButton>
                </PMHStack>
              </PMVStack>
            </PMPopover.Body>
          </PMPopover.Content>
        </PMPopover.Positioner>
      </PMPortal>
    </PMPopover.Root>
  );
};
