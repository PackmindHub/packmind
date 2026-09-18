import React from 'react';
import { PMBox, PMText } from '@packmind/ui';

/**
 * The one caption treatment for the sidebar's groups. Left padding matches the
 * rows below it so the caption reads as their heading and not as a stray
 * label, and the lead-in above is wider than the gap below, so a caption binds
 * to the list it introduces rather than to the one it follows.
 */
export function SidebarSectionCaption({
  children,
  action,
}: Readonly<{
  children: React.ReactNode;
  /** Optional control shown at the far end of the caption row. */
  action?: React.ReactNode;
}>): React.ReactElement {
  return (
    <PMBox
      pl={2}
      pr={4}
      pt={2}
      pb={1}
      display="flex"
      justifyContent="space-between"
      alignItems="center"
    >
      <PMText
        fontSize="10px"
        fontWeight="semibold"
        textTransform="uppercase"
        letterSpacing="wider"
        color="faded"
      >
        {children}
      </PMText>
      {action}
    </PMBox>
  );
}
