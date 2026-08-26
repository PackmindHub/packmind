import { PMButton, PMMenu, PMPortal } from '@packmind/ui';
import { useStandardCreationOptions } from './useStandardCreationOptions';

interface StandardsCreateButtonProps {
  orgSlug: string;
  spaceSlug: string;
}

export const StandardsCreateButton = ({
  orgSlug,
  spaceSlug,
}: StandardsCreateButtonProps) => {
  const { items, dialogs } = useStandardCreationOptions({ orgSlug, spaceSlug });

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
