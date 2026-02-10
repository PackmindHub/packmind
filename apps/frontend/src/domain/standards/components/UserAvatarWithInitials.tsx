import React from 'react';
import { PMAvatar, PMTooltip } from '@packmind/ui';

interface UserAvatarWithInitialsProps {
  email: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Extracts initials from an email address.
 * Examples:
 * - "john.doe@example.com" → "JD"
 * - "jane@example.com" → "JE"
 * - "a@example.com" → "A"
 */
function getInitialsFromEmail(email: string): string {
  const parts = email.split('@')[0]?.split('.') ?? [];
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email[0]?.toUpperCase() ?? '?';
}

/**
 * Generates a consistent color based on the email string.
 * Uses a deterministic hash to ensure the same email always gets the same color.
 */
function getColorFromEmail(email: string): string {
  const colors = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'cyan',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Displays a user avatar with initials extracted from their email.
 * Includes a tooltip showing the full email address.
 *
 * @example
 * <UserAvatarWithInitials email="john.doe@example.com" size="md" />
 */
export const UserAvatarWithInitials: React.FC<UserAvatarWithInitialsProps> = ({
  email,
  size = 'xs',
}) => {
  const initials = getInitialsFromEmail(email);
  const color = getColorFromEmail(email);

  return (
    <PMTooltip label={email} placement="top">
      <span style={{ display: 'inline-flex', cursor: 'pointer' }}>
        <PMAvatar.Root colorPalette={color} size={size}>
          <PMAvatar.Image src="" alt={email} />
          <PMAvatar.Fallback>{initials}</PMAvatar.Fallback>
        </PMAvatar.Root>
      </span>
    </PMTooltip>
  );
};
