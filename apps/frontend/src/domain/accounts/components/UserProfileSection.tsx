import React, { useEffect, useState } from 'react';
import {
  PMButton,
  PMField,
  PMInput,
  PMVStack,
  PMHStack,
  PMText,
} from '@packmind/ui';
import { pmToaster } from '@packmind/ui';
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

  return (
    <PMVStack align="flex-start" gap={4} width="100%" maxWidth="400px">
      <PMText fontWeight="semibold">Profile</PMText>
      <PMField.Root>
        <PMField.Label>Display name</PMField.Label>
        <PMInput
          placeholder={user?.email?.split('@')[0]}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <PMField.HelperText>
          This name is visible to other members of your organization.
        </PMField.HelperText>
      </PMField.Root>
      <PMHStack>
        <PMButton
          variant="primary"
          size="sm"
          disabled={!hasChanged || updateProfile.isPending}
          loading={updateProfile.isPending}
          onClick={handleSave}
        >
          Save
        </PMButton>
      </PMHStack>
    </PMVStack>
  );
};
