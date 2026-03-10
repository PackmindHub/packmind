import { PMLink, PMIcon, PMMenu, PMPortal } from '@packmind/ui';
import {
  LuCircleHelp,
  LuMessageCircleQuestion,
  LuBook,
  LuUsersRound,
} from 'react-icons/lu';

export function StubHelpMenu() {
  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMLink variant="navbar" as="span" cursor="pointer">
          <PMIcon mr={2}>
            <LuCircleHelp />
          </PMIcon>
          Help
        </PMLink>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="chat" cursor="pointer">
              <PMIcon size="sm">
                <LuMessageCircleQuestion />
              </PMIcon>
              Chat
            </PMMenu.Item>
            <PMMenu.Item value="documentation" cursor="pointer">
              <PMIcon size="sm">
                <LuBook />
              </PMIcon>
              Documentation
            </PMMenu.Item>
            <PMMenu.Item value="slack" cursor="pointer">
              <PMIcon size="sm">
                <LuUsersRound />
              </PMIcon>
              Community Slack
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
}
