import React from 'react';
import { PMHStack, PMText } from '@packmind/ui';
import { UserAvatarWithInitials } from '../../../accounts/components/UserAvatarWithInitials';
import { SpaceAdminAvatar } from './types';

interface SpaceAdminsCellProps {
  admins: SpaceAdminAvatar[];
}

const MAX_VISIBLE_AVATARS = 3;

export const SpaceAdminsCell: React.FC<SpaceAdminsCellProps> = ({ admins }) => {
  if (admins.length === 0) {
    return <PMText color="faded">—</PMText>;
  }

  const visible = admins.slice(0, MAX_VISIBLE_AVATARS);
  const isSingle = admins.length === 1;
  const label = isSingle ? admins[0].displayName : `${admins.length} admins`;

  return (
    <PMHStack gap={2} align="center">
      <PMHStack gap={-2}>
        {visible.map((admin) => (
          <UserAvatarWithInitials
            key={admin.id}
            displayName={admin.displayName}
            size="xs"
          />
        ))}
      </PMHStack>
      <PMText color="secondary">{label}</PMText>
    </PMHStack>
  );
};
