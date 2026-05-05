import { UserId } from '@packmind/types';
import { PMAvatar, PMAvatarGroup, PMTooltip } from '@packmind/ui';
import { UserAvatarWithInitials } from './UserAvatarWithInitials';
import React from 'react';

export type UserAvatarStackProps = {
  users: { id: UserId | string; displayName: string }[];
  maxVisibleAvatars: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

type AvatarProps = {
  key: string;
  displayName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

export const UserAvatarStack: React.FC<UserAvatarStackProps> = ({
  users,
  maxVisibleAvatars,
  size,
}) => {
  const avatarProps: AvatarProps[] = [];
  const showExtra = users.length > maxVisibleAvatars;

  if (showExtra) {
    avatarProps.push(
      ...users
        .slice(0, maxVisibleAvatars - 1)
        .map((user) => ({ key: user.id, displayName: user.displayName, size })),
    );
  } else {
    avatarProps.push(
      ...users.map((user) => ({
        key: user.id,
        displayName: user.displayName,
        size,
      })),
    );
  }
  const extraLabel = users
    .slice(maxVisibleAvatars - 1)
    .map((u) => u.displayName)
    .join(', ');

  return (
    <PMAvatarGroup size="lg" stacking="first-on-top">
      {avatarProps.map((props) => (
        <UserAvatarWithInitials {...props} key={props.key} />
      ))}
      {showExtra && (
        <PMTooltip label={extraLabel} placement="top">
          <span style={{ display: 'inline-flex' }}>
            <PMAvatar.Root size={size} colorPalette="grey" key={'extra-users'}>
              <PMAvatar.Fallback>
                +{users.length + 1 - maxVisibleAvatars}
              </PMAvatar.Fallback>
            </PMAvatar.Root>
          </span>
        </PMTooltip>
      )}
    </PMAvatarGroup>
  );
};
