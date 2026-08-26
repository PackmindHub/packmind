import { PMButton, PMMenu, PMPortal } from '@packmind/ui';
import { useCommandCreationOptions } from './useCommandCreationOptions';

interface CommandsCreateButtonProps {
  orgSlug: string;
  spaceSlug: string;
}

export const CommandsCreateButton = ({
  orgSlug,
  spaceSlug,
}: CommandsCreateButtonProps) => {
  const { items, dialogs } = useCommandCreationOptions({ orgSlug, spaceSlug });

  return (
    <>
      <PMMenu.Root>
        <PMMenu.Trigger asChild>
          <PMButton>Create</PMButton>
        </PMMenu.Trigger>
        <PMPortal>
          <PMMenu.Positioner>
            <PMMenu.Content minW="350px">{items}</PMMenu.Content>
          </PMMenu.Positioner>
        </PMPortal>
      </PMMenu.Root>
      {/* Outside the menu: the content unmounts when it closes. */}
      {dialogs}
    </>
  );
};
