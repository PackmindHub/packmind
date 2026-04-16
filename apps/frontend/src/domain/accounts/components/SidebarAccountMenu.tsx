import {
  PMButton,
  PMMenu,
  PMText,
  PMAvatar,
  PMPortal,
  PMBox,
  PMIcon,
} from '@packmind/ui';
import { useSignOutMutation } from '../api/queries/AuthQueries';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import { LuLogOut } from 'react-icons/lu';
import { Analytics } from '@packmind/proprietary/frontend/domain/amplitude/providers/analytics';
import { SidebarAccountsMenuDataTestIds } from '@packmind/frontend';

export const SidebarAccountMenu: React.FunctionComponent = () => {
  const signOutMutation = useSignOutMutation();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const handleSignOut = () => {
    // Capture organization slug before logout clears context
    const redirectPath = '/sign-in';

    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        try {
          Analytics.reset();
        } catch {
          // ignore analytics reset error
        }
        navigate(redirectPath);
      },
      onError: (error) => {
        console.error('Sign out failed:', error);
        navigate(redirectPath);
      },
    });
  };

  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton
          variant="secondary"
          width={'full'}
          justifyContent={'flex-start'}
          paddingY={'6'}
          paddingX={'2'}
          data-testid={SidebarAccountsMenuDataTestIds.OpenSubMenuCTA}
        >
          <PMAvatar.Root
            size="xs"
            backgroundColor={'background.secondary'}
            color={'text.primary'}
          >
            <PMAvatar.Fallback name={user?.displayName ?? user?.email} />
          </PMAvatar.Root>
          <PMBox
            maxWidth={'full'}
            textOverflow={'ellipsis'}
            overflow={'hidden'}
          >
            {user?.displayName ?? user?.email}
          </PMBox>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item
              value="sign-out"
              onClick={handleSignOut}
              cursor={'pointer'}
              data-testid={SidebarAccountsMenuDataTestIds.SignoutCTA}
            >
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuLogOut></LuLogOut>
                </PMIcon>
                Sign out
              </PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
