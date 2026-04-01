import { useMemo } from 'react';
import { LuX } from 'react-icons/lu';

import {
  PMBadge,
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
} from '@packmind/ui';

import { UserAvatarWithInitials } from '../../accounts/components/UserAvatarWithInitials';

type SpaceMemberRole = 'admin' | 'member';

export interface SpaceMember {
  id: string;
  displayName: string;
  role: SpaceMemberRole;
}

const columns: PMTableColumn[] = [
  { key: 'user', header: 'User', grow: true },
  { key: 'role', header: 'Role', width: '200px', grow: false },
  { key: 'actions', header: '', grow: false },
];

interface SpaceMembersTableProps {
  members: SpaceMember[];
  currentUserId?: string;
}

export function SpaceMembersTable({
  members,
  currentUserId,
}: Readonly<SpaceMembersTableProps>) {
  const data = useMemo<PMTableRow[]>(
    () =>
      members.map((member) => {
        const isCurrentUser = member.id === currentUserId;

        return {
          id: member.id,
          user: (
            <PMHStack gap="3">
              <UserAvatarWithInitials
                displayName={member.displayName}
                size="sm"
              />
              <PMText>{member.displayName}</PMText>
              {isCurrentUser && (
                <PMBadge colorPalette="blue" size="sm">
                  You
                </PMBadge>
              )}
            </PMHStack>
          ),
          role: (
            <PMNativeSelect
              size="sm"
              defaultValue={member.role}
              disabled={isCurrentUser}
              items={[
                { value: 'admin', label: 'Admin' },
                { value: 'member', label: 'Member' },
              ]}
            />
          ),
          actions: isCurrentUser ? null : (
            <PMButton size="xs" variant="ghost" colorPalette="red">
              <PMIcon>
                <LuX />
              </PMIcon>
            </PMButton>
          ),
        };
      }),
    [members, currentUserId],
  );

  return (
    <PMTable
      columns={columns}
      data={data}
      size="sm"
      variant="line"
      showColumnBorder={false}
      tableProps={{ border: 'solid 1px {colors.border.tertiary}' }}
    />
  );
}
