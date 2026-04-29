import { useMemo } from 'react';
import { LuX } from 'react-icons/lu';

import {
  PMBadge,
  PMBox,
  PMButton,
  PMHStack,
  PMIcon,
  PMNativeSelect,
  PMTable,
  PMTableColumn,
  PMTableRow,
  PMText,
  PMTooltip,
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
  isUpdatingRole?: boolean;
  isRemovingMember?: boolean;
  onRemoveMember?: (memberId: string) => void;
  onUpdateMemberRole?: (memberId: string, role: SpaceMemberRole) => void;
}

const LAST_ADMIN_REASON = 'This is the last admin of the space.';
const SELF_REASON = "You can't change your own role.";

export function SpaceMembersTable({
  members,
  currentUserId,
  isDefaultSpace,
  isSpaceAdmin,
  isUpdatingRole = false,
  isRemovingMember = false,
  onRemoveMember,
  onUpdateMemberRole,
}: Readonly<SpaceMembersTableProps>) {
  const adminCount = useMemo(
    () => members.filter((m) => m.role === 'admin').length,
    [members],
  );

  const data = useMemo<PMTableRow[]>(
    () =>
      members.map((member) => {
        const isCurrentUser = member.id === currentUserId;
        const isLastAdmin = member.role === 'admin' && adminCount === 1;

        const roleDisabledReason = isCurrentUser
          ? SELF_REASON
          : isLastAdmin
            ? LAST_ADMIN_REASON
            : undefined;
        const roleDisabled =
          !isSpaceAdmin ||
          isCurrentUser ||
          isLastAdmin ||
          isUpdatingRole ||
          isRemovingMember;

        const roleSelect = (
          <PMNativeSelect
            size="sm"
            value={member.role}
            disabled={roleDisabled}
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
        );

        const removeHidden = isCurrentUser || isDefaultSpace || !isSpaceAdmin;
        const removeDisabledReason = isLastAdmin
          ? LAST_ADMIN_REASON
          : undefined;
        const removeDisabled =
          isLastAdmin || isUpdatingRole || isRemovingMember;

        return {
          id: member.id,
          user: (
            <PMHStack gap="3">
              <UserAvatarWithInitials
                displayName={member.displayName}
                size="sm"
              />
              <PMText data-testid="member-display-name">
                {member.displayName}
              </PMText>
              {isCurrentUser && (
                <PMBadge colorPalette="blue" size="sm">
                  You
                </PMBadge>
              )}
            </PMHStack>
          ),
          role: roleDisabledReason ? (
            <PMTooltip label={roleDisabledReason}>
              <PMBox display="inline-block" width="full">
                {roleSelect}
              </PMBox>
            </PMTooltip>
          ) : (
            roleSelect
          ),
          actions: removeHidden ? null : removeDisabledReason ? (
            <PMTooltip label={removeDisabledReason}>
              <PMBox display="inline-block">
                <PMButton
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  disabled
                  aria-label="Remove member"
                >
                  <PMIcon>
                    <LuX />
                  </PMIcon>
                </PMButton>
              </PMBox>
            </PMTooltip>
          ) : (
            <PMButton
              size="xs"
              variant="ghost"
              colorPalette="red"
              disabled={removeDisabled}
              aria-label="Remove member"
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
      adminCount,
      currentUserId,
      isDefaultSpace,
      isSpaceAdmin,
      isUpdatingRole,
      isRemovingMember,
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
