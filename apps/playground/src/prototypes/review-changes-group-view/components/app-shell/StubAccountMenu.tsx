import {
  PMButton,
  PMBox,
  PMText,
  PMIcon,
  PMAvatar,
  PMMenu,
  PMPortal,
} from '@packmind/ui';
import { LuSettings, LuLogOut } from 'react-icons/lu';

export function StubAccountMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          width="full"
          justifyContent="flex-start"
          paddingY="6"
          paddingX="2"
        >
          <PMAvatar.Root
            size="xs"
            backgroundColor="background.secondary"
            color="text.primary"
          >
            <PMAvatar.Fallback name="jane@acme.com" />
          </PMAvatar.Root>
          <PMBox maxWidth="full" textOverflow="ellipsis" overflow="hidden">
            jane@acme.com
          </PMBox>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="settings" cursor="pointer">
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuSettings />
                </PMIcon>
                Account settings
              </PMText>
            </PMMenu.Item>
            <PMMenu.Separator borderColor="border.tertiary" />
            <PMMenu.Item value="sign-out" cursor="pointer">
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuLogOut />
                </PMIcon>
                Sign out
              </PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
