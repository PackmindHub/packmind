import React from 'react';
import { PMText } from '@packmind/ui';
import { SpaceAdminAvatar } from './types';
import { UserAvatarStack } from '@packmind/proprietary/frontend/domain/accounts/components/UserAvatarStack';

interface SpaceAdminsCellProps {
  admins: SpaceAdminAvatar[];
}

const MAX_VISIBLE_AVATARS = 3;

export const SpaceAdminsCell: React.FC<SpaceAdminsCellProps> = ({ admins }) => {
  if (admins.length === 0) {
    return <PMText color="faded">—</PMText>;
  }

  return (
    <UserAvatarStack
      users={admins}
      maxVisibleAvatars={MAX_VISIBLE_AVATARS}
      size={'xs'}
    />
  );
};
