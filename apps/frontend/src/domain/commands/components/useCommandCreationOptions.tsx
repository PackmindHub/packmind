import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  PMButton,
  PMCloseButton,
  PMDialog,
  PMHStack,
  PMHeading,
  PMIcon,
  PMMenu,
  PMPortal,
  PMText,
  PMVStack,
} from '@packmind/ui';
import { LuBot, LuPencilLine } from 'react-icons/lu';
import { GETTING_STARTED_CREATE_COMMAND_DIALOG } from '../../organizations/components/dashboard/GettingStartedWidget';
import { routes } from '../../../shared/utils/routes';

/**
 * The ways to create a command, as menu items plus the surfaces they open. See
 * `useStandardCreationOptions` for why the two travel separately.
 */
export function useCommandCreationOptions({
  orgSlug,
  spaceSlug,
}: Readonly<{ orgSlug: string; spaceSlug: string }>): {
  items: ReactNode;
  dialogs: ReactNode;
} {
  const [isFromCodeDialogOpen, setIsFromCodeDialogOpen] = useState(false);

  const items = (
    <>
      <PMMenu.Item
        value="command-from-code"
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
      <PMMenu.Item value="command-blank" p={3} asChild cursor={'pointer'}>
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
    </>
  );

  const dialogs = (
    <PMDialog.Root
      open={isFromCodeDialogOpen}
      onOpenChange={(e) => setIsFromCodeDialogOpen(e.open)}
      size="xl"
      placement="center"
      motionPreset="slide-in-bottom"
      scrollBehavior={'inside'}
    >
      <PMPortal>
        <PMDialog.Backdrop />
        <PMDialog.Positioner>
          <PMDialog.Content>
            <PMDialog.Header>
              <PMDialog.Title asChild>
                <PMHeading level="h3">
                  {GETTING_STARTED_CREATE_COMMAND_DIALOG.title}
                </PMHeading>
              </PMDialog.Title>
              <PMDialog.CloseTrigger asChild>
                <PMCloseButton size="sm" />
              </PMDialog.CloseTrigger>
            </PMDialog.Header>
            <PMDialog.Body>
              {GETTING_STARTED_CREATE_COMMAND_DIALOG.body}
            </PMDialog.Body>
            <PMDialog.Footer>
              <PMButton
                variant="tertiary"
                size="md"
                onClick={() => setIsFromCodeDialogOpen(false)}
              >
                Close
              </PMButton>
            </PMDialog.Footer>
          </PMDialog.Content>
        </PMDialog.Positioner>
      </PMPortal>
    </PMDialog.Root>
  );

  return { items, dialogs };
}
