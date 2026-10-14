import type { ReactNode } from 'react';
import { PMBox, PMIcon } from '@packmind/ui';

/**
 * The quiet toggle the production surface uses for a filter over a list. Not a
 * button and not a tab: it changes what is on screen rather than making
 * something happen, and it must not be louder than the rows it filters.
 */
export function Chip({
  label,
  count,
  icon,
  isActive,
  onClick,
}: Readonly<{
  label: string;
  count?: number;
  icon?: ReactNode;
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
      aria-label={count === undefined ? undefined : `${label}, ${count}`}
    >
      {icon && (
        <PMIcon fontSize="xs" color="text.faded">
          {icon}
        </PMIcon>
      )}
      {label}
      {count !== undefined && (
        <PMBox as="span" color="text.faded" fontVariantNumeric="tabular-nums">
          {count}
        </PMBox>
      )}
    </PMBox>
  );
}
