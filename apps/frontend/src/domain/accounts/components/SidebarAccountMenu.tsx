import {
  PMButton,
  PMMenu,
  PMText,
  PMAvatar,
  PMPortal,
  PMBox,
  PMHStack,
  PMIcon,
} from '@packmind/ui';
import { useSignOutMutation } from '../api/queries/AuthQueries';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import { LuLogOut, LuSettings } from 'react-icons/lu';

export const SidebarAccountMenu: React.FunctionComponent = () => {
  const signOutMutation = useSignOutMutation();
  const navigate = useNavigate();
  const { user, organization } = useAuthContext();

  const handleSignOut = () => {
    // Capture organization slug before logout clears context
    const orgSlug = organization?.slug;
    const redirectPath = orgSlug ? `/org/${orgSlug}/sign-in` : '/get-started';

    signOutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate(redirectPath);
      },
      onError: (error) => {
        console.error('Sign out failed:', error);
        navigate(redirectPath);
      },
    });
  };

  const handleSettings = () => {
    const orgSlug = organization?.slug;
    const redirectPath = orgSlug
      ? `/org/${orgSlug}/account-settings`
      : '/get-started';

    navigate(redirectPath);
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
        >
          <PMAvatar.Root
            size="xs"
            backgroundColor={'background.secondary'}
            color={'text.primary'}
          >
            <PMAvatar.Fallback name={user?.username} />
          </PMAvatar.Root>
          <PMBox
            maxWidth={'full'}
            textOverflow={'ellipsis'}
            overflow={'hidden'}
          >
            {user?.username}
          </PMBox>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item
              value="settings"
              onClick={handleSettings}
              cursor={'pointer'}
            >
              <PMText color="secondary">
                <PMIcon marginRight={2}>
                  <LuSettings></LuSettings>
                </PMIcon>
                Account settings
              </PMText>
            </PMMenu.Item>

            <PMMenu.Separator borderColor={'border.tertiary'} />

            <PMMenu.Item
              value="sign-out"
              onClick={handleSignOut}
              cursor={'pointer'}
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
