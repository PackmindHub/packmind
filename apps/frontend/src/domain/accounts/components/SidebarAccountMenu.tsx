import { PMButton, PMMenu, PMText, PMAvatar, PMPortal } from '@packmind/ui';
import { useSignOutMutation } from '../api/queries/AuthQueries';
import { useNavigate } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';

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

  return (
    <PMMenu.Root positioning={{ placement: 'right-start' }}>
      <PMMenu.Trigger asChild>
        <PMButton variant="ghost" size="sm">
          <PMAvatar.Root
            size="sm"
            backgroundColor={'background.secondary'}
            color={'text.primary'}
          >
            <PMAvatar.Fallback name={user?.username} />
          </PMAvatar.Root>
        </PMButton>
      </PMMenu.Trigger>
      <PMPortal>
        <PMMenu.Positioner>
          <PMMenu.Content>
            <PMMenu.Item value="sign-out" onClick={handleSignOut}>
              <PMText>Sign out</PMText>
            </PMMenu.Item>
          </PMMenu.Content>
        </PMMenu.Positioner>
      </PMPortal>
    </PMMenu.Root>
  );
};
