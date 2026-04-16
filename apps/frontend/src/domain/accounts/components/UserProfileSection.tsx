import React, { useEffect, useState } from 'react';
import {
  PMButton,
  PMField,
  PMInput,
  PMVStack,
  PMHStack,
  PMText,
  pmToaster,
} from '@packmind/ui';
import { useAuthContext } from '../hooks/useAuthContext';
import { useUpdateProfileMutation } from '../api/queries/AccountsQueries';

export const UserProfileSection: React.FC = () => {
  const { user } = useAuthContext();
  const updateProfile = useUpdateProfileMutation();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');

  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
  }, [user?.displayName]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    await updateProfile.mutateAsync(
      { displayName: trimmed || null },
      {
        onSuccess: () => {
          pmToaster.create({
            title: 'Profile updated',
            type: 'success',
          });
        },
        onError: () => {
          pmToaster.create({
            title: 'Failed to update profile',
            type: 'error',
          });
        },
      },
    );
  };

  const hasChanged =
    (displayName.trim() || null) !== (user?.displayName ?? null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasChanged && !updateProfile.isPending) {
      handleSave();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PMVStack align="flex-start" gap={5} maxWidth="400px">
        <PMField.Root>
          <PMField.Label>Email</PMField.Label>
          <PMText color="secondary" fontSize="sm">
            {user?.email}
          </PMText>
        </PMField.Root>
        <PMField.Root>
          <PMField.Label>Display name</PMField.Label>
          <PMInput
            placeholder={user?.email?.split('@')[0]}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <PMField.HelperText>
            How your name appears to other members of your organization.
          </PMField.HelperText>
        </PMField.Root>
        <PMHStack>
          <PMButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={!hasChanged || updateProfile.isPending}
            loading={updateProfile.isPending}
          >
            Save
          </PMButton>
        </PMHStack>
      </PMVStack>
    </form>
  );
};
