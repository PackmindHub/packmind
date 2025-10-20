import { PMMenu, PMPortal, PMIcon, PMLink } from '@packmind/ui';
import {
  LuBook,
  LuCircleHelp,
  LuMessageCircleQuestion,
  LuUsersRound,
} from 'react-icons/lu';
import { openCrisp } from '@packmind/proprietary/frontend/services/vendors/CrispService';

export const SidebarHelpMenu: React.FunctionComponent = () => {
  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMLink variant="navbar" as="span">
          <PMIcon mr={2}>
            <LuCircleHelp />
          </PMIcon>
          Help
        </PMLink>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="chat" asChild>
              <PMLink onClick={() => openCrisp()} cursor={'pointer'}>
                <PMIcon size="sm">
                  <LuMessageCircleQuestion />
                </PMIcon>
                Chat
              </PMLink>
            </PMMenu.Item>
            <PMMenu.Item value="documentation" asChild>
              <PMLink
                href="https://packmindhub.github.io/packmind/"
                target="_blank"
                rel="noopener noreferrer"
                cursor={'pointer'}
              >
                <PMIcon size="sm">
                  <LuBook />
                </PMIcon>
                Documentation
              </PMLink>
            </PMMenu.Item>
            <PMMenu.Item value="slack" asChild>
              <PMLink
                href="https://join.slack.com/t/promyze/shared_invite/zt-vf6asxsj-aH1RbzuoOR5DNFexeaATVQ"
                target="_blank"
                rel="noopener noreferrer"
                cursor={'pointer'}
              >
                <PMIcon size="sm">
                  <LuUsersRound />
                </PMIcon>
                Community Slack
              </PMLink>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
