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
import { SpaceMemberRole } from '../types';

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
  isDefaultSpace?: boolean;
  isSpaceAdmin?: boolean;
  onRemoveMember?: (memberId: string) => void;
  onUpdateMemberRole?: (memberId: string, role: SpaceMemberRole) => void;
}

export function SpaceMembersTable({
  members,
  currentUserId,
  isDefaultSpace,
  isSpaceAdmin,
  onRemoveMember,
  onUpdateMemberRole,
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
              value={member.role}
              disabled={isCurrentUser || !isSpaceAdmin}
              onChange={(e) =>
                onUpdateMemberRole?.(
                  member.id,
                  e.currentTarget.value as SpaceMemberRole,
                )
              }
              items={[
                { value: 'admin', label: 'Admin' },
                { value: 'member', label: 'Member' },
              ]}
            />
          ),
          actions:
            isCurrentUser || isDefaultSpace || !isSpaceAdmin ? null : (
              <PMButton
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => onRemoveMember?.(member.id)}
              >
                <PMIcon>
                  <LuX />
                </PMIcon>
              </PMButton>
            ),
        };
      }),
    [
      members,
      currentUserId,
      isDefaultSpace,
      isSpaceAdmin,
      onRemoveMember,
      onUpdateMemberRole,
    ],
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
