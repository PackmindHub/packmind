import React from 'react';
import { PMAvatar, PMTooltip } from '@packmind/ui';

interface UserAvatarWithInitialsProps {
  displayName: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * Extracts initials from a display name.
 * Examples:
 * - "Joan Racenet" → "JR"
 * - "john.doe" → "JD"
 * - "jane" → "J"
 * - "a" → "A"
 */
function getInitialsFromDisplayName(displayName: string): string {
  const spaceParts = displayName.split(' ').filter(Boolean);
  if (spaceParts.length >= 2) {
    return (spaceParts[0][0] + spaceParts[1][0]).toUpperCase();
  }
  const dotParts = displayName.split('.');
  if (dotParts.length >= 2) {
    return (dotParts[0][0] + dotParts[1][0]).toUpperCase();
  }
  return displayName[0]?.toUpperCase() ?? '?';
}

/**
 * Generates a consistent color based on the display name string.
 * Uses a deterministic hash to ensure the same name always gets the same color.
 */
function getColorFromDisplayName(displayName: string): string {
  const colors = ['orange', 'yellow', 'green', 'blue', 'purple'];
  let hash = 0;
  for (let i = 0; i < displayName.length; i++) {
    hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Displays a user avatar with initials extracted from their display name.
 * Includes a tooltip showing the display name.
 *
 * @example
 * <UserAvatarWithInitials displayName="john.doe" size="md" />
 */
export const UserAvatarWithInitials: React.FC<UserAvatarWithInitialsProps> = ({
  displayName,
  size = 'xs',
}) => {
  const initials = getInitialsFromDisplayName(displayName);
  const color = getColorFromDisplayName(displayName);

  return (
    <PMTooltip label={displayName} placement="top">
      <span style={{ display: 'inline-flex' }}>
        <PMAvatar.Root size={size} colorPalette={color}>
          <PMAvatar.Fallback>{initials}</PMAvatar.Fallback>
          <PMAvatar.Image src="" alt={displayName} />
        </PMAvatar.Root>
      </span>
    </PMTooltip>
  );
};
