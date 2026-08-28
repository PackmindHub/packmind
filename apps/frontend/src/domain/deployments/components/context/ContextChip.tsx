import type { ReactNode } from 'react';
import { PMBox, PMIcon } from '@packmind/ui';

/**
 * The quiet toggle this surface uses wherever a pane offers several readings of
 * one list: which kinds of component to show, and which side of a package's
 * distribution to look at.
 *
 * Deliberately not a button and not a tab. A button reads as "something will
 * happen", which is wrong for a control that only changes what is on screen,
 * and a second tab strip under the pane's own would make the reader count
 * levels to know where they are. This sits between the two: low contrast until
 * it is the active one, and no louder than the text it filters.
 *
 * `count` is optional because not every reading can be counted before it is
 * opened. Absent prints no number rather than a zero, which would be a claim.
 */
export function ContextChip({
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
