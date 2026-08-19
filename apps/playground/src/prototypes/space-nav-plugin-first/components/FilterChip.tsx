import type { ReactNode } from 'react';
import { PMBox, PMIcon } from '@packmind/ui';

/**
 * Shared by the two plugin views, so filtering components and filtering
 * distributions look and behave the same.
 */
export function FilterChip({
  label,
  count,
  icon,
  dotColor,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  count: number;
  icon?: ReactNode;
  dotColor?: string;
  isActive: boolean;
  onClick: () => void;
}>) {
  return (
    <PMBox
      as="button"
      display="inline-flex"
      alignItems="center"
      gap="6px"
      paddingX={2}
      paddingY="4px"
      borderRadius="sm"
      fontSize="xs"
      cursor="pointer"
      bg={isActive ? 'background.tertiary' : 'transparent'}
      color={isActive ? 'text.primary' : 'text.secondary'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={isActive ? undefined : { bg: 'background.secondary' }}
      transition="background-color 150ms ease-out"
      onClick={onClick}
      aria-pressed={isActive}
    >
      {icon && (
        <PMIcon fontSize="xs" color="text.faded">
          {icon}
        </PMIcon>
      )}
      {dotColor && (
        <PMBox
          width="6px"
          height="6px"
          borderRadius="full"
          bg={dotColor}
          flexShrink={0}
          aria-hidden
        />
      )}
      {label}
      <PMBox as="span" color="text.faded" fontVariantNumeric="tabular-nums">
        {count}
      </PMBox>
    </PMBox>
  );
}
