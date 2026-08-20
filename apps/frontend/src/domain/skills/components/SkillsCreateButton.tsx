import { PMButton, PMMenu, PMPortal } from '@packmind/ui';
import { useSkillCreationOptions } from './useSkillCreationOptions';

interface SkillsCreateButtonProps {
  spaceSlug: string;
}

export const SkillsCreateButton = ({ spaceSlug }: SkillsCreateButtonProps) => {
  const { items, dialogs } = useSkillCreationOptions();

  if (!spaceSlug) {
    return null;
  }

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
